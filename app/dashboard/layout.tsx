import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/dashboard/sidebar"
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar"
import { UserMenu } from "@/components/dashboard/user-menu"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch snippet count for sidebar
  const { count: snippetCount } = await supabase
    .from("snippets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar snippetCount={snippetCount || 0} />
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 md:h-16 items-center justify-between border-b px-4 md:px-6">
          {/* Mobile menu button */}
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <MobileSidebar snippetCount={snippetCount || 0} />
            </div>
            <h1 className="hidden md:block text-lg md:text-2xl font-semibold truncate">Dashboard</h1>
          </div>
          <UserMenu user={user} />
        </header>
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
