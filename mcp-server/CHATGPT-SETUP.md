# Snipt MCP Server for ChatGPT Apps

This HTTP-based MCP server enables ChatGPT to naturally search, save, and reference code snippets through conversation.

## Features

- **Conversational Snippet Search**: "Do I have a snippet for JWT auth?" → searches your vault
- **Save Code Naturally**: "Save this for later" → creates snippet with context
- **Reference Past Solutions**: "Use that Salesforce snippet we saved" → retrieves and applies
- **Update & Organize**: Mark snippets as successful, add tags, categorize
- **Simple Visual Display**: Clean list view when ChatGPT shows search results

## Prerequisites

- Node.js 18.0.0 or higher
- A Snipt account with an API key
- Access to ChatGPT Apps (for production deployment)

## Installation

### 1. Install Dependencies

```bash
cd mcp-server
npm install
```

### 2. Build the Server

```bash
npm run build
```

### 3. Set Environment Variables

The server supports **two authentication modes**:

#### Option A: OAuth Authentication (Required for ChatGPT Apps)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SNIPT_API_URL=https://snipt.app  # Optional
PORT=3001  # Optional
MCP_SERVER_URL=https://your-domain.com  # Your public URL
```

This enables **per-user authentication** - each ChatGPT user logs into their own Snipt account.

#### Option B: API Key Authentication (For testing/Claude Code)

```bash
SNIPT_API_KEY=your_api_key_here
SNIPT_API_URL=https://snipt.app  # Optional
PORT=3001  # Optional
```

**Note**: ChatGPT Apps **requires OAuth** (Option A). API keys won't work with ChatGPT.

## Getting Supabase Credentials

Since Snipt.app already uses Supabase, you can use the same project:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy these values:
   - **URL**: Your project URL (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key**: The anon key (starts with `eyJ...`)

These enable OAuth authentication so ChatGPT users can log into their individual Snipt accounts.

## Running the Server

### Local Development

Start the HTTP server:

```bash
# With OAuth (ChatGPT Apps)
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your_anon_key \
MCP_SERVER_URL=http://localhost:3001 \
npm run start:http

# With API key (testing only)
SNIPT_API_KEY=your_key npm run start:http
```

The server will start at `http://localhost:3001` with:
- MCP endpoint: `http://localhost:3001/mcp`
- OAuth metadata: `http://localhost:3001/.well-known/oauth-protected-resource`
- Health check: `http://localhost:3001/health`

### Testing with MCP Inspector

Test the server locally using the MCP Inspector:

**With API Key (Simpler for testing)**:
```bash
SNIPT_API_KEY=your_key npm run start:http

# In another terminal
npx @modelcontextprotocol/inspector http://localhost:3001/mcp
```

**With OAuth (Production-like testing)**:
```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your_anon_key \
MCP_SERVER_URL=http://localhost:3001 \
npm run start:http

# In another terminal - test OAuth metadata
curl http://localhost:3001/.well-known/oauth-protected-resource

# Test authenticated request (requires valid Supabase token)
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```

The MCP Inspector will open a web interface where you can:
- View all available tools and resources
- Test tool invocations
- Inspect the UI widget
- Debug responses

## Deployment

### Option 1: Vercel (Recommended)

**For ChatGPT Apps (OAuth)**:

1. Create a new Vercel project
2. Add environment variables:
   - `SUPABASE_URL`: https://your-project.supabase.co
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SNIPT_API_URL`: https://snipt.app
   - `MCP_SERVER_URL`: https://your-vercel-app.vercel.app

3. Deploy:
```bash
vercel
```

**For Testing Only (API Key)**:

1. Add environment variables:
   - `SNIPT_API_KEY`: Your Snipt API key
   - `SNIPT_API_URL`: https://snipt.app

2. Deploy:
```bash
vercel
```

### Option 2: Docker

**For ChatGPT Apps (OAuth)**:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY mcp-server/package*.json ./
RUN npm ci --only=production
COPY mcp-server/dist ./dist
ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/http-server.js"]
```

Build and run:
```bash
docker build -t snipt-mcp-http .
docker run -p 3001:3001 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_ANON_KEY=your_anon_key \
  -e MCP_SERVER_URL=https://your-domain.com \
  snipt-mcp-http
```

**For Testing (API Key)**:

```bash
docker run -p 3001:3001 -e SNIPT_API_KEY=your_key snipt-mcp-http
```

### Option 3: ngrok (Development/Testing)

For testing with ChatGPT before production deployment:

```bash
# Start the server with OAuth
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your_anon_key \
MCP_SERVER_URL=https://your-ngrok-url.ngrok.io \
npm run start:http

# In another terminal, expose with ngrok
ngrok http 3001
```

