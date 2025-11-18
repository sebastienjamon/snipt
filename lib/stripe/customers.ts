import { stripe } from "./client"
import { createClient } from "@/lib/supabase/server"

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(userId: string, email: string) {
  const supabase = await createClient()

  // Check if user already has a Stripe customer ID
  const { data: user } = await supabase
    .from("users")
    .select("stripe_customer_id, display_name")
    .eq("id", userId)
    .single()

  if (user?.stripe_customer_id) {
    // Verify the customer still exists in Stripe
    try {
      const customer = await stripe.customers.retrieve(user.stripe_customer_id)
      if (!customer.deleted) {
        return customer.id
      }
    } catch (error) {
      console.error("Error retrieving Stripe customer:", error)
      // Customer doesn't exist, will create a new one below
    }
  }

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
    name: user?.display_name || undefined,
  })

  // Store the Stripe customer ID in the database
  await supabase
    .from("users")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId)

  return customer.id
}

/**
 * Get the Stripe customer ID for a user
 */
export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: user } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single()

  return user?.stripe_customer_id || null
}
