"use client"

import { useRouter } from "next/navigation"
import { SnippetForm } from "@/components/dashboard/snippet-form"
import { SnippetFormData } from "@/lib/types/snippet"

export default function NewSnippetPage() {
  const router = useRouter()

  async function handleSubmit(data: SnippetFormData) {
    const response = await fetch("/api/snippets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || "Failed to create snippet" }
    }

    const snippet = await response.json()
    router.push(`/dashboard/snippets/${snippet.id}`)
    router.refresh()

    return {}
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create Snippet</h2>
        <p className="text-muted-foreground">
          Add a new code snippet to your vault
        </p>
      </div>

      <SnippetForm onSubmit={handleSubmit} submitLabel="Create Snippet" />
    </div>
  )
}
