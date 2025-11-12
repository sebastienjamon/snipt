#!/usr/bin/env node

import { createServer } from "http"
import { AsyncLocalStorage } from "async_hooks"
import { readFile } from "fs/promises"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { z } from "zod"
import { SniptApiClient } from "./api/client.js"
import { extractAuth, getOAuthMetadata, getAuthChallenge, type AuthContext } from "./auth.js"
import type {
  SnippetSearchParams,
  SnippetCreateParams,
  SnippetUpdateParams,
} from "./types/index.js"

// Get current directory (for serving static assets)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Create AsyncLocalStorage for tracking auth context across async operations
const authStorage = new AsyncLocalStorage<AuthContext | null>()

// Get configuration from environment variables
const SNIPT_API_KEY = process.env.SNIPT_API_KEY
const SNIPT_API_URL = process.env.SNIPT_API_URL || "https://snipt.app"
const SUPABASE_URL = process.env.SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ""
const PORT = process.env.PORT || 3001
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || `http://localhost:${PORT}`

// Validate configuration
if (!SNIPT_API_KEY && !SUPABASE_URL) {
  console.error("Error: Either SNIPT_API_KEY or SUPABASE_URL must be set")
  console.error("  - SNIPT_API_KEY: for API key authentication (Claude Code)")
  console.error("  - SUPABASE_URL: for OAuth authentication (ChatGPT Apps)")
  process.exit(1)
}

// Create API client (will be used for API key auth)
let defaultClient: SniptApiClient | null = null
if (SNIPT_API_KEY) {
  defaultClient = new SniptApiClient(SNIPT_API_KEY, SNIPT_API_URL)
}

// In-memory storage for authorization codes (use Redis/DB in production)
const authorizationCodes = new Map<string, {
  access_token: string
  refresh_token: string
  code_challenge: string
  expires_at: number
}>()

// Store auth context for current request (thread-safe per request)
const requestAuthContext = new WeakMap<any, AuthContext | null>()

// Note: Widget UI is now built with React in the web/ directory
// The widget HTML is registered as an MCP resource for ChatGPT

// Create MCP server
const server = new McpServer({
  name: "snipt-http",
  version: "1.0.0",
})

// Current request reference (set during MCP request handling)
let currentRequest: any = null

// Helper to get the appropriate API client based on auth context
function getClient(extra: any): SniptApiClient {
  // Get auth context from AsyncLocalStorage (most reliable)
  let authContext = authStorage.getStore()

  // Fallback: Try to get from extra parameter
  if (!authContext) {
    authContext = extra?.request?.authContext
  }

  // Fallback: Try the WeakMap with current request
  if (!authContext && currentRequest) {
    authContext = requestAuthContext.get(currentRequest)
  }

  console.log("getClient: authContext =", authContext ? { type: authContext.type, hasToken: !!authContext.token } : "null")

  if (authContext?.type === "oauth" && authContext.token) {
    // Use OAuth token
    console.log("Using OAuth token for API client")
    return new SniptApiClient(authContext.token, SNIPT_API_URL)
  }

  // Fall back to API key client (for testing/Claude Code)
  if (defaultClient) {
    console.log("Using default API key client")
    return defaultClient
  }

  // No authentication available
  if (SUPABASE_URL && !authContext) {
    console.error("No auth context available for OAuth-enabled server")
    throw new Error("Authentication required. Please sign in to access your snippets.")
  }

  throw new Error("No authentication configured")
}

