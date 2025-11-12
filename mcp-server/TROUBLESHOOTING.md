# Snipt MCP Server Troubleshooting Playbook

This guide helps diagnose and resolve common issues with the Snipt MCP server deployment.

## Quick Diagnostics

### 1. Check Server Health

```bash
# Test health endpoint
curl https://snipt-mcp.fly.dev/health

# Expected response:
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

### 2. Check OAuth Metadata

```bash
# Test OAuth discovery endpoint
curl https://snipt-mcp.fly.dev/.well-known/oauth-protected-resource

# Expected response:
{
  "resource": "https://snipt-mcp.fly.dev",
  "authorization_servers": ["https://kfmpdlbpchrnirppthvj.supabase.co/auth/v1"],
  "scopes_supported": ["snippets:read", "snippets:write"],
  "resource_documentation": "https://snipt-mcp.fly.dev/docs"
}
```

### 3. Check Machine Status

```bash
flyctl status --app snipt-mcp
```

Expected: At least 1 machine in "started" state.

### 4. View Recent Logs

```bash
flyctl logs --app snipt-mcp --no-tail
```

---

## Common Issues

### Issue 1: 401 Unauthorized

**Symptoms:**
- ChatGPT shows authentication error
- MCP Inspector returns 401

**Diagnosis:**
```bash
# Check if OAuth metadata is accessible
curl https://snipt-mcp.fly.dev/.well-known/oauth-protected-resource

# Verify secrets are set
flyctl secrets list --app snipt-mcp
```

**Resolution:**
1. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set:
```bash
flyctl secrets list --app snipt-mcp
```

2. If missing, set them:
```bash
flyctl secrets set \
  SUPABASE_URL=https://kfmpdlbpchrnirppthvj.supabase.co \
  SUPABASE_ANON_KEY=your_anon_key \
  --app snipt-mcp
```

3. Verify `MCP_SERVER_URL` matches your actual domain:
```bash
flyctl secrets set MCP_SERVER_URL=https://snipt-mcp.fly.dev --app snipt-mcp
```

4. Check Supabase project is accessible:
```bash
curl -H "apikey: YOUR_ANON_KEY" \
  https://kfmpdlbpchrnirppthvj.supabase.co/auth/v1/health
```

---

### Issue 2: Server Not Responding

**Symptoms:**
- Health check fails
- Connection timeout
- DNS resolution error

**Diagnosis:**
```bash
# Check DNS resolution
nslookup snipt-mcp.fly.dev

# Check machine status
flyctl status --app snipt-mcp

# Check logs for errors
flyctl logs --app snipt-mcp --no-tail
```

**Resolution:**

**If DNS fails:**
- Wait 5-10 minutes for DNS propagation
- Verify app name in fly.toml matches: `snipt-mcp`

**If machines stopped:**
```bash
flyctl machine restart --app snipt-mcp
```

**If machines missing:**
```bash
flyctl deploy --app snipt-mcp
```

**Check for port issues:**
```bash
# Verify PORT environment variable
flyctl config show --app snipt-mcp | grep PORT

# Should show: PORT = "3001"
```

---

### Issue 3: Tools Not Appearing in ChatGPT

**Symptoms:**
- ChatGPT can't see MCP tools
- No snippet search functionality

**Diagnosis:**
```bash
# Test MCP endpoint directly
curl -X POST https://snipt-mcp.fly.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```

**Resolution:**
1. Verify MCP endpoint is accessible (should return 401 if OAuth required)
2. Check ChatGPT Apps configuration:
   - MCP Server URL: `https://snipt-mcp.fly.dev/mcp` (exact)
   - Authentication: OAuth 2.1
3. Re-authorize in ChatGPT if needed
4. Check CORS headers in logs

---

### Issue 4: OAuth Token Verification Fails

**Symptoms:**
- User can authenticate but API calls fail
- Logs show "Token verification failed"

**Diagnosis:**
```bash
# Check Supabase is accessible
curl -I https://kfmpdlbpchrnirppthvj.supabase.co/auth/v1/health

# Check logs for token verification errors
flyctl logs --app snipt-mcp --no-tail | grep "verification failed"
```

**Resolution:**
1. Verify Supabase project is active:
   - Go to https://supabase.com/dashboard
   - Check project status

2. Test token verification manually:
```bash
# Get a test token from Supabase dashboard
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  https://kfmpdlbpchrnirppthvj.supabase.co/auth/v1/user
```

3. Verify anon key hasn't been rotated:
```bash
# Compare with Supabase dashboard Settings → API
flyctl secrets list --app snipt-mcp
```

---

### Issue 5: Snippet API Errors

**Symptoms:**
- Tools return errors
- Logs show API connection failures

**Diagnosis:**
```bash
# Check if snipt.app API is accessible
curl -I https://snipt.app/api/snippets

# View detailed error logs
flyctl logs --app snipt-mcp --no-tail | grep "error"
```

