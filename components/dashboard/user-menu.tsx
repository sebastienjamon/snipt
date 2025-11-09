"use client"

import { LogOut, User as UserIcon } from "lucide-react"
import { signOut } from "@/app/(auth)/actions"

type User = {
  email?: string
  user_metadata?: {
    display_name?: string
  }
}

export function UserMenu({ user }: { user: User }) {
  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "User"

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <UserIcon className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{displayName}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </form>
    </div>
  )
}
