import { NextRequest, NextResponse } from "next/server"
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/client"
import { recordPayment } from "@/lib/stripe/payments"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    )
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set")
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    )
  }

  try {
    // Use service role client for webhook operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.payment_status === "paid") {
          const userId = session.metadata?.supabase_user_id
          const customerId = session.customer as string
          const paymentIntentId = session.payment_intent as string

          if (!userId) {
            console.error("No user ID in session metadata")
            break
          }

          // Get user to update their Stripe customer ID if needed
          const { data: user } = await supabase
            .from("users")
            .select("stripe_customer_id")
            .eq("id", userId)
            .single()

          if (user && !user.stripe_customer_id) {
            await supabase
              .from("users")
              .update({ stripe_customer_id: customerId })
              .eq("id", userId)
          }

          // Record the payment (pass service role client)
          await recordPayment(
            userId,
            customerId,
            paymentIntentId,
            session.id,
            session.amount_total || 1900,
            supabase
          )

          console.log("Payment succeeded:", paymentIntentId)
        }
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log("Payment intent succeeded:", paymentIntent.id)
        // Payment is already handled by checkout.session.completed
        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log("Payment failed:", paymentIntent.id)
        // You can send an email notification here
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}
