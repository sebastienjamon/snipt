import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Code2 } from "lucide-react"

export default async function SnippetsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: snippets, error } = await supabase
    .from("snippets")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching snippets:", error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Snippets</h2>
          <p className="text-muted-foreground">
            Manage your code snippets and share them with Claude Code
          </p>
        </div>
        <Link href="/dashboard/snippets/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Snippet
          </Button>
        </Link>
      </div>

      {!snippets || snippets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Code2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No snippets yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Create your first snippet to start building your knowledge base.
              Claude Code will be able to search and use these snippets automatically.
            </p>
            <Link href="/dashboard/snippets/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Snippet
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {snippets.map((snippet) => (
            <Link key={snippet.id} href={`/dashboard/snippets/${snippet.id}`}>
              <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1">{snippet.title}</CardTitle>
                    <Badge variant="secondary" className="ml-2">
                      {snippet.language}
                    </Badge>
                  </div>
                  {snippet.description && (
                    <CardDescription className="line-clamp-2">
                      {snippet.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {snippet.tags && snippet.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {snippet.tags.slice(0, 3).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {snippet.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{snippet.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Used {snippet.usage_count || 0} times
                      </span>
                      <span>
                        {new Date(snippet.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