// Register ChatGPT-required tools
// ChatGPT requires specific 'search' and 'fetch' tools for connectors
server.registerTool(
  "search",
  {
    title: "Search",
    description: "Search code snippets by query. Returns a list of matching snippets with their metadata.",
    inputSchema: {
      query: z.string().describe("Search query to match against title, description, and code"),
    },
    annotations: SUPABASE_URL ? {
      security: [{ type: "oauth2", scopes: ["snippets:read"] }]
    } : undefined,
    _meta: {
      "openai/toolInvocation/invoking": "Searching snippets...",
      "openai/toolInvocation/invoked": "Found snippets",
      ...(SUPABASE_URL ? { "openai/security": [{ type: "oauth2", scopes: ["snippets:read"] }] } : {})
    }
  } as any,
  async (args, extra) => {
    const { query } = args
    const client = getClient(extra)
    const snippets = await client.searchSnippets({ query, limit: 10 })

    // Format results according to ChatGPT's expected format
    const results = snippets.map(s => ({
      id: s.id,
      title: s.title,
      url: `${SNIPT_API_URL}/snippets/${s.id}`
    }))

    // Return as JSON string in text content (ChatGPT requirement)
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ results })
        }
      ]
    }
  }
)

server.registerTool(
  "fetch",
  {
    title: "Fetch Document",
    description: "Retrieve complete snippet content by ID. Use this after finding relevant snippets with the search tool.",
    inputSchema: {
      id: z.string().describe("The unique ID of the snippet to fetch"),
    },
    annotations: SUPABASE_URL ? {
      security: [{ type: "oauth2", scopes: ["snippets:read"] }]
    } : undefined,
    _meta: {
      "openai/toolInvocation/invoking": "Fetching snippet...",
      "openai/toolInvocation/invoked": "Retrieved snippet",
      ...(SUPABASE_URL ? { "openai/security": [{ type: "oauth2", scopes: ["snippets:read"] }] } : {})
    }
  } as any,
  async (args, extra) => {
    const { id } = args
    const client = getClient(extra)
    const snippet = await client.getSnippet(id)

    // Build full text content
    let text = `# ${snippet.title}\n\n`
    if (snippet.description) text += `${snippet.description}\n\n`
    text += `**Language**: ${snippet.language}\n`
    if (snippet.category) text += `**Category**: ${snippet.category}\n`
    if (snippet.tags && snippet.tags.length > 0) text += `**Tags**: ${snippet.tags.join(", ")}\n`
    text += `\n\`\`\`${snippet.language}\n${snippet.code}\n\`\`\`\n`

    if (snippet.context?.when_to_use) {
      text += `\n**When to use**: ${snippet.context.when_to_use}\n`
    }
    if (snippet.context?.prerequisites && snippet.context.prerequisites.length > 0) {
      text += `\n**Prerequisites**:\n${snippet.context.prerequisites.map(p => `- ${p}`).join('\n')}\n`
    }
    if (snippet.context?.common_mistakes && snippet.context.common_mistakes.length > 0) {
      text += `\n**Common mistakes**:\n${snippet.context.common_mistakes.map(m => `- ${m}`).join('\n')}\n`
    }

    // Format result according to ChatGPT's expected format
    const result = {
      id: snippet.id,
      title: snippet.title,
      text: text,
      url: `${SNIPT_API_URL}/snippets/${snippet.id}`,
      metadata: {
        language: snippet.language,
        category: snippet.category,
        tags: snippet.tags,
        usage_count: snippet.usage_count
      }
    }

    // Return as JSON string in text content (ChatGPT requirement)
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result)
        }
      ]
    }
  }
)

