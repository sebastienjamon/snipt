import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { snippetSchema } from "@/lib/validations/snippet"
import { getUserFromRequest } from "@/lib/auth/api-key"

export async function GET(request: Request) {
  // Support both session and API key authentication
  const auth = await getUserFromRequest(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { user, source } = auth

  // Use service role client for API key and JWT auth to bypass RLS
  const supabase =
    source === "api_key" || source === "jwt"
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        )
      : await createServerClient()

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")
  const language = searchParams.get("language")
  const tags = searchParams.get("tags")?.split(",")

  let queryBuilder = supabase
    .from("snippets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // Filter by language
  if (language) {
    queryBuilder = queryBuilder.eq("language", language)
  }

  // Filter by tags
  if (tags && tags.length > 0) {
    queryBuilder = queryBuilder.contains("tags", tags)
  }

  // Full-text search
  if (query) {
    // Sanitize query for tsquery: split by spaces and join with &
    // Remove special characters that break tsquery syntax
    const sanitizedQuery = query
      .split(/\s+/)
      .map(word => word.replace(/[^\w\s]/g, ''))
      .filter(word => word.length > 0)
      .join(' & ')

    if (sanitizedQuery) {
      queryBuilder = queryBuilder.textSearch("search_vector", sanitizedQuery)
    }
  }

  const { data: snippets, error } = await queryBuilder

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(snippets)
}

export async function POST(request: Request) {
  // Support both session and API key authentication
  const auth = await getUserFromRequest(request)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { user, source } = auth

  // Use service role client for API key and JWT auth to bypass RLS
  const supabase =
    source === "api_key" || source === "jwt"
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        )
      : await createServerClient()

  const body = await request.json()

  // Validate input
  const result = snippetSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors[0].message },
      { status: 400 }
    )
  }

  const { data: snippet, error } = await supabase
    .from("snippets")
    .insert({
      user_id: user.id,
      ...result.data,
      created_by: "manual",
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(snippet, { status: 201 })
}
