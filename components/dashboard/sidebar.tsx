"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Code2, Home, Settings, Key, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/ui/logo"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Snippets", href: "/dashboard/snippets", icon: Code2 },
  { name: "Teams", href: "/dashboard/teams", icon: Users },
  { name: "API Keys", href: "/dashboard/api-keys", icon: Key },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

type SidebarProps = {
  snippetCount?: number
}

export function Sidebar({ snippetCount = 0 }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Logo href="/dashboard" />
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-4 text-sm">
          <p className="font-semibold mb-1">Free Plan</p>
          <p className="text-xs text-muted-foreground mb-2">
            {snippetCount} / 50 snippets used
          </p>
          <Link href="/dashboard/settings/billing">
            <button className="text-xs text-primary hover:underline">
              Upgrade to Pro
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