// Register additional tools for Claude Code compatibility
server.registerTool(
  "search_snippets",
  {
    title: "Search Code Snippets",
    description: "Search code snippets by query, tags, language, or category. Returns matching snippets with their code, metadata, and context.",
    inputSchema: {
      query: z.string().optional().describe("Search query to match against title, description, and code"),
      tags: z.array(z.string()).optional().describe("Filter by tags (e.g., ['git', 'deployment'])"),
      language: z.string().optional().describe("Filter by programming language (e.g., 'python', 'javascript')"),
      category: z.string().optional().describe("Filter by category (e.g., 'CLI', 'Database', 'API')"),
      limit: z.number().optional().describe("Maximum number of results to return (default: 20)"),
    },
    annotations: SUPABASE_URL ? {
      security: [{ type: "oauth2", scopes: ["snippets:read"] }]
    } : undefined,
    _meta: {
      "openai/outputTemplate": "ui://widget/snippet-list.html",
      "openai/toolInvocation/invoking": "Searching snippets...",
      "openai/toolInvocation/invoked": "Found snippets",
      "openai/widgetAccessible": true,
      ...(SUPABASE_URL ? { "openai/security": [{ type: "oauth2", scopes: ["snippets:read"] }] } : {})
    }
  } as any,
  async (args, extra) => {
    const params = args as SnippetSearchParams
    const client = getClient(extra)
    const snippets = await client.searchSnippets(params)

    // Format for model (content)
    let modelText = ""
    if (snippets.length === 0) {
      modelText = "No snippets found matching your search criteria."
    } else {
      const formatted = snippets.map((s) => {
        let text = `**${s.title}** (${s.language})\n`
        if (s.description) text += `${s.description}\n`
        text += `\`\`\`${s.language}\n${s.code}\n\`\`\``
        return text
      })
      modelText = `Found ${snippets.length} snippet(s):\n\n${formatted.join("\n\n")}`
    }

    return {
      content: [
        {
          type: "text",
          text: modelText,
        },
      ],
      // Data for the widget component
      structuredContent: {
        snippets: snippets.map(s => ({
          id: s.id,
          title: s.title,
          code: s.code,
          language: s.language,
          description: s.description,
          category: s.category,
          tags: s.tags,
          usage_count: s.usage_count
        }))
      },
      _meta: {
        count: snippets.length
      }
    }
  }
)

server.registerTool(
  "get_snippet",
  {
    title: "Get Snippet by ID",
    description: "Get a specific snippet by ID. Returns the complete snippet with all details including code, metadata, and context.",
    inputSchema: {
      id: z.string().describe("The unique ID of the snippet"),
    },
    annotations: SUPABASE_URL ? {
      security: [{ type: "oauth2", scopes: ["snippets:read"] }]
    } : undefined,
    _meta: {
      "openai/toolInvocation/invoking": "Retrieving snippet...",
      "openai/toolInvocation/invoked": "Retrieved snippet",
      ...(SUPABASE_URL ? { "openai/security": [{ type: "oauth2", scopes: ["snippets:read"] }] } : {})
    }
  } as any,
  async (args, extra) => {
    const { id } = args
    const client = getClient(extra)
    const snippet = await client.getSnippet(id)

    let text = `# ${snippet.title}\n\n`
    text += `**Language**: ${snippet.language}\n`
    if (snippet.category) text += `**Category**: ${snippet.category}\n`
    if (snippet.tags && snippet.tags.length > 0)
      text += `**Tags**: ${snippet.tags.join(", ")}\n`
    text += `**Used**: ${snippet.usage_count} times\n\n`

    if (snippet.description) text += `${snippet.description}\n\n`
    text += `\`\`\`${snippet.language}\n${snippet.code}\n\`\`\`\n\n`

    if (snippet.context?.when_to_use) {
      text += `**When to use**: ${snippet.context.when_to_use}\n\n`
    }

    if (snippet.context?.common_mistakes && snippet.context.common_mistakes.length > 0) {
      text += `**Common mistakes**:\n`
      snippet.context.common_mistakes.forEach((m) => {
        text += `- ${m}\n`
      })
      text += `\n`
    }

    if (snippet.context?.prerequisites && snippet.context.prerequisites.length > 0) {
      text += `**Prerequisites**:\n`
      snippet.context.prerequisites.forEach((p) => {
        text += `- ${p}\n`
      })
    }

    return {
      content: [{ type: "text", text }],
    }
  }
)

