import { IncomingMessage } from "http"

/**
 * Authentication context extracted from the request
 */
export interface AuthContext {
  type: "api_key" | "oauth"
  userId?: string
  token?: string
}

/**
 * Extract authentication from request headers
 */
export async function extractAuth(req: IncomingMessage, supabaseUrl: string, supabaseAnonKey: string): Promise<AuthContext | null> {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return null
  }

  // Check for Bearer token (OAuth)
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)

    // Verify token with Supabase
    const userId = await verifySupabaseToken(token, supabaseUrl, supabaseAnonKey)

    if (userId) {
      return {
        type: "oauth",
        userId,
        token
      }
    }
  }

  // Check for API key
  if (authHeader.startsWith("ApiKey ")) {
    const apiKey = authHeader.substring(7)

    // Validate API key (you could add more validation here)
    if (apiKey && apiKey.length > 0) {
      return {
        type: "api_key"
      }
    }
  }

  return null
}

/**
 * Verify Supabase JWT token and extract user ID
 */
async function verifySupabaseToken(token: string, supabaseUrl: string, supabaseAnonKey: string): Promise<string | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  try {
    // Call Supabase to verify the token
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": supabaseAnonKey
      }
    })

    if (response.ok) {
      const user = await response.json() as { id: string }
      return user.id
    }
  } catch (error) {
    console.error("Token verification failed:", error)
  }

  return null
}

/**
 * Get OAuth protected resource metadata
 */
export function getOAuthMetadata(serverUrl: string, supabaseUrl: string) {
  if (!supabaseUrl) {
    return null
  }

  return {
    resource: serverUrl,
    authorization_servers: [serverUrl], // Point to our own server
    scopes_supported: ["snippets:read", "snippets:write"],
    resource_documentation: `${serverUrl}/docs`
  }
}

/**
 * Generate WWW-Authenticate challenge header
 */
export function getAuthChallenge(serverUrl: string): string {
  return `Bearer resource_metadata="${serverUrl}/.well-known/oauth-protected-resource"`
}
