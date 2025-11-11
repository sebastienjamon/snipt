import { createClient } from "@supabase/supabase-js"
import type { User } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

export async function validateApiKey(
  apiKey: string
): Promise<{ valid: boolean; userId?: string }> {
  console.log("[API Key] Validating key:", apiKey.substring(0, 15) + "...")

  if (!apiKey || !apiKey.startsWith("snip_")) {
    console.log("[API Key] Invalid format or missing")
    return { valid: false }
  }

  // Use service role client to bypass RLS for API key validation
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

  // Get all non-revoked API keys (we need to check hashes)
  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, user_id, key_hash")
    .is("revoked_at", null)

  console.log("[API Key] Found keys:", keys?.length || 0, "Error:", error)

  if (error || !keys) {
    return { valid: false }
  }

  // Check each key hash (this is why we limit API keys per user)
  for (const key of keys) {
    const isValid = await bcrypt.compare(apiKey, key.key_hash)
    if (isValid) {
      // Update last_used_at
      await supabase
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", key.id)

      return { valid: true, userId: key.user_id }
    }
  }

  return { valid: false }
}

async function verifySupabaseJWT(
  token: string
): Promise<{ userId: string } | null> {
  try {
    // Use Supabase to verify the JWT token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get user info using the provided token
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.log("[JWT Auth] Token verification failed:", error?.message)
      return null
    }

    console.log("[JWT Auth] Token verified for user:", user.id)
    return { userId: user.id }
  } catch (error) {
    console.error("[JWT Auth] Error verifying token:", error)
    return null
  }
}

export async function getUserFromRequest(
  request: Request
): Promise<{ user: User; source: "session" | "api_key" | "jwt" } | null> {
  const { createClient: createServerClient } = await import(
    "@/lib/supabase/server"
  )
  const supabase = await createServerClient()

  // Try session authentication first
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return { user, source: "session" }
  }

  // Try Bearer token authentication (API key or JWT)
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7)

    // Check if it's an API key (starts with snip_) or a JWT
    if (token.startsWith("snip_")) {
      // API key authentication
      const { valid, userId } = await validateApiKey(token)

      if (valid && userId) {
        // Use service role to fetch user data (bypass RLS)
        const serviceSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        )

        const { data: userData } = await serviceSupabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single()

        if (userData) {
          return {
            user: { id: userId, ...userData } as User,
            source: "api_key",
          }
        }
      }
    } else {
      // Try JWT authentication
      const jwtResult = await verifySupabaseJWT(token)

      if (jwtResult) {
        // Use service role to fetch user data (bypass RLS)
        const serviceSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        )

        const { data: userData } = await serviceSupabase.auth.admin.getUserById(
          jwtResult.userId
        )

        if (userData.user) {
          return {
            user: userData.user,
            source: "jwt",
          }
        }
      }
    }
  }

  return null
}