server.registerTool(
  "create_snippet",
  {
    title: "Create Code Snippet",
    description: "Create a new code snippet. Use this to save commands, code blocks, or solutions you've just helped with so they can be reused later. Include rich context like when to use it, common mistakes, and prerequisites.",
    inputSchema: {
      title: z.string().describe("Short, descriptive title for the snippet"),
      code: z.string().describe("The actual code or command"),
      language: z.string().describe("Programming language or type (e.g., 'bash', 'python', 'javascript')"),
      description: z.string().optional().describe("Detailed explanation of what this code does"),
      category: z.string().optional().describe("Category like 'CLI', 'Database', 'API', 'DevOps', etc."),
      tags: z.array(z.string()).optional().describe("Tags for easier searching (e.g., ['git', 'deploy', 'automation'])"),
      when_to_use: z.string().optional().describe("Explain when this snippet should be used"),
      common_mistakes: z.array(z.string()).optional().describe("Common mistakes or pitfalls to avoid when using this"),
      prerequisites: z.array(z.string()).optional().describe("What needs to be set up or installed first"),
      is_successful: z.boolean().optional().describe("Mark as successful if this solution worked"),
    },
    annotations: SUPABASE_URL ? {
      security: [{ type: "oauth2", scopes: ["snippets:write"] }]
    } : undefined,
    _meta: {
      "openai/toolInvocation/invoking": "Creating snippet...",
      "openai/toolInvocation/invoked": "Created snippet",
      ...(SUPABASE_URL ? { "openai/security": [{ type: "oauth2", scopes: ["snippets:write"] }] } : {})
    }
  } as any,
  async (args, extra) => {
    const data = args as unknown as SnippetCreateParams
    const client = getClient(extra)
    const snippet = await client.createSnippet(data)

    return {
      content: [
        {
          type: "text",
          text: `Successfully created snippet "${snippet.title}" (ID: ${snippet.id})`,
        },
      ],
      _meta: {
        title: snippet.title,
        id: snippet.id
      }
    }
  }
)

server.registerTool(
  "update_snippet",
  {
    title: "Update Snippet",
    description: "Update an existing snippet. Use this to mark snippets as successful/unsuccessful, add lessons learned, fix code, or improve context.",
    inputSchema: {
      id: z.string().describe("The unique ID of the snippet to update"),
      title: z.string().optional().describe("Updated title"),
      code: z.string().optional().describe("Updated code"),
      language: z.string().optional().describe("Updated language"),
      description: z.string().optional().describe("Updated description"),
      category: z.string().optional().describe("Updated category"),
      tags: z.array(z.string()).optional().describe("Updated tags"),
      when_to_use: z.string().optional().describe("Updated usage guidance"),
      common_mistakes: z.array(z.string()).optional().describe("Updated common mistakes"),
      prerequisites: z.array(z.string()).optional().describe("Updated prerequisites"),
      is_successful: z.boolean().optional().describe("Mark whether the snippet was successful"),
    },
    annotations: SUPABASE_URL ? {
      security: [{ type: "oauth2", scopes: ["snippets:write"] }]
    } : undefined,
    _meta: {
      "openai/toolInvocation/invoking": "Updating snippet...",
      "openai/toolInvocation/invoked": "Updated snippet",
      ...(SUPABASE_URL ? { "openai/security": [{ type: "oauth2", scopes: ["snippets:write"] }] } : {})
    }
  } as any,
  async (args, extra) => {
    const { id, ...updates } = args as unknown as { id: string } & SnippetUpdateParams
    const client = getClient(extra)
    const snippet = await client.updateSnippet(id, updates)

    return {
      content: [
        {
          type: "text",
          text: `Successfully updated snippet "${snippet.title}" (ID: ${snippet.id})`,
        },
      ],
    }
  }
)

