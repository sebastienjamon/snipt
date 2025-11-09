export interface Snippet {
  id: string
  title: string
  description: string | null
  code: string
  language: string
  category: string | null
  tags: string[]
  context: {
    when_to_use?: string | null
    common_mistakes?: string[]
    prerequisites?: string[]
  } | null
  usage_count: number
  user_id: string
  created_at: string
  updated_at: string
}

export interface SnippetSearchParams {
  query?: string
  tags?: string[]
  language?: string
  category?: string
  limit?: number
}

export interface SnippetCreateParams {
  title: string
  description?: string
  code: string
  language: string
  category?: string
  tags?: string[]
  context?: {
    when_to_use?: string
    common_mistakes?: string[]
    prerequisites?: string[]
  }
}

export interface SnippetUpdateParams {
  title?: string
  description?: string
  code?: string
  language?: string
  category?: string
  tags?: string[]
  context?: {
    when_to_use?: string
    common_mistakes?: string[]
    prerequisites?: string[]
  }
}

export interface ApiError {
  error: string
}
