"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Copy, Trash2, Key, CheckCircle } from "lucide-react"

type ApiKey = {
  id: string
  name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showNewKey, setShowNewKey] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchKeys()
  }, [])

  async function fetchKeys() {
    const response = await fetch("/api/keys")
    if (response.ok) {
      const data = await response.json()
      setKeys(data)
    }
    setLoading(false)
  }

  async function createKey() {
    if (!newKeyName.trim()) {
      alert("Please enter a name for the API key")
      return
    }

    setCreating(true)
    const response = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName }),
    })

    if (response.ok) {
      const data = await response.json()
      setShowNewKey(data.key) // The full key is only shown once!
      setNewKeyName("")
      fetchKeys()
    } else {
      alert("Failed to create API key")
    }
    setCreating(false)
  }

  async function deleteKey(id: string) {
    if (!confirm("Are you sure you want to revoke this API key? This cannot be undone.")) {
      return
    }

    const response = await fetch(`/api/keys/${id}`, {
      method: "DELETE",
    })

    if (response.ok) {
      fetchKeys()
    } else {
      alert("Failed to delete API key")
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading API keys...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">API Keys</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Generate API keys to connect Claude Code to your snippet vault via MCP
        </p>
      </div>

      {/* New Key Success Message */}
      {showNewKey && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5" />
              API Key Created Successfully!
            </CardTitle>
            <CardDescription>
              Copy this key now - it won&apos;t be shown again for security reasons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={showNewKey}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={() => copyToClipboard(showNewKey, "new")}
                variant="outline"
              >
                {copiedId === "new" ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <Button onClick={() => setShowNewKey(null)} variant="outline" size="sm">
              I&apos;ve saved the key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create New Key */}
      <Card>
        <CardHeader>
          <CardTitle>Create New API Key</CardTitle>
          <CardDescription>
            Generate a new API key to use with the Snipt MCP server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                placeholder="e.g., MacBook Pro, Work Laptop"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    createKey()
                  }
                }}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={createKey} disabled={creating} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                {creating ? "Creating..." : "Create Key"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Keys */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            Manage your existing API keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No API keys yet. Create one above to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{key.name}</p>
                        <p className="text-sm text-muted-foreground font-mono break-all">
                          {key.key_prefix}...
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground flex flex-col sm:flex-row gap-1 sm:gap-4">
                      <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                      {key.last_used_at && (
                        <span>
                          Last used: {new Date(key.last_used_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => deleteKey(key.id)}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive sm:shrink-0 self-start sm:self-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use with Claude Code</CardTitle>
          <CardDescription>
            Follow these steps to connect your snippet vault to Claude Code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-semibold">
                1
              </div>
              <div>
                <p className="font-medium">Install the MCP server</p>
                <code className="text-sm bg-muted px-2 py-1 rounded mt-1 block">
                  npm install -g @snipt/mcp-server
                </code>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-semibold">
                2
              </div>
              <div>
                <p className="font-medium">Create an API key above</p>
                <p className="text-sm text-muted-foreground">
                  Copy the key when it&apos;s generated
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-semibold">
                3
              </div>
              <div>
                <p className="font-medium">Configure Claude Code</p>
                <code className="text-sm bg-muted px-2 py-1 rounded mt-1 block">
                  claude mcp add snipt -e SNIPT_API_KEY=your_key_here -- snipt-mcp
                </code>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-semibold">
                4
              </div>
              <div>
                <p className="font-medium">Start using it!</p>
                <p className="text-sm text-muted-foreground">
                  Claude Code can now search and save snippets automatically
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              📖 For detailed setup instructions, see the{" "}
              <a href="https://code.claude.com/docs/en/mcp" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                MCP Setup Guide
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
