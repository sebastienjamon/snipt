"use client"

import Link from "next/link"
import { LogOut } from "lucide-react"
import { signOut } from "@/app/(auth)/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type User = {
  email?: string
  user_metadata?: {
    display_name?: string
    avatar_url?: string
  }
}

export function UserMenu({ user }: { user: User }) {
  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "User"
  const avatarUrl = user.user_metadata?.avatar_url
  const initials = displayName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex items-center gap-2">
      <Link href="/dashboard/settings" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden md:flex flex-col">
          <span className="text-sm font-medium">{displayName}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg p-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Sign out</span>
        </button>
      </form>
    </div>
  )
}
