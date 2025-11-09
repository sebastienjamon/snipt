# Snipt MCP Server

Model Context Protocol (MCP) server for Snipt - enables Claude Code to search, read, and save code snippets.

## What is This?

This MCP server connects Claude Code to your Snipt snippet vault, enabling:

✅ **Search snippets** during coding sessions
✅ **Retrieve code** with full context (prerequisites, common mistakes, when to use)
✅ **Save new snippets** when solving problems (bidirectional learning!)
✅ **Update snippets** to mark as successful/failed or add lessons learned

Think of it as giving Claude Code access to your personal knowledge base of commands, code patterns, and solutions.

## Installation

### Option 1: From npm (Recommended - Coming Soon)

```bash
npm install -g @snipt/mcp-server
```

### Option 2: From Source (For Development)

```bash
# Clone the repo and navigate to mcp-server directory
cd mcp-server

# Install dependencies
npm install

# Build the package
npm run build

# Make the server executable (important!)
chmod +x dist/index.js

# Link it globally (optional)
npm link
```

## Setup

### Step 1: Get Your API Key

1. Go to https://snipt.it/dashboard/api-keys (or http://localhost:3000/dashboard/api-keys for local dev)
2. Click "Create API Key"
3. Give it a name like "Claude Code"
4. **Copy the full key** (starts with `snip_`) - it's only shown once!

### Step 2: Configure Claude Code

#### For Production (snipt.it)

```bash
claude mcp add snipt \
  -e SNIPT_API_KEY=snip_your_key_here \
  -e SNIPT_API_URL=https://snipt.it \
  -- snipt-mcp
```

#### For Local Development

```bash
claude mcp add snipt \
  -e SNIPT_API_KEY=snip_your_key_here \
  -e SNIPT_API_URL=http://localhost:3000 \
  -- snipt-mcp
```

#### Using npx (if not installed globally)

```bash
claude mcp add snipt \
  -e SNIPT_API_KEY=snip_your_key_here \
  -e SNIPT_API_URL=https://snipt.it \
  -- npx @snipt/mcp-server
```

### Step 3: Verify Installation

```bash
# List configured MCP servers
claude mcp list

# You should see "snipt" in the list
```

## Usage Examples

Once configured, you can use natural language with Claude Code:

### 🔍 Search for Snippets

```
Claude, search my snippets for "git deployment"
Claude, find my docker commands
Claude, show me all my python database snippets
```

### 📖 Get Specific Snippet

```
Claude, show me snippet abc123
Claude, get the full details for snippet xyz789
```

### ✍️ Save New Snippets

This is the killer feature - Claude Code learns from your sessions!

```
Claude, save this as a snippet:
Title: Deploy Next.js app
Code: npm run build && npm run deploy
Language: bash
Tags: nextjs, deployment
When to use: When deploying to production
Common mistakes: Forgetting to run build first
```

Or even simpler:
```
Claude, remember this command for later: git push origin --force-with-lease
```

### 🔄 Update Snippets

```
Claude, mark snippet abc123 as successful
Claude, update snippet xyz789 to add a note about common mistakes
```

## Tools Provided

The MCP server exposes 4 tools to Claude Code:

### 1. search_snippets
Search your snippet library by:
- **query**: Text search across title, description, and code
- **tags**: Filter by tags (e.g., `['git', 'deploy']`)
- **language**: Filter by language (e.g., `python`, `bash`)
- **category**: Filter by category (e.g., `CLI`, `Database`)
- **limit**: Max results (default: 20)

### 2. get_snippet
Get complete details for a specific snippet by ID.

### 3. create_snippet
Save a new snippet with:
- **title** (required): Short, descriptive title
- **code** (required): The actual code/command
- **language** (required): Programming language
- **description**: What this code does
- **category**: CLI, Database, API, DevOps, etc.
- **tags**: Array of searchable tags
- **when_to_use**: When to use this snippet
- **common_mistakes**: Array of pitfalls to avoid
- **prerequisites**: Array of requirements
- **is_successful**: Mark if this solution worked

### 4. update_snippet
Update any field of an existing snippet, including marking it as successful/unsuccessful.

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SNIPT_API_KEY` | ✅ Yes | - | Your Snipt API key (get from dashboard) |
| `SNIPT_API_URL` | No | `https://snipt.it` | API base URL (use `http://localhost:3000` for local dev) |

### Troubleshooting

#### "Unauthorized" errors
- Check that your API key is correct and hasn't been revoked
- Verify the key is properly set in the MCP configuration
- Make sure you're using the full key (starts with `snip_`)

#### "Connection refused" errors
- For local development, make sure your Snipt app is running on port 3000
- Check that `SNIPT_API_URL` is set correctly

#### MCP server not showing up in Claude Code
- Run `claude mcp list` to see all configured servers
- Run `claude mcp remove snipt` and re-add it
- Check Claude Code logs for errors

#### "No snippets found"
- Make sure you've created some snippets in the Snipt dashboard first
- Try searching without filters to see all snippets
- Check that you're logged in with the correct account

## Development

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# Build once
npm run build

# Test the built server
node dist/index.js
```

The MCP server uses stdio transport, so it communicates via stdin/stdout. To test manually:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

## How It Works

1. **Claude Code** starts the MCP server as a subprocess when you open a project
2. **Communication** happens via stdio (JSON-RPC messages)
3. **Authentication** uses your API key as a Bearer token
4. **Requests** are made to the Snipt API at `/api/snippets`
5. **Responses** are formatted as markdown for Claude Code to read

## Security

- API keys are stored securely in Claude Code's configuration
- Keys are hashed with bcrypt on the server
- All communication uses HTTPS (in production)
- Row Level Security (RLS) ensures you only access your own snippets

## Contributing

Issues and PRs welcome! This is open source (MIT License).

## License

MIT
