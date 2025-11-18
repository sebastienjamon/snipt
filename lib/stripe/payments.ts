import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Record a successful payment and upgrade user to unlimited
 */
export async function recordPayment(
  userId: string,
  customerId: string,
  paymentIntentId: string,
  checkoutSessionId: string | null,
  amount: number,
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient || await createClient()

  // Record payment in payments table
  const { error: paymentError } = await supabase
    .from("payments")
    .insert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_payment_intent_id: paymentIntentId,
      stripe_checkout_session_id: checkoutSessionId,
      amount,
      currency: "usd",
      status: "succeeded",
      paid_at: new Date().toISOString(),
    })

  if (paymentError) {
    console.error("Error recording payment:", paymentError)
    throw paymentError
  }

  // Update user to mark as paid (trigger will update plan_tier)
  const { error: userError } = await supabase
    .from("users")
    .update({
      has_paid: true,
      paid_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (userError) {
    console.error("Error updating user:", userError)
    throw userError
  }
}

/**
 * Check if a user has paid
 */
export async function hasUserPaid(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: user } = await supabase
    .from("users")
    .select("has_paid")
    .eq("id", userId)
    .single()

  return user?.has_paid || false
}

/**
 * Get payment history for a user
 */
export async function getUserPayments(userId: string) {
  const supabase = await createClient()

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  return payments || []
}
