#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { SniptApiClient } from "./api/client.js"
import type {
  SnippetSearchParams,
  SnippetCreateParams,
  SnippetUpdateParams,
} from "./types/index.js"

// Get configuration from environment variables
const SNIPT_API_KEY = process.env.SNIPT_API_KEY
const SNIPT_API_URL = process.env.SNIPT_API_URL || "https://snipt.it"

if (!SNIPT_API_KEY) {
  console.error("Error: SNIPT_API_KEY environment variable is required")
  process.exit(1)
}

// Create API client
const client = new SniptApiClient(SNIPT_API_KEY, SNIPT_API_URL)

// Create MCP server
const server = new Server(
  {
    name: "snipt",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_snippets",
        description:
          "Search code snippets by query, tags, language, or category. Returns matching snippets with their code, metadata, and context (when to use, common mistakes, prerequisites).",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query to match against title, description, and code",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Filter by tags (e.g., ['git', 'deployment'])",
            },
            language: {
              type: "string",
              description: "Filter by programming language (e.g., 'python', 'javascript')",
            },
            category: {
              type: "string",
              description: "Filter by category (e.g., 'CLI', 'Database', 'API')",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 20)",
            },
          },
        },
      },
      {
        name: "get_snippet",
        description:
          "Get a specific snippet by ID. Returns the complete snippet with all details including code, metadata, and context.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The unique ID of the snippet",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "create_snippet",
        description:
          "Create a new code snippet. Use this to save commands, code blocks, or solutions you've just helped with so they can be reused later. Include rich context like when to use it, common mistakes, and prerequisites.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Short, descriptive title for the snippet",
            },
            code: {
              type: "string",
              description: "The actual code or command",
            },
            language: {
              type: "string",
              description: "Programming language or type (e.g., 'bash', 'python', 'javascript')",
            },
            description: {
              type: "string",
              description: "Detailed explanation of what this code does",
            },
            category: {
              type: "string",
              description: "Category like 'CLI', 'Database', 'API', 'DevOps', etc.",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags for easier searching (e.g., ['git', 'deploy', 'automation'])",
            },
            when_to_use: {
              type: "string",
              description: "Explain when this snippet should be used",
            },
            common_mistakes: {
              type: "array",
              items: { type: "string" },
              description: "Common mistakes or pitfalls to avoid when using this",
            },
            prerequisites: {
              type: "array",
              items: { type: "string" },
              description: "What needs to be set up or installed first",
            },
            is_successful: {
              type: "boolean",
              description: "Mark as successful if this solution worked",
            },
          },
          required: ["title", "code", "language"],
        },
      },
      {
        name: "update_snippet",
        description:
          "Update an existing snippet. Use this to mark snippets as successful/unsuccessful, add lessons learned, fix code, or improve context.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The unique ID of the snippet to update",
            },
            title: {
              type: "string",
              description: "Updated title",
            },
            code: {
              type: "string",
              description: "Updated code",
            },
            language: {
              type: "string",
              description: "Updated language",
            },
            description: {
              type: "string",
              description: "Updated description",
            },
            category: {
              type: "string",
              description: "Updated category",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Updated tags",
            },
            when_to_use: {
              type: "string",
              description: "Updated usage guidance",
            },
            common_mistakes: {
              type: "array",
              items: { type: "string" },
              description: "Updated common mistakes",
            },
            prerequisites: {
              type: "array",
              items: { type: "string" },
              description: "Updated prerequisites",
            },
            is_successful: {
              type: "boolean",
              description: "Mark whether the snippet was successful",
            },
          },
          required: ["id"],
        },
      },
    ],
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case "search_snippets": {
        const params = args as SnippetSearchParams
        const snippets = await client.searchSnippets(params)

        if (snippets.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No snippets found matching your search criteria.",
              },
            ],
          }
        }

        // Format snippets for display
        const formatted = snippets.map((s) => {
          let text = `# ${s.title}\n\n`
          text += `**ID**: ${s.id}\n`
          text += `**Language**: ${s.language}\n`
          if (s.category) text += `**Category**: ${s.category}\n`
          if (s.tags && s.tags.length > 0)
            text += `**Tags**: ${s.tags.join(", ")}\n`
          text += `**Used**: ${s.usage_count} times\n\n`

          if (s.description) text += `${s.description}\n\n`

          text += `\`\`\`${s.language}\n${s.code}\n\`\`\`\n\n`

          if (s.context?.when_to_use) {
            text += `**When to use**: ${s.context.when_to_use}\n\n`
          }

          if (s.context?.common_mistakes && s.context.common_mistakes.length > 0) {
            text += `**Common mistakes**:\n`
            s.context.common_mistakes.forEach((m) => {
              text += `- ${m}\n`
            })
            text += `\n`
          }

          if (s.context?.prerequisites && s.context.prerequisites.length > 0) {
            text += `**Prerequisites**:\n`
            s.context.prerequisites.forEach((p) => {
              text += `- ${p}\n`
            })
            text += `\n`
          }

          return text
        })

        return {
          content: [
            {
              type: "text",
              text: `Found ${snippets.length} snippet(s):\n\n${formatted.join("\n---\n\n")}`,
            },
          ],
        }
      }

      case "get_snippet": {
        const { id } = args as { id: string }
        const snippet = await client.getSnippet(id)

        let text = `# ${snippet.title}\n\n`
        text += `**ID**: ${snippet.id}\n`
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

      case "create_snippet": {
        const data = args as unknown as SnippetCreateParams
        const snippet = await client.createSnippet(data)

        return {
          content: [
            {
              type: "text",
              text: `Successfully created snippet "${snippet.title}" (ID: ${snippet.id})`,
            },
          ],
        }
      }

      case "update_snippet": {
        const { id, ...updates } = args as unknown as { id: string } & SnippetUpdateParams
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

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    }
  }
})

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("Snipt MCP Server running on stdio")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
