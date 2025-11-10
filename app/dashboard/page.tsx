import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Code2, Users, Key, TrendingUp } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch snippet count
  const { count: snippetCount } = await supabase
    .from("snippets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user?.id)

  // Fetch API key count (non-revoked only)
  const { count: apiKeyCount } = await supabase
    .from("api_keys")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user?.id)
    .is("revoked_at", null)

  // Fetch recent snippets (last 5)
  const { data: recentSnippets } = await supabase
    .from("snippets")
    .select("id, title, language, created_at, updated_at")
    .eq("user_id", user?.id)
    .order("updated_at", { ascending: false })
    .limit(5)

  // Fetch snippets created this month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: snippetsThisMonth } = await supabase
    .from("snippets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user?.id)
    .gte("created_at", startOfMonth)

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Welcome back, {user?.user_metadata?.display_name || "there"}!
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Here&apos;s what&apos;s happening with your snippets today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Snippets
            </CardTitle>
            <Code2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{snippetCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {50 - (snippetCount || 0)} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Teams
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              No teams yet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              API Keys
            </CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeyCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {apiKeyCount === 0 ? "Create a key for MCP" : "Active keys"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Created This Month
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{snippetsThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">
              {snippetsThisMonth === 0
                ? "No snippets yet"
                : `${snippetsThisMonth} new snippet${snippetsThisMonth === 1 ? "" : "s"}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Quick steps to get the most out of Snipt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                1
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Create your first snippet</p>
                <p className="text-sm text-muted-foreground">
                  Store code snippets that you use frequently
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                2
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Generate an API key</p>
                <p className="text-sm text-muted-foreground">
                  Connect Claude Code to your snippet vault via MCP
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                3
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Install MCP server</p>
                <p className="text-sm text-muted-foreground">
                  Enable Claude Code to read and write snippets automatically
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest snippet updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!recentSnippets || recentSnippets.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No activity yet. Create your first snippet to get started!
              </div>
            ) : (
              <div className="space-y-4">
                {recentSnippets.map((snippet) => {
                  const updatedAt = new Date(snippet.updated_at)
                  const now = new Date()
                  const diffMs = now.getTime() - updatedAt.getTime()
                  const diffMins = Math.floor(diffMs / 60000)
                  const diffHours = Math.floor(diffMs / 3600000)
                  const diffDays = Math.floor(diffMs / 86400000)

                  let timeAgo = ""
                  if (diffMins < 1) timeAgo = "Just now"
                  else if (diffMins < 60) timeAgo = `${diffMins}m ago`
                  else if (diffHours < 24) timeAgo = `${diffHours}h ago`
                  else timeAgo = `${diffDays}d ago`

                  return (
                    <div key={snippet.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {snippet.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {snippet.language}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground ml-2">
                        {timeAgo}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
