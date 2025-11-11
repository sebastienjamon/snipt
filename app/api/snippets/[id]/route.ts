import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { snippetSchema } from "@/lib/validations/snippet"
import { getUserFromRequest } from "@/lib/auth/api-key"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const { data: snippet, error } = await supabase
    .from("snippets")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()

  if (error || !snippet) {
    return NextResponse.json({ error: "Snippet not found" }, { status: 404 })
  }

  return NextResponse.json(snippet)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    .update(result.data)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!snippet) {
    return NextResponse.json({ error: "Snippet not found" }, { status: 404 })
  }

  return NextResponse.json(snippet)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const { error } = await supabase
    .from("snippets")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
