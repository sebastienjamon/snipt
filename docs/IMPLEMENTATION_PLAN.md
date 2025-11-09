# Snipt.it - Technical Implementation Plan

## Executive Summary

Snipt is a code snippet manager with bidirectional MCP integration, enabling Claude Code to both read existing snippets and create new ones from successful solutions. This creates a self-improving AI assistant that learns from your team's accumulated knowledge.

**Core Innovation:** The first snippet manager where AI can write back, creating institutional memory that compounds over time.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Local Machine                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Claude Code                                             │ │
│  │   ↓ (stdio/JSON-RPC)                                   │ │
│  │ MCP Client (built into Claude Code)                    │ │
│  │   ↓                                                     │ │
│  │ Snipt MCP Server (local npm package)                   │ │
│  │   - Configured with user's API key                     │ │
│  │   - Exposes tools: search, get, create, update         │ │
│  │   - Exposes resources: snippet://category/name         │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓ HTTPS                            │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    Internet │
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Snipt Cloud Platform (Vercel)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Next.js 14 Web Application                              │ │
│  │                                                          │ │
│  │ Frontend (App Router)                  API Routes       │ │
│  │ ├─ Dashboard                           ├─ /api/snippets │ │
│  │ ├─ Snippet Editor                      ├─ /api/search  │ │
│  │ ├─ Team Workspace                      ├─ /api/teams   │ │
│  │ ├─ Settings/API Keys                   └─ /api/auth    │ │
│  │ └─ Analytics                                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Supabase                                                │ │
│  │ ├─ Auth (JWT, OAuth)                                   │ │
│  │ ├─ Postgres Database                                   │ │
│  │ ├─ Row Level Security                                  │ │
│  │ └─ Realtime (for team collaboration)                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Search Infrastructure                                   │ │
│  │ ├─ Meilisearch (fast semantic search)                  │ │
│  │ └─ Embedding service (OpenAI Ada-002)                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router, React Server Components)
- **Styling:** TailwindCSS + shadcn/ui components
- **Code Editor:** Monaco Editor (VS Code's editor) or CodeMirror
- **Syntax Highlighting:** Shiki (modern, better than Prism.js)
- **State Management:** Zustand (lightweight) + React Query (server state)
- **Forms:** React Hook Form + Zod validation

### Backend
- **Runtime:** Node.js 20+
- **API Framework:** Next.js API Routes (serverless functions)
- **Database:** PostgreSQL 15+ (via Supabase)
- **Authentication:** Supabase Auth (supports email, OAuth, API keys)
- **Search:** Meilisearch Cloud or self-hosted
- **File Storage:** Supabase Storage (for exports, avatars)

### MCP Server
- **Language:** TypeScript
- **SDK:** @modelcontextprotocol/sdk
- **Transport:** stdio (standard for MCP servers)
- **Package Manager:** npm (distributed via npm registry)
- **HTTP Client:** node-fetch or native fetch

### Infrastructure
- **Hosting:** Vercel (frontend + API)
- **Database:** Supabase Cloud
- **Search:** Meilisearch Cloud
- **Monitoring:** Vercel Analytics + Sentry
- **CI/CD:** GitHub Actions

---

## Database Schema

### Core Tables

```sql
-- Users (managed by Supabase Auth, extended here)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  plan_tier TEXT DEFAULT 'free', -- free, pro, team
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys for MCP authentication
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "MacBook Pro", "Work Laptop"
  key_hash TEXT NOT NULL UNIQUE, -- bcrypt hash
  key_prefix TEXT NOT NULL, -- first 8 chars for UI display: "snip_abc..."
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Teams/Workspaces
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id),
  plan_tier TEXT DEFAULT 'team',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- owner, admin, member
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- Snippets (the core entity)
CREATE TABLE snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- NULL for personal snippets

  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  language TEXT NOT NULL, -- javascript, python, bash, etc.

  -- Organization
  tags TEXT[] DEFAULT '{}',
  category TEXT, -- deploy, auth, database, etc.

  -- Context (the secret sauce)
  context JSONB DEFAULT '{}', -- structured context data
  -- Example context structure:
  -- {
  --   "when_to_use": "CI/CD deployments",
  --   "common_mistakes": ["Don't use old command", "Remember suffix"],
  --   "prerequisites": ["JWT key must exist"],
  --   "troubleshooting": {"error_x": "solution_y"},
  --   "related_snippets": ["uuid1", "uuid2"],
  --   "learned_from_failures": true,
  --   "created_by_source": "claude-code" | "manual"
  -- }

  -- Analytics
  usage_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Version Control
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES snippets(id), -- for version history

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'manual', -- 'manual', 'claude-code', 'api'

  -- Search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(code, '')), 'C')
  ) STORED
);

-- Indexes
CREATE INDEX idx_snippets_user_id ON snippets(user_id);
CREATE INDEX idx_snippets_team_id ON snippets(team_id);
CREATE INDEX idx_snippets_tags ON snippets USING GIN(tags);
CREATE INDEX idx_snippets_search ON snippets USING GIN(search_vector);
CREATE INDEX idx_snippets_language ON snippets(language);
CREATE INDEX idx_snippets_created_at ON snippets(created_at DESC);

-- Snippet Usage Logs (for analytics)
CREATE TABLE snippet_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snippet_id UUID REFERENCES snippets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  source TEXT, -- 'web-ui', 'mcp-server', 'api'
  success BOOLEAN, -- did it work?
  error_message TEXT,
  metadata JSONB DEFAULT '{}', -- additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snippet_usage_snippet_id ON snippet_usage(snippet_id);
CREATE INDEX idx_snippet_usage_created_at ON snippet_usage(created_at DESC);

-- Snippet Embeddings (for semantic search)
CREATE TABLE snippet_embeddings (
  snippet_id UUID PRIMARY KEY REFERENCES snippets(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI ada-002 dimensions
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;

-- Users can read their own snippets
CREATE POLICY snippets_select_own ON snippets
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can read team snippets they're members of
CREATE POLICY snippets_select_team ON snippets
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own snippets
CREATE POLICY snippets_insert_own ON snippets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own snippets
CREATE POLICY snippets_update_own ON snippets
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own snippets
CREATE POLICY snippets_delete_own ON snippets
  FOR DELETE
  USING (user_id = auth.uid());
```

---

## API Design

### REST API Endpoints

```typescript
// Authentication
POST   /api/auth/signup                    // Create account
POST   /api/auth/login                     // Login
POST   /api/auth/logout                    // Logout
GET    /api/auth/me                        // Get current user

// API Keys (for MCP authentication)
GET    /api/keys                           // List user's API keys
POST   /api/keys                           // Create new API key
DELETE /api/keys/:id                       // Revoke API key

// Snippets
GET    /api/snippets                       // List snippets (with filters)
  ?user_id=uuid
  &team_id=uuid
  &tags=deploy,salesforce
  &language=bash
  &search=query
  &limit=20
  &offset=0

POST   /api/snippets                       // Create snippet
GET    /api/snippets/:id                   // Get single snippet
PATCH  /api/snippets/:id                   // Update snippet
DELETE /api/snippets/:id                   // Delete snippet

POST   /api/snippets/:id/usage             // Log usage (track analytics)
GET    /api/snippets/:id/history           // Get version history

// Search
POST   /api/search                         // Semantic search
  body: { query, tags?, language?, user_id, team_id? }

// Teams
GET    /api/teams                          // List user's teams
POST   /api/teams                          // Create team
GET    /api/teams/:id                      // Get team details
PATCH  /api/teams/:id                      // Update team
DELETE /api/teams/:id                      // Delete team

POST   /api/teams/:id/members              // Add team member
DELETE /api/teams/:id/members/:user_id     // Remove member

// Analytics
GET    /api/analytics/snippets             // Snippet usage stats
GET    /api/analytics/team/:id             // Team usage stats
```

### API Authentication

```typescript
// For web UI: Session-based (Supabase Auth cookies)
// For MCP server: API Key in Authorization header

// Example MCP request:
GET /api/snippets/search?query=salesforce
Headers:
  Authorization: Bearer snip_a1b2c3d4e5f6g7h8...
  Content-Type: application/json
```

---

## MCP Server Implementation

### Package Structure

```
snipt-mcp/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server setup
│   ├── tools/
│   │   ├── search.ts         # search_snippets tool
│   │   ├── get.ts            # get_snippet tool
│   │   ├── create.ts         # create_snippet tool
│   │   └── update.ts         # update_snippet tool
│   ├── resources/
│   │   └── snippets.ts       # Resource handlers
│   ├── api/
│   │   └── client.ts         # API client for Snipt backend
│   └── types.ts              # TypeScript types
└── dist/                     # Compiled JS
```

### Core MCP Server Code

```typescript
// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { searchSnippets, getSnippet, createSnippet, updateSnippet } from "./tools/index.js";
import { SniptAPI } from "./api/client.js";

const API_KEY = process.env.SNIPT_API_KEY;
const API_URL = process.env.SNIPT_API_URL || "https://snipt.it/api";

if (!API_KEY) {
  console.error("Error: SNIPT_API_KEY environment variable is required");
  process.exit(1);
}

const api = new SniptAPI(API_URL, API_KEY);

const server = new Server(
  {
    name: "snipt",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_snippets",
        description:
          "Search for code snippets by query, tags, or language. Use this to find established solutions before attempting commands.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (e.g., 'salesforce deploy', 'postgres connection')",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Filter by tags (e.g., ['deploy', 'salesforce'])",
            },
            language: {
              type: "string",
              description: "Filter by programming language (e.g., 'bash', 'python')",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default: 10)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_snippet",
        description: "Get a specific snippet by ID with full context and metadata.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Snippet ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "create_snippet",
        description:
          "Create a new snippet from a successful solution. Include rich context about what worked, common mistakes to avoid, and prerequisites.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Clear, descriptive title (e.g., 'Salesforce Sandbox Deploy')",
            },
            description: {
              type: "string",
              description: "Brief description of what this snippet does",
            },
            code: {
              type: "string",
              description: "The actual code or commands",
            },
            language: {
              type: "string",
              description: "Programming language or 'bash' for shell commands",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags for organization (e.g., ['salesforce', 'deploy', 'auth'])",
            },
            context: {
              type: "object",
              description: "Rich context about when to use, mistakes to avoid, etc.",
              properties: {
                when_to_use: { type: "string" },
                common_mistakes: { type: "array", items: { type: "string" } },
                prerequisites: { type: "array", items: { type: "string" } },
                troubleshooting: { type: "object" },
              },
            },
          },
          required: ["title", "code", "language"],
        },
      },
      {
        name: "update_snippet",
        description:
          "Update an existing snippet with new context, improved code, or additional learnings.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Snippet ID to update",
            },
            code: {
              type: "string",
              description: "Updated code (optional)",
            },
            context: {
              type: "object",
              description: "Additional context to merge (optional)",
            },
            success: {
              type: "boolean",
              description: "Whether this usage was successful (for analytics)",
            },
          },
          required: ["id"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_snippets":
        return await searchSnippets(api, args);

      case "get_snippet":
        return await getSnippet(api, args);

      case "create_snippet":
        return await createSnippet(api, args);

      case "update_snippet":
        return await updateSnippet(api, args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  // Fetch user's most common snippets as resources
  const snippets = await api.listSnippets({ limit: 20, sort: "usage_count" });

  return {
    resources: snippets.map((snippet) => ({
      uri: `snippet://${snippet.category || 'general'}/${snippet.id}`,
      name: snippet.title,
      description: snippet.description,
      mimeType: "text/plain",
    })),
  };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const snippetId = uri.split("/").pop();

  const snippet = await api.getSnippet(snippetId);

  return {
    contents: [
      {
        uri,
        mimeType: "text/plain",
        text: `# ${snippet.title}\n\n${snippet.code}\n\n## Context\n${JSON.stringify(snippet.context, null, 2)}`,
      },
    ],
  };
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Tool Implementations

