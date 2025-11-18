"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2, Sparkles, Zap } from "lucide-react"
import { useSearchParams } from "next/navigation"

type PaymentStatus = {
  hasPaid: boolean
  planTier: string
  paidAt?: string
}

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    loadPaymentStatus()

    // Check for success/cancel params from Stripe redirect
    if (searchParams.get("success")) {
      setMessage({ type: "success", text: "Payment successful! You now have unlimited snippets forever!" })
    } else if (searchParams.get("canceled")) {
      setMessage({ type: "error", text: "Checkout canceled. No charges were made." })
    }
  }, [searchParams])

  async function loadPaymentStatus() {
    try {
      const response = await fetch("/api/payments/subscription-status")
      if (response.ok) {
        const data = await response.json()
        setPaymentStatus(data)
      }
    } catch (error) {
      console.error("Failed to load payment status:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckout() {
    setCheckoutLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create checkout session")
      }

      const { url } = await response.json()

      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error) {
      console.error("Checkout error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to start checkout. Please try again."
      setMessage({ type: "error", text: errorMessage })
      setCheckoutLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // User already paid - show success state
  if (paymentStatus?.hasPaid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-2">
            Your payment and billing information
          </p>
        </div>

        <Card className="border-green-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-green-500" />
                Unlimited Access
              </CardTitle>
              <Badge variant="default" className="bg-green-500">Active</Badge>
            </div>
            <CardDescription>Lifetime unlimited snippets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  You have unlimited access to all features
                </p>
                {paymentStatus.paidAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Purchased on {new Date(paymentStatus.paidAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="pt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Unlimited snippets</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Lifetime access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>No recurring fees</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User hasn't paid - show upgrade option
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upgrade to Unlimited</h1>
        <p className="text-muted-foreground mt-2">
          One-time payment, lifetime access
        </p>
      </div>

      {message && (
        <Card className={message.type === "error" ? "border-destructive" : "border-green-500"}>
          <CardContent className="pt-6">
            <p className={message.type === "error" ? "text-destructive" : "text-green-600"}>
              {message.text}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        {/* Free Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Perfect for getting started</CardDescription>
            <div className="mt-4">
              <span className="text-3xl font-bold">$0</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Badge variant="outline">Current Plan</Badge>

              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
                  <span className="text-sm">Up to 50 snippets</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
                  <span className="text-sm">Unlimited tags</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
                  <span className="text-sm">API access</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
                  <span className="text-sm">MCP Server integration</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Unlimited Plan */}
        <Card className="border-primary shadow-lg relative">
          <div className="absolute -top-3 left-0 right-0 flex justify-center">
            <Badge className="bg-primary">Most Popular</Badge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Unlimited
            </CardTitle>
            <CardDescription>Lifetime access, no limits</CardDescription>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold">$19</span>
              <span className="text-sm text-muted-foreground">one-time</span>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full mb-6"
              size="lg"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Upgrade Now
                </>
              )}
            </Button>

            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
                <span className="text-sm font-medium">Unlimited snippets</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
                <span className="text-sm">Lifetime access</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
                <span className="text-sm">No recurring fees</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
                <span className="text-sm">All features included</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
                <span className="text-sm">Priority support</span>
              </li>
            </ul>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-xs text-muted-foreground">
                One-time payment • Lifetime access • No subscriptions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Pay once, use forever</p>
              <p className="text-sm text-muted-foreground mt-1">
                Get unlimited snippets with a single payment of $19. No subscriptions, no recurring fees, just lifetime access to unlimited code snippets.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