**Resolution:**
1. Verify `SNIPT_API_URL` is set correctly:
```bash
flyctl config show --app snipt-mcp | grep SNIPT_API_URL
```

2. Test API directly:
```bash
# With OAuth token
curl -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  https://snipt.app/api/snippets
```

3. Check network connectivity from Fly.io:
```bash
flyctl ssh console --app snipt-mcp
# Inside container:
curl -I https://snipt.app/api/snippets
```

---

### Issue 6: High Latency / Slow Responses

**Symptoms:**
- ChatGPT responses are slow
- Timeout errors

**Diagnosis:**
```bash
# Check machine regions
flyctl status --app snipt-mcp

# Monitor response times
time curl https://snipt-mcp.fly.dev/health

# Check resource usage
flyctl machine list --app snipt-mcp
```

**Resolution:**
1. Scale vertically (more resources):
```bash
flyctl scale vm shared-cpu-2x --app snipt-mcp
```

2. Scale horizontally (more machines):
```bash
flyctl scale count 3 --app snipt-mcp
```

3. Add regions closer to users:
```bash
flyctl regions add lhr ams --app snipt-mcp
```

---

### Issue 7: Memory/CPU Issues

**Symptoms:**
- OOM (Out of Memory) errors in logs
- Machines restarting frequently

**Diagnosis:**
```bash
# Check machine metrics
flyctl machine list --app snipt-mcp

# View logs for OOM
flyctl logs --app snipt-mcp --no-tail | grep -i "memory\|oom"
```

**Resolution:**
1. Increase memory allocation in `fly.toml`:
```toml
[[vm]]
  memory = '2gb'  # Increase from 1gb
  cpu_kind = 'shared'
  cpus = 1
```

2. Deploy changes:
```bash
flyctl deploy --app snipt-mcp
```

---

## Monitoring Commands

### Real-time Monitoring

```bash
# Follow logs in real-time
flyctl logs --app snipt-mcp

# Watch machine status
watch -n 5 'flyctl status --app snipt-mcp'

# Monitor specific machine
flyctl logs --app snipt-mcp --machine MACHINE_ID
```

### Health Checks

```bash
# Continuous health monitoring
watch -n 10 'curl -s https://snipt-mcp.fly.dev/health | jq'

# Test all endpoints
curl https://snipt-mcp.fly.dev/health
curl https://snipt-mcp.fly.dev/.well-known/oauth-protected-resource
```

---

## Incident Response Checklist

When something goes wrong:

1. **Assess Impact**
   - [ ] Can users access ChatGPT app?
   - [ ] Are health checks passing?
   - [ ] Are logs showing errors?

2. **Gather Information**
   ```bash
   flyctl status --app snipt-mcp > status.txt
   flyctl logs --app snipt-mcp --no-tail > logs.txt
   curl https://snipt-mcp.fly.dev/health > health.json
   ```

3. **Quick Fixes**
   - [ ] Restart machines: `flyctl machine restart --app snipt-mcp`
   - [ ] Check secrets: `flyctl secrets list --app snipt-mcp`
   - [ ] Verify DNS: `nslookup snipt-mcp.fly.dev`

4. **Escalation**
   - If quick fixes don't work, rollback:
   ```bash
   flyctl releases --app snipt-mcp
   flyctl releases rollback VERSION --app snipt-mcp
   ```

---

## Useful Commands Reference

```bash
# Deployment
flyctl deploy --app snipt-mcp

# Restart
flyctl machine restart --app snipt-mcp

# Scale
flyctl scale count 2 --app snipt-mcp
flyctl scale vm shared-cpu-2x --app snipt-mcp

# Secrets
flyctl secrets list --app snipt-mcp
flyctl secrets set KEY=VALUE --app snipt-mcp
flyctl secrets unset KEY --app snipt-mcp

# Logs
flyctl logs --app snipt-mcp
flyctl logs --app snipt-mcp --machine MACHINE_ID

# SSH
flyctl ssh console --app snipt-mcp

# Releases
flyctl releases --app snipt-mcp
flyctl releases rollback VERSION --app snipt-mcp

# Regions
flyctl regions list --app snipt-mcp
flyctl regions add REGION --app snipt-mcp

# Destroy (careful!)
flyctl apps destroy snipt-mcp
```

---

## Contact & Escalation

- **Fly.io Status**: https://status.fly.io/
- **Fly.io Community**: https://community.fly.io/
- **Supabase Status**: https://status.supabase.com/
- **OpenAI Support**: https://help.openai.com/

---

## Regular Maintenance

### Weekly
- [ ] Review logs for errors
- [ ] Check machine health
- [ ] Verify OAuth still working

### Monthly
- [ ] Review and rotate secrets if needed
- [ ] Check for dependency updates
- [ ] Review resource usage and costs

### After Deployment
- [ ] Monitor logs for 30 minutes
- [ ] Test all tools in ChatGPT
- [ ] Verify OAuth flow works
- [ ] Check performance metrics