```typescript
// src/tools/search.ts
export async function searchSnippets(api: SniptAPI, args: any) {
  const { query, tags, language, limit = 10 } = args;

  const results = await api.searchSnippets({
    query,
    tags,
    language,
    limit,
  });

  // Format for Claude Code
  const formatted = results
    .map(
      (snippet) => `
**${snippet.title}** (${snippet.language})
ID: ${snippet.id}
Tags: ${snippet.tags.join(", ")}
Used: ${snippet.usage_count} times (${snippet.success_count} successful)

\`\`\`${snippet.language}
${snippet.code}
\`\`\`

Context:
- When to use: ${snippet.context.when_to_use || "N/A"}
- Common mistakes: ${snippet.context.common_mistakes?.join(", ") || "None recorded"}
- Prerequisites: ${snippet.context.prerequisites?.join(", ") || "None"}

---
    `.trim()
    )
    .join("\n\n");

  return {
    content: [
      {
        type: "text",
        text: results.length > 0
          ? `Found ${results.length} snippet(s):\n\n${formatted}`
          : "No snippets found matching your query.",
      },
    ],
  };
}

// src/tools/create.ts
export async function createSnippet(api: SniptAPI, args: any) {
  const snippet = await api.createSnippet({
    ...args,
    created_by: "claude-code",
  });

  return {
    content: [
      {
        type: "text",
        text: `✅ Snippet saved successfully!\n\nTitle: ${snippet.title}\nID: ${snippet.id}\n\nI'll remember this solution and use it next time.`,
      },
    ],
  };
}
```

### API Client

```typescript
// src/api/client.ts
export class SniptAPI {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  private async fetch(path: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  async searchSnippets(params: {
    query: string;
    tags?: string[];
    language?: string;
    limit?: number;
  }) {
    const query = new URLSearchParams({
      query: params.query,
      ...(params.tags && { tags: params.tags.join(",") }),
      ...(params.language && { language: params.language }),
      ...(params.limit && { limit: params.limit.toString() }),
    });

    return this.fetch(`/search?${query}`);
  }

  async getSnippet(id: string) {
    return this.fetch(`/snippets/${id}`);
  }

  async createSnippet(data: any) {
    return this.fetch(`/snippets`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSnippet(id: string, data: any) {
    return this.fetch(`/snippets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async listSnippets(params: { limit?: number; sort?: string }) {
    const query = new URLSearchParams(params as any);
    return this.fetch(`/snippets?${query}`);
  }
}
```

---

## Frontend Components

### Key Pages

```
app/
├── (auth)/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── layout.tsx
├── (dashboard)/
│   ├── layout.tsx                 # Sidebar layout
│   ├── page.tsx                   # Dashboard home
│   ├── snippets/
│   │   ├── page.tsx               # List all snippets
│   │   ├── [id]/page.tsx          # View/edit single snippet
│   │   ├── new/page.tsx           # Create new snippet
│   │   └── components/
│   │       ├── SnippetCard.tsx
│   │       ├── SnippetEditor.tsx
│   │       ├── CodeEditor.tsx
│   │       └── ContextForm.tsx
│   ├── teams/
│   │   ├── page.tsx               # List teams
│   │   ├── [id]/page.tsx          # Team workspace
│   │   └── [id]/settings/page.tsx
│   ├── settings/
│   │   ├── page.tsx               # Profile settings
│   │   ├── api-keys/page.tsx      # Manage API keys
│   │   ├── billing/page.tsx       # Subscription management
│   │   └── mcp-setup/page.tsx     # MCP installation guide
│   └── analytics/
│       └── page.tsx               # Usage analytics
└── api/
    └── [routes]/route.ts          # API endpoints
```

### Component Examples

```typescript
// app/(dashboard)/snippets/components/SnippetEditor.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Monaco } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const snippetSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  code: z.string().min(1, "Code is required"),
  language: z.string().min(1, "Language is required"),
  tags: z.array(z.string()),
  context: z.object({
    when_to_use: z.string().optional(),
    common_mistakes: z.array(z.string()).optional(),
    prerequisites: z.array(z.string()).optional(),
  }),
});

type SnippetFormData = z.infer<typeof snippetSchema>;

export function SnippetEditor({
  initialData,
  onSave
}: {
  initialData?: SnippetFormData;
  onSave: (data: SnippetFormData) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);

  const form = useForm<SnippetFormData>({
    resolver: zodResolver(snippetSchema),
    defaultValues: initialData || {
      title: "",
      description: "",
      code: "",
      language: "javascript",
      tags: [],
      context: {},
    },
  });

  const onSubmit = async (data: SnippetFormData) => {
    setIsSubmitting(true);
    try {
      await onSave({ ...data, tags });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2">Title</label>
        <Input {...form.register("title")} placeholder="e.g., Salesforce Production Deploy" />
        {form.formState.errors.title && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <Textarea
          {...form.register("description")}
          placeholder="Brief description of what this snippet does"
          rows={2}
        />
      </div>

      {/* Code Editor */}
      <div>
        <label className="block text-sm font-medium mb-2">Code</label>
        <div className="border rounded-lg overflow-hidden">
          <Monaco
            height="300px"
            language={form.watch("language")}
            value={form.watch("code")}
            onChange={(value) => form.setValue("code", value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>

      {/* Language Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Language</label>
        <Select {...form.register("language")}>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="bash">Bash</option>
          <option value="sql">SQL</option>
          {/* Add more languages */}
        </Select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium mb-2">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
              <button
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="ml-2 text-xs"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add tag..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const input = e.currentTarget;
                const tag = input.value.trim();
                if (tag && !tags.includes(tag)) {
                  setTags([...tags, tag]);
                  input.value = "";
                }
              }
            }}
          />
        </div>
      </div>

      {/* Context Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Context (helps Claude learn)</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">When to use this</label>
            <Input
              {...form.register("context.when_to_use")}
              placeholder="e.g., For production deployments with JWT auth"
            />
          </div>

          {/* Common Mistakes */}
          <div>
            <label className="block text-sm font-medium mb-2">Common mistakes to avoid</label>
            <Textarea
              placeholder="One mistake per line&#10;e.g., Don't forget .sandbox suffix&#10;Don't use deprecated commands"
              rows={3}
            />
          </div>

          {/* Prerequisites */}
          <div>
            <label className="block text-sm font-medium mb-2">Prerequisites</label>
            <Textarea
              placeholder="One prerequisite per line&#10;e.g., JWT key must exist at ~/.salesforce/prod.key"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Snippet"}
        </Button>
      </div>
    </form>
  );
}
```

---

## Phase-by-Phase Implementation

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Core web app with authentication and basic CRUD

- [ ] Set up Next.js 14 project with TypeScript
- [ ] Configure TailwindCSS and shadcn/ui
- [ ] Set up Supabase project (Auth + Database)
- [ ] Implement database schema
- [ ] Create authentication pages (login, signup)
- [ ] Implement Supabase Auth integration
- [ ] Build basic dashboard layout
- [ ] Create snippet list view
- [ ] Create snippet detail/edit view
- [ ] Implement snippet CRUD API routes
- [ ] Add basic form validation

**Deliverable:** Functional web app where users can manually create, read, update, and delete snippets.

### Phase 2: Search & Organization (Week 3)

**Goal:** Make snippets easily discoverable

- [ ] Integrate Meilisearch
- [ ] Implement search indexing on snippet creation/update
- [ ] Build search UI with filters (tags, language)
- [ ] Add tag management
- [ ] Create category system
- [ ] Implement sorting (recent, most used, alphabetical)
- [ ] Add snippet versioning
- [ ] Build version history view

**Deliverable:** Fast, filterable search across all snippets.

### Phase 3: Team Collaboration (Week 4)

**Goal:** Enable teams to share snippets

- [ ] Implement team/workspace schema
- [ ] Create team management UI
- [ ] Build team invitation system
- [ ] Add team member roles (owner, admin, member)
- [ ] Implement team snippet sharing
- [ ] Add team analytics dashboard
- [ ] Configure Row Level Security policies

**Deliverable:** Teams can create workspaces and share snippets with colleagues.

### Phase 4: MCP Server (Week 5)

**Goal:** Enable Claude Code integration

- [ ] Set up MCP server TypeScript project
- [ ] Implement MCP SDK integration
- [ ] Create API client for Snipt backend
- [ ] Implement `search_snippets` tool
- [ ] Implement `get_snippet` tool
- [ ] Implement `create_snippet` tool (bidirectional!)
- [ ] Implement `update_snippet` tool
- [ ] Add resource handlers
- [ ] Create npm package
- [ ] Write installation documentation
- [ ] Test with Claude Code locally

**Deliverable:** Published npm package that Claude Code can use to read/write snippets.

### Phase 5: API Keys & Security (Week 6)

**Goal:** Secure MCP authentication

- [ ] Implement API key generation
- [ ] Create API key management UI
- [ ] Add key hashing (bcrypt)
- [ ] Implement API key authentication middleware
- [ ] Add rate limiting (e.g., 100 requests/min per key)
- [ ] Create key usage logging
- [ ] Add key revocation
- [ ] Display "last used" timestamps

**Deliverable:** Secure API key system for MCP server authentication.

### Phase 6: Rich Context & Learning (Week 7)

**Goal:** Make snippets context-rich

- [ ] Design context JSON schema
- [ ] Build context editing UI
- [ ] Add "common mistakes" field
- [ ] Add "prerequisites" field
- [ ] Add "when to use" field
- [ ] Implement usage tracking (success/failure)
- [ ] Add "created by Claude" badge
- [ ] Display usage statistics on snippet page

**Deliverable:** Snippets contain rich context that helps Claude learn.

### Phase 7: Analytics & Insights (Week 8)

**Goal:** Show value through usage data

- [ ] Build analytics dashboard
- [ ] Show most-used snippets
- [ ] Display success rates
- [ ] Create team usage reports
- [ ] Add "trending snippets" view
- [ ] Implement export functionality (CSV, JSON)
- [ ] Add usage graphs (Chart.js or Recharts)

**Deliverable:** Analytics dashboard showing snippet usage and success rates.

### Phase 8: Polish & Launch Prep (Week 9)

**Goal:** Production-ready app

- [ ] Add onboarding flow for new users
- [ ] Create MCP setup wizard
- [ ] Write comprehensive documentation
- [ ] Add example snippets gallery
- [ ] Implement error monitoring (Sentry)
- [ ] Add loading states and skeletons
- [ ] Optimize performance (React Query caching)
- [ ] Mobile responsiveness
- [ ] SEO optimization
- [ ] Create marketing landing page

**Deliverable:** Polished app ready for beta users.

### Phase 9: Billing & Monetization (Week 10)

**Goal:** Enable subscription payments

- [ ] Integrate Stripe
- [ ] Implement plan tiers (Free, Pro, Team)
- [ ] Add plan limits (50 snippets for free, unlimited for pro)
- [ ] Create billing management UI
- [ ] Add upgrade/downgrade flows
- [ ] Implement usage-based restrictions
- [ ] Add trial period (14 days Pro for free)
- [ ] Create pricing page

**Deliverable:** Functional subscription system.

### Phase 10: Advanced Features (Weeks 11-12)

**Goal:** Differentiate from competitors

- [ ] Add semantic search (OpenAI embeddings)
- [ ] Implement snippet recommendations
- [ ] Add "similar snippets" finder
- [ ] Create CLI tool for snippet management
- [ ] Add VS Code extension
- [ ] Implement snippet export/import
- [ ] Add Markdown support for documentation snippets
- [ ] Create public snippet sharing (optional)

**Deliverable:** Advanced features that make Snipt stand out.

---

## Deployment Strategy

### Infrastructure

```yaml
# Vercel (Frontend + API)
- Auto-deploy from main branch
- Preview deployments for PRs
- Environment variables:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - MEILISEARCH_HOST
  - MEILISEARCH_API_KEY
  - STRIPE_SECRET_KEY
  - STRIPE_WEBHOOK_SECRET

# Supabase (Database + Auth)
- PostgreSQL 15+
- Automated backups
- Row Level Security enabled
- Connection pooling (PgBouncer)

# Meilisearch (Search)
- Self-hosted or Meilisearch Cloud
- 1GB RAM minimum
- Automated index updates via webhooks

# npm Registry (MCP Server)
- Published as @snipt/mcp-server
- Semantic versioning
- Automated releases via GitHub Actions
```

### CI/CD Pipeline

```yaml
# .github/workflows/main.yml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test

  deploy-web:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  publish-mcp:
    needs: test
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: cd mcp-server && npm ci
      - run: cd mcp-server && npm run build
      - run: cd mcp-server && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Security Considerations

### API Key Security
- Store only bcrypt hashes in database
- Show only first 8 characters in UI (e.g., `snip_abc1...`)
- Generate keys with cryptographically secure random bytes
- Implement rate limiting per key
- Log all API key usage for audit trail

### Row Level Security
- Enforce RLS on all tables
- Users can only access their own snippets + team snippets
- Team members can only access snippets from teams they belong to
- API keys inherit user's permissions

### Input Validation
- Validate all inputs server-side (Zod schemas)
- Sanitize code snippets (but preserve as-is, don't execute)
- Prevent SQL injection (use parameterized queries)
- Prevent XSS (Next.js escapes by default)

### Rate Limiting
- 100 requests/minute per API key (for MCP)
- 1000 requests/hour per user (for web UI)
- Exponential backoff for failed auth attempts

---

## Monitoring & Observability

### Key Metrics to Track

1. **User Metrics**
   - Daily/Monthly Active Users
   - Signup conversion rate
   - Churn rate
   - Plan upgrades/downgrades

2. **Snippet Metrics**
   - Total snippets created
   - Snippets created by Claude Code vs. manual
   - Average snippets per user
   - Most used snippets
   - Success rate per snippet

3. **MCP Metrics**
   - MCP tool call volume
   - Search queries per day
   - Create snippet calls per day
   - Average response time
   - Error rate

4. **Performance Metrics**
   - API response times (P50, P95, P99)
   - Search latency
   - Database query times
   - Vercel function execution time

### Tools

- **Vercel Analytics:** Page views, Web Vitals
- **Sentry:** Error tracking and performance monitoring
- **PostHog:** Product analytics and user behavior
- **Supabase Dashboard:** Database metrics and slow queries

---

## Testing Strategy

### Unit Tests
- API route handlers
- MCP tool implementations
- Utility functions
- React components (React Testing Library)

### Integration Tests
- Full API workflows (create → search → update snippet)
- MCP server end-to-end (using MCP SDK test utilities)
- Authentication flows

### E2E Tests
- Critical user journeys (Playwright):
  - Sign up → Create snippet → Search snippet
  - Create team → Invite member → Share snippet
  - Generate API key → Use with MCP server

### Load Tests
- Search performance under load (k6)
- API key authentication throughput
- Concurrent snippet creation

---

## Success Metrics

### Launch Goals (Month 1)
- 100 signups
- 50 active users (created at least 1 snippet)
- 10 MCP server installations
- 5 paying customers

### Growth Goals (Month 3)
- 500 signups
- 200 active users
- 50 MCP server installations
- 25 paying customers
- 1000+ snippets created
- 50% of snippets created by Claude Code (proving the learning loop works)

### Long-term Goals (Month 12)
- 5000 users
- 1000 paying customers
- €10k MRR
- 10000+ snippets in the vault
- Featured in Claude Code MCP marketplace

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude Code changes MCP protocol | High | Follow MCP SDK updates closely, maintain backward compatibility |
| Users don't adopt MCP server | High | Make installation dead simple, create video tutorial |
| GitHub/other tools add similar features | Medium | Focus on superior UX and learning loop |
| Search performance degrades at scale | Medium | Optimize Meilisearch, consider horizontal scaling |
| API costs too high | Medium | Implement usage-based pricing, optimize API calls |
| Security breach | High | Regular security audits, bug bounty program |

---

## Next Steps

1. **Set up project infrastructure** (Day 1)
   - Initialize Next.js project
   - Create Supabase project
   - Set up GitHub repo and CI/CD

2. **Build core features** (Weeks 1-4)
   - Follow Phase 1-3 implementation plan
   - Focus on getting basic snippet management working

3. **Develop MCP server** (Week 5)
   - This is the killer feature - prioritize getting it working
   - Test extensively with Claude Code

4. **Beta testing** (Week 6-8)
   - Invite 10-20 developer friends
   - Get feedback on MCP integration
   - Iterate based on real usage

5. **Launch** (Week 9-10)
   - Public launch on Product Hunt
   - Share on Twitter, Reddit (r/webdev, r/ClaudeAI)
   - Publish on Claude Code MCP marketplace (if available)

---

## Conclusion

Snipt differentiates itself through bidirectional MCP integration - it's not just a snippet storage tool, but a learning system that makes Claude Code progressively better at working in your specific environment.

The key to success is nailing the "learning loop" UX:
1. Claude struggles with a problem
2. Claude solves it after multiple attempts
3. Claude asks: "Should I save this?"
4. User says yes
5. Next time, Claude searches snippets first and succeeds immediately

**This is the magic that makes Snipt worth paying for.**

Focus on this core experience before adding bells and whistles.
