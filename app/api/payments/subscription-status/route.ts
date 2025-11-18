import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's payment status
    const { data: userData } = await supabase
      .from("users")
      .select("has_paid, paid_at, plan_tier")
      .eq("id", user.id)
      .single()

    if (!userData || !userData.has_paid) {
      return NextResponse.json({
        hasPaid: false,
        planTier: "free",
      })
    }

    return NextResponse.json({
      hasPaid: true,
      planTier: userData.plan_tier || "pro",
      paidAt: userData.paid_at,
    })
  } catch (error) {
    console.error("Error fetching payment status:", error)
    return NextResponse.json(
      { error: "Failed to fetch payment status" },
      { status: 500 }
    )
  }
}
