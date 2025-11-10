import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary">
      <header className="border-b bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <Logo href="/" />
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-sm md:text-base">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="text-sm md:text-base">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight px-4">
          Code Snippets That <span className="text-primary">Remember</span>
        </h1>

        <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
          The first snippet manager built for AI coding assistants.
          Teach Claude Code your workflow once, use forever.
        </p>

        <div className="flex gap-4 justify-center pt-4 md:pt-8 px-4">
          <Link href="/signup">
            <Button size="lg" className="text-base md:text-lg px-6 py-5 md:px-8 md:py-6">
              Get Started
            </Button>
          </Link>
        </div>

        <div className="pt-8 md:pt-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 text-left px-4">
          <div className="p-4 md:p-6 rounded-lg border bg-card">
            <h3 className="font-semibold text-base md:text-lg mb-2">Self-Improving AI</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Claude Code learns from your solutions and never makes the same mistake twice
            </p>
          </div>

          <div className="p-4 md:p-6 rounded-lg border bg-card">
            <h3 className="font-semibold text-base md:text-lg mb-2">Context-Rich</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Not just code, but why it works, common mistakes to avoid, and prerequisites
            </p>
          </div>

          <div className="p-4 md:p-6 rounded-lg border bg-card">
            <h3 className="font-semibold text-base md:text-lg mb-2">Team Knowledge</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Your entire team&apos;s learnings become Claude Code&apos;s knowledge base
            </p>
          </div>
        </div>
      </div>
      </div>
    </main>
  )
}