Copy the HTTPS URL from ngrok and update `MCP_SERVER_URL`, then restart the server.

## ChatGPT Apps Integration

Once deployed to a public HTTPS endpoint with OAuth configured:

### 1. Verify OAuth Setup

Test that your OAuth metadata endpoint is working:

```bash
curl https://your-domain.com/.well-known/oauth-protected-resource
```

Expected response:
```json
{
  "resource": "https://your-domain.com",
  "authorization_servers": ["https://your-project.supabase.co/auth/v1"],
  "scopes_supported": ["snippets:read", "snippets:write"],
  "resource_documentation": "https://your-domain.com/docs"
}
```

### 2. Register App in ChatGPT

1. Go to [ChatGPT Apps](https://chatgpt.com/settings/apps)
2. Click "Create New App"
3. Configure your app:
   - **Name**: Snipt Code Snippets
   - **Description**: Search and manage code snippets with context
   - **MCP Server URL**: `https://your-domain.com/mcp`
   - **Authentication**: OAuth 2.1 (automatic discovery via metadata endpoint)

4. Save and enable the app

### 3. First Use

When you first use the app in ChatGPT:

1. ChatGPT will prompt you to authenticate with Snipt
2. You'll be redirected to Supabase login
3. Sign in with your Snipt account credentials
4. Grant permissions for snippet access
5. You'll be redirected back to ChatGPT

After authentication, all snippets are scoped to your user account - each ChatGPT user accesses their own private snippet vault.

## Conversational Usage

Once configured, use Snipt naturally through conversation with ChatGPT:

### Saving Snippets

**You**: "Here's a bash script to deploy to AWS. Save this for later."

**ChatGPT**: Creates a snippet with the code, automatically categorizing it as "CLI" or "DevOps"

**You**: "Save this Python JWT auth function. It's for FastAPI and needs the python-jose library."

**ChatGPT**: Creates snippet with prerequisites and context automatically filled in

### Searching & Retrieving

**You**: "Do I have any snippets for Salesforce deployment?"

**ChatGPT**: Searches your vault and displays matching snippets in a clean list

**You**: "Show me that JWT authentication code we saved"

**ChatGPT**: Finds and displays the snippet with full details

**You**: "What snippets do I have for database migrations?"

**ChatGPT**: Searches by category or tags and shows results

### Using Snippets

**You**: "I need to set up Salesforce JWT auth. Use that snippet we saved."

**ChatGPT**: Retrieves the snippet and helps you apply it to your current task

**You**: "Adapt the deployment script for staging environment"

**ChatGPT**: Gets the snippet and modifies it based on your needs

### Organizing

**You**: "Mark that Salesforce snippet as successful, it worked perfectly"

**ChatGPT**: Updates the snippet's `is_successful` flag

**You**: "Add a tag 'production' to the deployment script"

**ChatGPT**: Updates the snippet's tags

## Available Tools

### search_snippets

Search for code snippets with optional filters.

**Parameters:**
- `query` (string, optional): Search text
- `tags` (array, optional): Filter by tags
- `language` (string, optional): Filter by language (e.g., "python", "javascript")
- `category` (string, optional): Filter by category (e.g., "CLI", "Database")
- `limit` (number, optional): Max results (default: 20)

**Returns:** Interactive widget showing matching snippets with search and copy functionality.

### get_snippet

Get complete details of a specific snippet by ID.

**Parameters:**
- `id` (string, required): Snippet ID

**Returns:** Full snippet details including code, context, and metadata.

### create_snippet

Create a new code snippet with rich context.

**Parameters:**
- `title` (string, required): Descriptive title
- `code` (string, required): The code or command
- `language` (string, required): Programming language
- `description` (string, optional): Detailed explanation
- `category` (string, optional): Category (CLI, Database, API, etc.)
- `tags` (array, optional): Tags for searching
- `when_to_use` (string, optional): When to use this snippet
- `common_mistakes` (array, optional): Common pitfalls to avoid
- `prerequisites` (array, optional): Required setup
- `is_successful` (boolean, optional): Mark as working solution

**Returns:** Confirmation with snippet ID.

### update_snippet

Update an existing snippet.

**Parameters:**
- `id` (string, required): Snippet ID
- All other parameters from `create_snippet` (optional)

**Returns:** Confirmation with updated snippet details.

## UI Display

When ChatGPT shows search results, a simple list appears with:

- **Clean List**: Each snippet shows:
  - Title and language badge
  - Category and usage count
  - Code preview with syntax highlighting
- **Click to Copy**: Click any snippet to copy its code to clipboard
- **Theme Aware**: Adapts to ChatGPT's light/dark theme
- **Minimal**: Focused on readability, not fancy features

## Architecture

### MCP Protocol

The server implements the Model Context Protocol (MCP) over HTTP using:
- **Transport**: `StreamableHTTPServerTransport` (stateless mode)
- **Responses**: JSON-RPC 2.0 format
- **UI Resources**: HTML+JavaScript widget with `text/html+skybridge` MIME type

### OpenAI-Specific Metadata

Tools include OpenAI metadata for better ChatGPT integration:
- `openai/outputTemplate`: Links tools to UI widgets
- `openai/toolInvocation/invoking`: Status message during execution
- `openai/toolInvocation/invoked`: Status message on completion
- `openai/widgetAccessible`: Enables widget-initiated tool calls
- `openai/widgetDescription`: Helps model understand UI capabilities

### Response Structure

Tool responses follow the three-part pattern:

```typescript
{
  content: [{  // Visible to the model
    type: "text",
    text: "Found 5 snippets..."
  }],
  structuredContent: {  // Hydrates the UI widget
    snippets: [...]
  },
  _meta: {  // Component-only metadata
    count: 5
  }
}
```

## Troubleshooting

### Server won't start

- Check that Node.js 18+ is installed: `node --version`
- Verify either `SNIPT_API_KEY` or `SUPABASE_URL` is set
- Check port 3001 isn't already in use: `lsof -i :3001`
- If using OAuth, ensure both `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set

### OAuth authentication issues

**401 Unauthorized errors**:
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correctly set
- Test OAuth metadata endpoint: `curl https://your-domain.com/.well-known/oauth-protected-resource`
- Ensure `MCP_SERVER_URL` matches your actual deployment URL
- Check that the Supabase project allows authentication from your domain

**Token verification fails**:
- Confirm the Supabase anon key is correct (starts with `eyJ...`)
- Verify the Supabase project URL is correct
- Check Supabase dashboard for authentication logs
- Test token manually: `curl -H "Authorization: Bearer TOKEN" -H "apikey: ANON_KEY" https://your-project.supabase.co/auth/v1/user`

**ChatGPT can't authenticate**:
- Ensure server is deployed at a public HTTPS URL (not localhost)
- Verify OAuth metadata endpoint returns valid JSON
- Check that `authorization_servers` array contains correct Supabase URL
- Test the OAuth flow manually using the metadata endpoint

### Tools not appearing in ChatGPT

- Verify server is accessible at public HTTPS URL
- Check MCP endpoint responds: `curl https://your-domain.com/health`
- Test with MCP Inspector first
- Check ChatGPT Apps configuration
- Ensure OAuth metadata endpoint is accessible
- Verify no CORS issues in browser console

### Widget not loading

- Verify resource is registered: Test `resources/list` endpoint
- Check browser console for errors
- Ensure widget HTML is valid and CSP-compliant
- Test that `window.openai` API is available in ChatGPT context

### API errors

**With OAuth**:
- Verify Supabase token is being passed correctly in Authorization header
- Check token hasn't expired (test with Supabase API)
- Ensure user has proper permissions in Snipt database

**With API Key**:
- Verify SNIPT_API_KEY is valid
- Check SNIPT_API_URL is correct
- Test API directly: `curl -H "X-API-Key: your_key" https://snipt.app/api/snippets`

### Configuration conflicts

**Both API key and OAuth configured**:
- Server will require OAuth when both are set
- For testing, use only `SNIPT_API_KEY`
- For production ChatGPT, use only OAuth variables

**Environment variable issues**:
- Verify variables in deployment platform (Vercel, Docker, etc.)
- Check health endpoint shows expected auth configuration
- Use `curl https://your-domain.com/health` to see active auth modes

## Development

### Project Structure

```
mcp-server/
├── src/
│   ├── index.ts          # Stdio MCP server (Claude Code)
│   ├── http-server.ts    # HTTP MCP server (ChatGPT Apps)
│   ├── api/
│   │   └── client.ts     # Snipt API client
│   └── types/
│       └── index.ts      # TypeScript types
├── dist/                 # Compiled JavaScript
├── package.json
└── tsconfig.json
```

### Scripts

- `npm run build`: Compile TypeScript to JavaScript
- `npm run dev`: Watch mode for development
- `npm run start:http`: Start HTTP server

### Testing

```bash
# Start server
SNIPT_API_KEY=test npm run start:http

# In another terminal, test endpoints
curl http://localhost:3001/health
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```

## Security Considerations

- Never commit API keys to version control
- Use environment variables for sensitive data
- Deploy behind HTTPS in production
- Implement rate limiting if needed
- Consider adding authentication middleware

## Support

- **Documentation**: https://developers.openai.com/apps-sdk/build/mcp-server
- **MCP Inspector**: https://modelcontextprotocol.io/docs/tools/inspector
- **Issues**: Report bugs at your repository

## License

MIT
