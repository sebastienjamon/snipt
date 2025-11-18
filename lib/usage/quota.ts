import { createClient } from "@/lib/supabase/server"

export type PlanTier = "free" | "pro"

export type PlanLimits = {
  maxSnippets: number
}

// Define limits for each plan tier
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxSnippets: 50,
  },
  pro: {
    maxSnippets: Infinity,
  },
}

/**
 * Check if user has paid (has unlimited access)
 */
async function hasUserPaid(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: user } = await supabase
    .from("users")
    .select("has_paid")
    .eq("id", userId)
    .single()

  return user?.has_paid || false
}

/**
 * Check if a user can create a new snippet
 */
export async function canCreateSnippet(userId: string): Promise<{
  allowed: boolean
  reason?: string
  current: number
  limit: number
}> {
  const supabase = await createClient()
  const hasPaid = await hasUserPaid(userId)

  // If user has paid, they have unlimited snippets
  if (hasPaid) {
    const { count } = await supabase
      .from("snippets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    return {
      allowed: true,
      current: count || 0,
      limit: Infinity,
    }
  }

  // Free users limited to 50 snippets
  const { count } = await supabase
    .from("snippets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  const current = count || 0
  const limit = PLAN_LIMITS.free.maxSnippets

  if (current >= limit) {
    return {
      allowed: false,
      reason: `You've reached the limit of ${limit} snippets. Pay $19 once for unlimited snippets forever!`,
      current,
      limit,
    }
  }

  return {
    allowed: true,
    current,
    limit,
  }
}

/**
 * Get usage statistics for a user
 */
export async function getUserUsageStats(userId: string) {
  const supabase = await createClient()
  const hasPaid = await hasUserPaid(userId)

  const { count: snippetCount } = await supabase
    .from("snippets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  const limit = hasPaid ? Infinity : PLAN_LIMITS.free.maxSnippets

  return {
    snippets: {
      current: snippetCount || 0,
      limit,
      percentage:
        limit === Infinity
          ? 0
          : Math.round(((snippetCount || 0) / limit) * 100),
    },
  }
}
