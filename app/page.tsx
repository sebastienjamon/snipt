import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-secondary">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h1 className="text-6xl font-bold tracking-tight">
          Code Snippets That <span className="text-primary">Remember</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          The first snippet manager built for AI coding assistants.
          Teach Claude Code your workflow once, use forever.
        </p>

        <div className="flex gap-4 justify-center pt-8">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              Sign In
            </Button>
          </Link>
        </div>

        <div className="pt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold text-lg mb-2">Self-Improving AI</h3>
            <p className="text-sm text-muted-foreground">
              Claude Code learns from your solutions and never makes the same mistake twice
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold text-lg mb-2">Context-Rich</h3>
            <p className="text-sm text-muted-foreground">
              Not just code, but why it works, common mistakes to avoid, and prerequisites
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold text-lg mb-2">Team Knowledge</h3>
            <p className="text-sm text-muted-foreground">
              Your entire team&apos;s learnings become Claude Code&apos;s knowledge base
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
