import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  console.log("[OAuth Callback] Code:", code)
  console.log("[OAuth Callback] Origin:", origin)
  console.log("[OAuth Callback] Next:", next)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    console.log("[OAuth Callback] Exchange error:", error)

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.error("[OAuth Callback] Error exchanging code:", error)
    }
  }

  // Return the user to an error page with some instructions
  console.log("[OAuth Callback] No code or error occurred, redirecting to error page")
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
