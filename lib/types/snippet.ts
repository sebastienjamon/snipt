export type Snippet = {
  id: string
  user_id: string
  team_id?: string | null
  title: string
  description?: string | null
  code: string
  language: string
  tags: string[]
  category?: string | null
  context?: {
    when_to_use?: string
    common_mistakes?: string[]
    prerequisites?: string[]
    troubleshooting?: Record<string, string>
  }
  usage_count: number
  success_count: number
  failure_count: number
  last_used_at?: string | null
  version: number
  parent_id?: string | null
  created_at: string
  updated_at: string
  created_by: string
}

export type SnippetFormData = {
  title: string
  description?: string
  code: string
  language: string
  category?: string
  tags: string[]
  context?: {
    when_to_use?: string
    common_mistakes?: string[]
    prerequisites?: string[]
  }
}
