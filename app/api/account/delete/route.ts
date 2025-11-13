import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

// DELETE /api/account/delete - Permanently delete user account and all associated data
export async function DELETE() {
  // Authenticate user with session
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Create admin client with service role key to delete user
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Delete user from Supabase Auth
    // This will cascade delete all related data if foreign keys are set up properly
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      user.id
    )

    if (deleteError) {
      console.error("Error deleting user:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      )
    }

    // Success
    return NextResponse.json(
      { message: "Account deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error in account deletion:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