// Create HTTP server
const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`)

  // Add CORS headers for all requests (ChatGPT needs this)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  }

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  // OAuth protected resource metadata endpoint
  if (url.pathname === "/.well-known/oauth-protected-resource") {
    const metadata = getOAuthMetadata(MCP_SERVER_URL, SUPABASE_URL)

    if (!metadata) {
      res.writeHead(404, { ...corsHeaders, "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "OAuth not configured" }))
      return
    }

    res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" })
    res.end(JSON.stringify(metadata))
    return
  }

  // OAuth authorization server metadata endpoint (for dynamic client registration)
  if (url.pathname === "/.well-known/oauth-authorization-server") {
    if (!SUPABASE_URL) {
      res.writeHead(404, { ...corsHeaders, "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "OAuth not configured" }))
      return
    }

    // Provide OAuth authorization server metadata
    const authServerMetadata = {
      issuer: `${MCP_SERVER_URL}`,
      authorization_endpoint: `${MCP_SERVER_URL}/authorize`,
      token_endpoint: `${MCP_SERVER_URL}/token`,
      registration_endpoint: `${MCP_SERVER_URL}/oauth/register`,
      scopes_supported: ["snippets:read", "snippets:write"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
      code_challenge_methods_supported: ["S256"]
    }

    res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" })
    res.end(JSON.stringify(authServerMetadata))
    return
  }

  // Dynamic client registration endpoint
  if (url.pathname === "/oauth/register" && req.method === "POST") {
    if (!SUPABASE_URL) {
      res.writeHead(404, { ...corsHeaders, "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "OAuth not configured" }))
      return
    }

    // For now, return a static client configuration
    // In production, you'd want to generate and store unique clients
    const clientResponse = {
      client_id: "chatgpt-connector",
      client_secret: SUPABASE_ANON_KEY,
      redirect_uris: ["https://chatgpt.com/oauth/callback"],
      grant_types: ["authorization_code", "refresh_token"],
      token_endpoint_auth_method: "client_secret_post"
    }

    res.writeHead(201, { ...corsHeaders, "Content-Type": "application/json" })
    res.end(JSON.stringify(clientResponse))
    return
  }

  // OAuth authorization endpoint
  if (url.pathname === "/authorize") {
    if (!SUPABASE_URL) {
      res.writeHead(404, { ...corsHeaders, "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "OAuth not configured" }))
      return
    }

    // Get OAuth parameters
    const params = new URLSearchParams(url.search)
    const redirectUri = params.get('redirect_uri')
    const state = params.get('state')
    const codeChallenge = params.get('code_challenge')
    const codeChallengeMethod = params.get('code_challenge_method')

    // Serve login page
    const loginPage = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Snipt</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      font-size: 24px;
      margin-bottom: 8px;
      color: #1a202c;
    }
    p {
      color: #718096;
      margin-bottom: 24px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      margin-bottom: 6px;
      color: #4a5568;
      font-size: 14px;
      font-weight: 500;
    }
    input {
      width: 100%;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #5568d3; }
    button:disabled {
      background: #cbd5e0;
      cursor: not-allowed;
    }
    .error {
      background: #fed7d7;
      color: #c53030;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 14px;
      display: none;
    }
    .error.show { display: block; }
    .spinner {
      display: none;
      width: 20px;
      height: 20px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Sign in to Snipt</h1>
    <p>ChatGPT wants to access your code snippets</p>

    <div id="error" class="error"></div>

    <form id="loginForm">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" required autocomplete="email">
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" required autocomplete="current-password">
      </div>
      <button type="submit" id="submitBtn">Sign In</button>
    </form>

    <div class="spinner" id="spinner"></div>
  </div>

  <script>
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('error');
    const submitBtn = document.getElementById('submitBtn');
    const spinner = document.getElementById('spinner');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      errorDiv.classList.remove('show');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      try {
        // Authenticate with Supabase
        const authResponse = await fetch('${SUPABASE_URL}/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': '${SUPABASE_ANON_KEY}'
          },
          body: JSON.stringify({ email, password })
        });

        const authData = await authResponse.json();

        if (!authResponse.ok) {
          throw new Error(authData.error_description || authData.msg || 'Authentication failed');
        }

        // Generate authorization code and redirect
        const codeResponse = await fetch('/token/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            access_token: authData.access_token,
            refresh_token: authData.refresh_token,
            redirect_uri: '${redirectUri}',
            state: '${state}',
            code_challenge: '${codeChallenge}'
          })
        });

        const codeData = await codeResponse.json();

        if (!codeResponse.ok) {
          throw new Error(codeData.error || 'Failed to generate authorization code');
        }

        // Redirect back to ChatGPT
        window.location.href = \`${redirectUri}?code=\${codeData.code}&state=${state}\`;
      } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  </script>
</body>
</html>`

    res.writeHead(200, { ...corsHeaders, "Content-Type": "text/html" })
    res.end(loginPage)
    return
  }

  // Token generation endpoint (called from login page)
  if (url.pathname === "/token/generate" && req.method === "POST") {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk))
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'))

    // Generate a random authorization code
    const crypto = await import('crypto')
    const code = crypto.randomBytes(32).toString('base64url')

    // Store the code temporarily (in production, use Redis or database)
    // For now, we'll encode it directly with the token info
    const codeData = {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      code_challenge: body.code_challenge,
      expires_at: Date.now() + 600000 // 10 minutes
    }

    // Store in memory (you'd use Redis/DB in production)
    authorizationCodes.set(code, codeData)

    res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" })
    res.end(JSON.stringify({ code }))
    return
  }

  // Token exchange endpoint
  if (url.pathname === "/token" && req.method === "POST") {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk))
    }
    const body = Buffer.concat(chunks).toString('utf-8')
    const params = new URLSearchParams(body)

    const grantType = params.get('grant_type')
    const code = params.get('code')
    const codeVerifier = params.get('code_verifier')

    if (grantType === 'authorization_code') {
      // Validate and exchange authorization code
      const codeData = authorizationCodes.get(code || '')

      if (!codeData) {
        res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "invalid_grant", error_description: "Invalid authorization code" }))
        return
      }

      // Check if code is expired
      if (Date.now() > codeData.expires_at) {
        authorizationCodes.delete(code || '')
        res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "invalid_grant", error_description: "Authorization code expired" }))
        return
      }

      // Verify PKCE challenge (simplified verification)
      // In production, properly verify the code_challenge against code_verifier

      // Delete the code (one-time use)
      authorizationCodes.delete(code || '')

      // Return the tokens
      const tokenResponse = {
        access_token: codeData.access_token,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: codeData.refresh_token,
        scope: "snippets:read snippets:write"
      }

      res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" })
      res.end(JSON.stringify(tokenResponse))
      return
    }

    res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "unsupported_grant_type" }))
    return
  }

  // Handle /mcp endpoint
  if (url.pathname === "/mcp") {
    // Extract authentication
    const auth = await extractAuth(req, SUPABASE_URL, SUPABASE_ANON_KEY)

    // Read request body to determine MCP method
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk))
    }
    const body = Buffer.concat(chunks).toString('utf-8')

    // Parse JSON-RPC request to check method
    let mcpMethod: string | undefined
    try {
      const jsonRpcRequest = JSON.parse(body)
      mcpMethod = jsonRpcRequest.method
    } catch (e) {
      // Invalid JSON, let transport handle the error
    }

    // Protected methods that require OAuth
    const protectedMethods = ['tools/call', 'resources/read', 'resources/subscribe']

    // If OAuth is configured, no auth provided, and method is protected, return 401
    if (SUPABASE_URL && !auth && mcpMethod && protectedMethods.includes(mcpMethod)) {
      res.writeHead(401, {
        "Content-Type": "application/json",
        "WWW-Authenticate": getAuthChallenge(MCP_SERVER_URL)
      })
      res.end(JSON.stringify({
        error: "Authentication required",
        message: "This operation requires OAuth authentication"
      }))
      return
    }

    // Create a new readable stream from the buffered body
    const { Readable } = await import('stream')
    const bodyStream = Readable.from([body])

    // Fix Accept header for ChatGPT compatibility
    // ChatGPT only sends "application/json" but MCP SDK requires both
    const headers = { ...req.headers }
    if (headers.accept && !headers.accept.includes('text/event-stream')) {
      headers.accept = headers.accept + ', text/event-stream'
    } else if (!headers.accept) {
      headers.accept = 'application/json, text/event-stream'
    }

    // Create a new request-like object that preserves the original request properties
    // @ts-ignore - Mixing stream with IncomingMessage
    const requestWithBody = Object.assign(bodyStream, {
      headers: headers,
      method: req.method,
      url: req.url,
      httpVersion: req.httpVersion,
      httpVersionMajor: req.httpVersionMajor,
      httpVersionMinor: req.httpVersionMinor,
      socket: req.socket,
      connection: req.connection,
      authContext: auth // Store auth context on the request object
    })

    // Store auth context in multiple places
    requestAuthContext.set(requestWithBody, auth)
    currentRequest = requestWithBody

    console.log("Handling /mcp request with auth:", auth ? { type: auth.type, hasToken: !!auth.token } : "null")

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
      enableJsonResponse: true, // Enable JSON responses for ChatGPT,
    })

    // Pass auth context to transport via connection
    await server.connect(transport)

    // Use AsyncLocalStorage to make auth context available to tool handlers
    await authStorage.run(auth, async () => {
      try {
        // @ts-ignore - requestWithBody has all necessary properties
        await transport.handleRequest(requestWithBody, res)
      } finally {
        // Clear current request after handling
        currentRequest = null
      }
    })

    return
  }

  // Serve widget assets
  if (url.pathname.startsWith("/assets/") || url.pathname.match(/\.(html|js|css)$/)) {
    try {
      // Clean the path and resolve it relative to the dist directory
      const cleanPath = url.pathname.startsWith("/assets/")
        ? url.pathname.substring(8) // Remove /assets/ prefix
        : url.pathname.substring(1)  // Remove leading /

      const filePath = join(__dirname, "..", "web", "assets", cleanPath)
      const content = await readFile(filePath)

      // Determine content type
      let contentType = "text/plain"
      if (cleanPath.endsWith(".html")) contentType = "text/html"
      else if (cleanPath.endsWith(".js")) contentType = "application/javascript"
      else if (cleanPath.endsWith(".css")) contentType = "text/css"

      res.writeHead(200, { ...corsHeaders, "Content-Type": contentType })
      res.end(content)
      return
    } catch (error) {
      // File not found, continue to 404
    }
  }

  // Health check endpoint
  if (url.pathname === "/health") {
    res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" })
    res.end(JSON.stringify({
      status: "ok",
      server: "snipt-mcp-http",
      version: "1.0.0",
      auth: {
        apiKey: !!SNIPT_API_KEY,
        oauth: !!SUPABASE_URL
      }
    }))
    return
  }

  // Default 404
  res.writeHead(404, { ...corsHeaders, "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "Not found" }))
})

