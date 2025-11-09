import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  console.log("[Callback] Code received:", code ? "yes" : "no")
  console.log("[Callback] Origin:", origin)

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    console.log("[Callback] Exchange result - Error:", error?.message, "User:", data.user?.email)

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      let redirectUrl: string
      if (isLocalEnv) {
        redirectUrl = `${origin}${next}`
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`
      } else {
        redirectUrl = `${origin}${next}`
      }

      console.log("[Callback] Success! Redirecting to:", redirectUrl)
      return NextResponse.redirect(redirectUrl)
    } else {
      console.error("[Callback] Exchange failed:", error)
    }
  }

  // Return the user to an error page with some instructions
  console.log("[Callback] Redirecting to error page")
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
