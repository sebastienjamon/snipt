import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  // Handle OAuth callback redirects - redirect to proper callback handler
  const url = request.nextUrl
  const code = url.searchParams.get("code")

  if (code && (url.pathname === "/login" || url.pathname === "/signup")) {
    const callbackUrl = new URL("/auth/callback", request.url)
    callbackUrl.searchParams.set("code", code)
    return NextResponse.redirect(callbackUrl)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes handle their own auth)
     * - auth/callback (OAuth callback route)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|api|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
