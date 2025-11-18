import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/client"
import { getOrCreateStripeCustomer } from "@/lib/stripe/customers"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user already paid
    const { data: userData } = await supabase
      .from("users")
      .select("has_paid")
      .eq("id", user.id)
      .single()

    if (userData?.has_paid) {
      return NextResponse.json(
        { error: "You already have unlimited access" },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!)

    // Get Datafast cookies for revenue attribution
    const cookieStore = await cookies()
    const datafastVisitorId = cookieStore.get("datafast_visitor_id")?.value
    const datafastSessionId = cookieStore.get("datafast_session_id")?.value

    // Get the app URL for success/cancel redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Create Stripe checkout session for ONE-TIME payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Unlimited Snippets",
              description: "Lifetime access to unlimited code snippets",
            },
            unit_amount: 1900, // $19.00
          },
          quantity: 1,
        },
      ],
      mode: "payment", // One-time payment, not subscription
      success_url: `${appUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        // Add Datafast attribution metadata
        ...(datafastVisitorId && { datafast_visitor_id: datafastVisitorId }),
        ...(datafastSessionId && { datafast_session_id: datafastSessionId }),
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
