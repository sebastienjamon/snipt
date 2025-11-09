import { Logo } from "@/components/ui/logo"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Logo href="/" />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 bg-gradient-to-b from-background to-secondary">
        {children}
      </main>
    </div>
  )
}
