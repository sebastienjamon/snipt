import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"

// Generate a secure random API key
function generateApiKey(): string {
  const prefix = "snip"
  const random = randomBytes(32).toString("base64url")
  return `${prefix}_${random}`
}

// GET /api/keys - List user's API keys
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, created_at, last_used_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(keys)
}

// POST /api/keys - Create new API key
export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name } = body

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "API key name is required" },
      { status: 400 }
    )
  }

  // Generate the key
  const apiKey = generateApiKey()
  const keyPrefix = apiKey.substring(0, 12) // Show first 12 chars (snip_xxxxx)

  // Hash the key before storing
  const keyHash = await bcrypt.hash(apiKey, 10)

  // Store in database
  const { data: newKey, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: user.id,
      name: name.trim(),
      key_hash: keyHash,
      key_prefix: keyPrefix,
    })
    .select("id, name, key_prefix, created_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return the full key ONLY this one time!
  // It will never be shown again for security
  return NextResponse.json(
    {
      ...newKey,
      key: apiKey, // Full key returned only once
    },
    { status: 201 }
  )
}
