# Snipt MCP Server Testing Guide

This guide covers pre-launch validation, discovery prompts, and testing protocols recommended by OpenAI.

## Pre-Launch Checklist

### Infrastructure Tests

- [ ] **Health endpoint responds**
  ```bash
  curl https://snipt-mcp.fly.dev/health
  # Expected: {"status":"ok","server":"snipt-mcp-http","version":"1.0.0",...}
  ```

- [ ] **OAuth metadata accessible**
  ```bash
  curl https://snipt-mcp.fly.dev/.well-known/oauth-protected-resource
  # Expected: Valid JSON with authorization_servers
  ```

- [ ] **HTTPS enforced**
  ```bash
  curl -I http://snipt-mcp.fly.dev/health
  # Expected: 301/302 redirect to HTTPS
  ```

- [ ] **Machines running**
  ```bash
  flyctl status --app snipt-mcp
  # Expected: At least 1 machine in "started" state
  ```

### Authentication Tests

- [ ] **OAuth discovery works**
  - OAuth metadata returns correct Supabase URL
  - Scopes include `snippets:read` and `snippets:write`

- [ ] **Unauthorized requests return 401**
  ```bash
  curl -X POST https://snipt-mcp.fly.dev/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
  # Expected: 401 with WWW-Authenticate header
  ```

- [ ] **Valid Bearer tokens accepted**
  - Test with real Supabase user token
  - Verify token verification calls Supabase
  - Confirm user-scoped data access

### MCP Protocol Tests

- [ ] **Tools list endpoint works**
  ```bash
  # With valid auth
  curl -X POST https://snipt-mcp.fly.dev/mcp \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
  # Expected: List of 4 tools (search, get, create, update)
  ```

- [ ] **Resources list endpoint works**
  ```bash
  curl -X POST https://snipt-mcp.fly.dev/mcp \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{"jsonrpc":"2.0","method":"resources/list","params":{},"id":1}'
  # Expected: snippet-list resource
  ```

- [ ] **Streaming responses work**
  - Check Accept header: `application/json, text/event-stream`
  - Verify no timeout issues
  - Confirm no cold start interruptions

### Integration Tests

- [ ] **MCP Inspector**
  ```bash
  npx @modelcontextprotocol/inspector https://snipt-mcp.fly.dev/mcp
  ```
  - All 4 tools visible
  - Can invoke search_snippets
  - Widget renders properly
  - Copy-to-clipboard works

- [ ] **Snipt API connectivity**
  - Server can reach https://snipt.app/api
  - Auth tokens passed correctly
  - Error handling works for API failures

---

## Discovery Prompts

Discovery prompts test how well ChatGPT discovers and uses your MCP tools. Test these in ChatGPT after registering the app.

### Search & Retrieval

**Prompt 1: Direct search**
```
"Search my snippets for JWT authentication"
```
**Expected behavior:**
- ChatGPT calls `search_snippets` with `query="JWT authentication"`
- Results displayed in widget
- Can click to copy code

**Prompt 2: Natural language search**
```
"Do I have any snippets about deploying to AWS?"
```
**Expected behavior:**
- ChatGPT infers to search for "AWS" or "deploy"
- Returns relevant snippets
- May ask for clarification if many results

**Prompt 3: Filter by language**
```
"Show me all my Python snippets"
```
**Expected behavior:**
- ChatGPT calls `search_snippets` with `language="python"`
- Filters correctly
- Widget shows language badges

**Prompt 4: Filter by category**
```
"What database snippets do I have?"
```
**Expected behavior:**
- ChatGPT calls `search_snippets` with `category="Database"`
- Returns category-filtered results

### Saving Snippets

**Prompt 5: Save code naturally**
```
"Save this bash script for later:
#!/bin/bash
echo 'Hello World'"
```
**Expected behavior:**
- ChatGPT calls `create_snippet`
- Infers language as "bash"
- Sets appropriate category ("CLI")
- Returns confirmation with snippet ID

**Prompt 6: Save with context**
```
"Save this Python function. It's for FastAPI and requires python-jose library.
def verify_token(token: str):
    return decode_jwt(token)"
```
**Expected behavior:**
- ChatGPT calls `create_snippet` with:
  - `language="python"`
  - `prerequisites=["python-jose"]`
  - `when_to_use` or `description` mentions FastAPI
- Confirmation includes all context

**Prompt 7: Save with tags**
```
"Save this snippet and tag it as 'production' and 'deployment'"
```
**Expected behavior:**
- ChatGPT includes `tags=["production", "deployment"]`
- Confirmation shows tags

### Retrieving & Using Snippets

**Prompt 8: Get specific snippet**
```
"Show me that Salesforce snippet we saved last week"
```
**Expected behavior:**
- ChatGPT searches for "Salesforce"
- If one result, uses `get_snippet` for details
- Displays full code with context

**Prompt 9: Use in conversation**
```
"I need to set up JWT auth. Use that snippet we saved."
```
**Expected behavior:**
- ChatGPT searches for JWT
- Retrieves snippet code
- Helps adapt it to current need

**Prompt 10: List by criteria**
```
"What snippets have I marked as successful?"
```
**Expected behavior:**
- ChatGPT searches (may use tags or query)
- Explains successful snippets
- Shows them in widget

### Updating & Organizing

**Prompt 11: Mark as successful**
```
"Mark that deployment script as successful, it worked perfectly"
```
**Expected behavior:**
- ChatGPT identifies the snippet (recent context)
- Calls `update_snippet` with `is_successful=true`
- Confirmation of update