// Start server
async function main() {
  // Load widget HTML and register as MCP resource
  const widgetHtmlPath = join(__dirname, "..", "web", "assets", "snippet-list.html")
  try {
    const widgetHtml = await readFile(widgetHtmlPath, "utf-8")
    console.error(`✓ Loaded widget HTML from ${widgetHtmlPath}`)

    // Register widget as MCP resource (for ChatGPT)
    server.registerResource(
      "snippet-list-widget",
      "ui://widget/snippet-list.html",
      {},
      async () => ({
        contents: [
          {
            uri: "ui://widget/snippet-list.html",
            mimeType: "text/html+skybridge",
            text: widgetHtml,
            _meta: {}
          }
        ]
      })
    )
    console.error("✓ Registered snippet-list widget resource")
  } catch (error) {
    console.error(`Warning: Could not load widget HTML from ${widgetHtmlPath}:`, error)
    console.error("Widget will not be available in ChatGPT")
  }

  httpServer.listen(PORT, () => {
    console.error(`Snipt MCP HTTP Server running on http://localhost:${PORT}`)
    console.error(`MCP endpoint: http://localhost:${PORT}/mcp`)
    console.error(`Health check: http://localhost:${PORT}/health`)
    console.error(``)
    console.error(`To test with MCP Inspector:`)
    console.error(`  npx @modelcontextprotocol/inspector http://localhost:${PORT}/mcp`)
  })
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
