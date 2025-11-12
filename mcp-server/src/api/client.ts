import fetch from "node-fetch"
import type {
  Snippet,
  SnippetSearchParams,
  SnippetCreateParams,
  SnippetUpdateParams,
  ApiError,
} from "../types/index.js"

export class SniptApiClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl: string = "https://snipt.app") {
    this.apiKey = apiKey
    this.baseUrl = baseUrl.replace(/\/$/, "") // Remove trailing slash
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string
      body?: unknown
      params?: Record<string, string>
    } = {}
  ): Promise<T> {
    const { method = "GET", body, params } = options

    // Build URL with query parameters
    const url = new URL(`${this.baseUrl}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    }

    // Debug logging
    console.log(`API Request: ${method} ${url.toString()}`)
    console.log(`Token: ${this.apiKey.substring(0, 10)}...${this.apiKey.substring(this.apiKey.length - 10)}`)

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    console.log(`API Response: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`
      try {
        const error = (await response.json()) as ApiError
        errorMsg = error.error || errorMsg
        console.log(`API Error: ${JSON.stringify(error)}`)
      } catch (e) {
        const text = await response.text()
        console.log(`API Error (text): ${text}`)
        errorMsg = text || errorMsg
      }
      throw new Error(errorMsg)
    }

    return (await response.json()) as T
  }

  async searchSnippets(params: SnippetSearchParams): Promise<Snippet[]> {
    const queryParams: Record<string, string> = {}

    if (params.query) queryParams.query = params.query
    if (params.language) queryParams.language = params.language
    if (params.category) queryParams.category = params.category
    if (params.limit) queryParams.limit = params.limit.toString()
    if (params.tags && params.tags.length > 0) {
      queryParams.tags = params.tags.join(",")
    }

    return this.request<Snippet[]>("/api/snippets", {
      params: queryParams,
    })
  }

  async getSnippet(id: string): Promise<Snippet> {
    return this.request<Snippet>(`/api/snippets/${id}`)
  }

  async createSnippet(data: SnippetCreateParams): Promise<Snippet> {
    return this.request<Snippet>("/api/snippets", {
      method: "POST",
      body: data,
    })
  }

  async updateSnippet(
    id: string,
    data: SnippetUpdateParams
  ): Promise<Snippet> {
    return this.request<Snippet>(`/api/snippets/${id}`, {
      method: "PATCH",
      body: data,
    })
  }
}