**Prompt 12: Add tags**
```
"Add a 'tested' tag to the last snippet I saved"
```
**Expected behavior:**
- ChatGPT retrieves recent snippet
- Updates with new tag
- Confirms addition

**Prompt 13: Update description**
```
"Update the JWT snippet description to mention it works with Express.js"
```
**Expected behavior:**
- Searches/identifies JWT snippet
- Updates description
- Shows updated info

### Edge Cases

**Prompt 14: Ambiguous request**
```
"Show me that snippet"
```
**Expected behavior:**
- ChatGPT asks for clarification
- Suggests searching or providing more details

**Prompt 15: No results**
```
"Find snippets about quantum computing"
```
**Expected behavior:**
- Searches but finds nothing
- Explains no results found
- Offers to help create one

**Prompt 16: Multiple results**
```
"Show me my API snippets"
```
**Expected behavior:**
- Returns multiple results
- Widget displays all
- May ask which one user wants

---

## Precision & Recall Testing

Track how well ChatGPT discovers and uses your tools:

### Metrics to Track

**Precision**: When ChatGPT calls a tool, does it work correctly?
- Calculate: (Successful tool calls) / (Total tool calls)
- Target: >95%

**Recall**: Does ChatGPT discover tools when appropriate?
- Calculate: (Times tool used when needed) / (Times tool was needed)
- Target: >90%

**False Positives**: Tool called when not needed
- Track instances where ChatGPT calls wrong tool
- Target: <5%

### Test Suite

Create 20 test prompts covering:
- 5 search/retrieval tasks
- 5 create tasks
- 5 update tasks
- 5 edge cases

Run through all prompts and score:
- ✅ Correct tool, correct parameters
- ⚠️ Correct tool, suboptimal parameters
- ❌ Wrong tool or failed

---

## Performance Testing

### Response Time

Test tool invocation latency:

```bash
# Search snippets
time curl -X POST https://snipt-mcp.fly.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_snippets","arguments":{"query":"test"}},"id":1}'
```

**Targets:**
- Health check: <100ms
- OAuth metadata: <100ms
- Search snippets: <500ms
- Create snippet: <1s

### Load Testing

Simulate multiple concurrent requests:

```bash
# Using Apache Bench
ab -n 100 -c 10 https://snipt-mcp.fly.dev/health

# Using hey
hey -n 100 -c 10 https://snipt-mcp.fly.dev/health
```

**Targets:**
- 100 req/sec without errors
- P95 latency <500ms
- No failed requests

### Streaming Test

Verify streaming doesn't timeout:

```bash
# Long-running search
curl -X POST https://snipt-mcp.fly.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_snippets","arguments":{"limit":100}},"id":1}'
```

Should complete without timeout.

---

## Artifact Capture

Document your testing for production launch:

### Screenshots

Capture:
1. **MCP Inspector** showing all 4 tools
2. **ChatGPT search results** with widget displayed
3. **Snippet creation** confirmation
4. **Widget interaction** (before/after click to copy)
5. **OAuth authentication flow** (login screen, permissions, success)

### Screen Recordings

Record:
1. **End-to-end flow**: Search → Create → Update snippet in ChatGPT
2. **OAuth flow**: First-time user authentication
3. **Widget usage**: Searching, clicking, copying code
4. **MCP Inspector test**: Invoking all tools

### Test Results

Document:
- Precision/Recall scores
- Performance benchmarks (response times)
- Load test results
- Any edge cases discovered
- Issues encountered and resolutions

Save in: `/mcp-server/test-results/`

---

## Post-Deployment Validation

After deploying to production:

### First 30 Minutes

- [ ] Monitor logs continuously
  ```bash
  flyctl logs --app snipt-mcp
  ```

- [ ] Test each tool manually in ChatGPT
  - Search snippets
  - Create snippet
  - Get snippet by ID
  - Update snippet

- [ ] Verify OAuth flow for new user
  - Use incognito/private browsing
  - Complete full authentication
  - Test snippet access

- [ ] Check error handling
  - Invalid snippet ID
  - Missing required fields
  - API connection issues

### First 24 Hours

- [ ] Review all logs for errors
- [ ] Check performance metrics
- [ ] Monitor memory/CPU usage
- [ ] Verify no crashed machines
- [ ] Test from different regions

### First Week

- [ ] Gather user feedback
- [ ] Review discovery prompt success rate
- [ ] Analyze most-used tools
- [ ] Check for any patterns in errors
- [ ] Update documentation based on learnings

---

## Regression Testing

Before each update:

- [ ] Run full test suite (20 discovery prompts)
- [ ] Verify OAuth still works
- [ ] Test all 4 tools in MCP Inspector
- [ ] Check widget still renders
- [ ] Confirm health endpoint responds
- [ ] Load test with 100 requests

---

## Automated Testing (Future)

Consider implementing:

```javascript
// Example test structure
describe('MCP Server', () => {
  test('health endpoint returns ok', async () => {
    const response = await fetch('https://snipt-mcp.fly.dev/health')
    const data = await response.json()
    expect(data.status).toBe('ok')
  })

  test('search_snippets returns results', async () => {
    // Mock authenticated request
    const result = await mcpClient.callTool('search_snippets', {
      query: 'test'
    })
    expect(result.content[0].type).toBe('text')
  })
})
```

Run in CI/CD pipeline before deployment.

---

## Support Contacts

- **Fly.io Issues**: https://community.fly.io/
- **OpenAI MCP Support**: https://help.openai.com/
- **Supabase Issues**: https://github.com/supabase/supabase/discussions
