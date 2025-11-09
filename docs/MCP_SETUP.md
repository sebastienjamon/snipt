# MCP Server Setup Guide

This guide will help you set up the Snipt MCP server to use with Claude Code.

## Quick Start (5 minutes)

### 1. Build the MCP Server

```bash
cd mcp-server
npm install
npm run build
```

### 2. Get Your API Key

1. Make sure your Snipt app is running:
   ```bash
   # From project root
   npm run dev
   ```

2. Open http://localhost:3000/dashboard/api-keys
3. Click "Create API Key"
4. Name it "Claude Code"
5. **Copy the full key** (starts with `snip_`) - shown only once!

### 3. Configure Claude Code

For local development:

```bash
claude mcp add snipt \
  -e SNIPT_API_KEY=snip_your_key_here \
  -e SNIPT_API_URL=http://localhost:3000 \
  -- /Users/sjamon/Documents/snipt.it/mcp-server/dist/index.js
```

Replace the path with your actual project path.

### 4. Verify It Works

Open a new Claude Code session and try:

```
Claude, search my snippets
```

## Testing Without Claude Code

You can test the MCP server directly using stdio:

```bash
cd mcp-server

# Set environment variables
export SNIPT_API_KEY=snip_your_key_here
export SNIPT_API_URL=http://localhost:3000

# Test listing tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js

# Test search (after the server initializes)
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_snippets","arguments":{}}}' | node dist/index.js
```

## Production Setup

Once you deploy Snipt to production:

1. Publish the MCP server to npm (optional):
   ```bash
   cd mcp-server
   npm publish --access public
   ```

2. Configure Claude Code to use production:
   ```bash
   claude mcp add snipt \
     -e SNIPT_API_KEY=snip_your_production_key \
     -e SNIPT_API_URL=https://snipt.it \
     -- npx @snipt/mcp-server
   ```

## Common Issues

### "Command not found: snipt-mcp"

If you installed from source, you need to use the full path:
```bash
-- /absolute/path/to/mcp-server/dist/index.js
```

Or link it globally:
```bash
cd mcp-server
npm link
claude mcp add snipt ... -- snipt-mcp
```

### "Unauthorized" Error

- Check your API key is correct
- Make sure you copied the full key (starts with `snip_`)
- Verify the key wasn't revoked in the dashboard

### "Connection Refused"

- Make sure your Snipt app is running on port 3000
- Check `SNIPT_API_URL` is set to `http://localhost:3000`

### No Snippets Returned

- Create some snippets in the dashboard first
- Make sure you're logged in with the same account

## What's Next?

Now that the MCP server is set up, you can:

1. **Search snippets** while coding
2. **Save new snippets** as you solve problems
3. **Update snippets** to mark them as successful/failed
4. **Share knowledge** across your team

The killer feature is bidirectional learning - Claude Code not only reads your snippets but can save new ones automatically!

## Example Workflow

1. You ask Claude Code: "How do I deploy a Next.js app?"
2. Claude searches your snippets and finds your deployment command
3. You run it successfully
4. Claude offers: "Should I update this snippet to mark it as successful?"
5. You say yes, and the snippet is automatically marked with `is_successful: true`

Later when you search for "deployment", successful snippets are shown first!
