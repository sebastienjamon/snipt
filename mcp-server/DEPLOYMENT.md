# Deployment Guide for Snipt MCP Server

This guide covers deploying the Snipt MCP server to production for ChatGPT Apps integration.

## Prerequisites

- [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
- Supabase project credentials (URL and anon key)
- Snipt.app instance running

## Quick Start - Fly.io Deployment

### 1. Install Fly.io CLI

```bash
# macOS
brew install flyctl

# Other platforms
curl -L https://fly.io/install.sh | sh
```

### 2. Authenticate with Fly.io

```bash
flyctl auth login
```

### 3. Create Fly.io App

From the `mcp-server` directory:

```bash
flyctl launch --no-deploy
```

This will:
- Read the `fly.toml` configuration
- Create a new app (you can customize the name)
- Set up the app in your Fly.io account

### 4. Set Environment Variables

Set your Supabase credentials and configuration:

```bash
# Required OAuth configuration
flyctl secrets set SUPABASE_URL=https://your-project.supabase.co
flyctl secrets set SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional configuration
flyctl secrets set SNIPT_API_URL=https://snipt.app

# The MCP_SERVER_URL will be automatically set based on your Fly.io app name
# It will be: https://your-app-name.fly.dev
# Set it explicitly if you're using a custom domain:
flyctl secrets set MCP_SERVER_URL=https://your-app-name.fly.dev
```

**To verify secrets are set:**
```bash
flyctl secrets list
```

### 5. Deploy

```bash
flyctl deploy
```

This will:
- Build the Docker image
- Deploy to Fly.io
- Start the server
- Provide you with the URL (e.g., `https://your-app-name.fly.dev`)

### 6. Verify Deployment

Check that the server is running:

```bash
# Check health endpoint
curl https://your-app-name.fly.dev/health

# Check OAuth metadata
curl https://your-app-name.fly.dev/.well-known/oauth-protected-resource

# Check logs
flyctl logs
```

Expected health response:
```json
{
  "status": "ok",
  "server": "snipt-mcp-http",
  "version": "1.0.0",
  "auth": {
    "apiKey": false,
    "oauth": true
  }
}
```

### 7. Update MCP_SERVER_URL (if needed)

If you didn't set `MCP_SERVER_URL` or need to update it:

```bash
flyctl secrets set MCP_SERVER_URL=https://your-app-name.fly.dev
flyctl deploy
```

## Configure ChatGPT Apps

Now that your server is deployed:

1. Go to [ChatGPT Apps](https://chatgpt.com/settings/apps)
2. Click "Create New App"
3. Configure:
   - **Name**: Snipt Code Snippets
   - **Description**: Search and manage code snippets with context
   - **MCP Server URL**: `https://your-app-name.fly.dev/mcp`
   - **Authentication**: Will auto-discover OAuth via metadata endpoint

4. Save and enable the app

## Testing

Test the integration in ChatGPT:

```
"Search my snippets for JWT authentication"
"Save this code snippet for later"
"Show me all my Python snippets"
```

## Monitoring

### View Logs

```bash
# Real-time logs
flyctl logs

# Follow logs
flyctl logs -f
```

### View Metrics

```bash
# App status
flyctl status

# Resource usage
flyctl scale show
```

### SSH into Container

```bash
flyctl ssh console
```

## Scaling

### Vertical Scaling (More resources per machine)

```bash
flyctl scale vm shared-cpu-2x
```

### Horizontal Scaling (More machines)

```bash
flyctl scale count 2
```

## Updating

After making code changes:

```bash
# Rebuild and deploy
npm run build
flyctl deploy
```

## Custom Domain (Optional)

If you want to use a custom domain:

```bash
# Add certificate
flyctl certs create mcp.snipt.app

# Add DNS record
# Add CNAME: mcp.snipt.app -> your-app-name.fly.dev

# Update MCP_SERVER_URL
flyctl secrets set MCP_SERVER_URL=https://mcp.snipt.app
```

## Troubleshooting

### Deployment fails

```bash
# Check build logs
flyctl logs

# Verify Docker build locally
docker build -t snipt-mcp-test .
docker run -p 3001:3001 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_ANON_KEY=your_key \
  -e MCP_SERVER_URL=http://localhost:3001 \
  snipt-mcp-test
```

### Server not responding

```bash
# Check status
flyctl status

# Restart app
flyctl apps restart

# Check health endpoint
curl https://your-app-name.fly.dev/health
```

### OAuth not working

```bash
# Verify secrets are set
flyctl secrets list

# Check OAuth metadata endpoint
curl https://your-app-name.fly.dev/.well-known/oauth-protected-resource

# Verify MCP_SERVER_URL matches actual URL
# Should be: https://your-app-name.fly.dev (not localhost)
```

### Cold start issues

Fly.io auto-stops machines when idle. To keep at least one running:

```bash
# Edit fly.toml
# Set: auto_stop_machines = false
# Set: min_machines_running = 1

flyctl deploy
```

## Alternative: Render Deployment

If you prefer Render:

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Environment**: Docker
   - **Region**: Choose closest to your users
   - **Environment Variables**:
     - `SUPABASE_URL`: https://your-project.supabase.co
     - `SUPABASE_ANON_KEY`: your_supabase_anon_key
     - `SNIPT_API_URL`: https://snipt.app
     - `MCP_SERVER_URL`: https://your-service.onrender.com
     - `PORT`: 3001

5. Deploy

## Alternative: Railway Deployment

If you prefer Railway:

1. Go to [Railway](https://railway.app/)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Configure:
   - **Root Directory**: `mcp-server`
   - **Environment Variables**:
     - `SUPABASE_URL`: https://your-project.supabase.co
     - `SUPABASE_ANON_KEY`: your_supabase_anon_key
     - `SNIPT_API_URL`: https://snipt.app
     - `MCP_SERVER_URL`: Will be provided by Railway
     - `PORT`: 3001

5. Deploy

## Cost Estimates

### Fly.io
- Free tier: Sufficient for testing
- Production: ~$5-10/month for small-scale usage
- Scales automatically based on load

### Render
- Free tier: Available but may have cold starts
- Starter: $7/month

### Railway
- Free tier: $5 credit/month
- Pro: $20/month with usage-based pricing

## Security Best Practices

1. **Never commit secrets** - Always use environment variables
2. **Use HTTPS only** - Fly.io provides automatic TLS
3. **Monitor logs** - Watch for suspicious activity
4. **Rotate keys** - Periodically update Supabase anon key
5. **Rate limiting** - Consider adding rate limiting for production

## Support

- **Fly.io Docs**: https://fly.io/docs/
- **MCP Protocol**: https://modelcontextprotocol.io/
- **ChatGPT Apps**: https://developers.openai.com/apps-sdk/
