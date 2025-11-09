"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { SnippetForm } from "@/components/dashboard/snippet-form"
import { Button } from "@/components/ui/button"
import { Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Snippet, SnippetFormData } from "@/lib/types/snippet"

export default function EditSnippetPage() {
  const router = useRouter()
  const params = useParams()
  const [snippet, setSnippet] = useState<Snippet | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function fetchSnippet() {
      const response = await fetch(`/api/snippets/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setSnippet(data)
      }
      setLoading(false)
    }
    fetchSnippet()
  }, [params.id])

  async function handleSubmit(data: SnippetFormData) {
    const response = await fetch(`/api/snippets/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || "Failed to update snippet" }
    }

    router.push("/dashboard/snippets")
    router.refresh()

    return {}
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this snippet? This action cannot be undone.")) {
      return
    }

    setDeleting(true)

    const response = await fetch(`/api/snippets/${params.id}`, {
      method: "DELETE",
    })

    if (response.ok) {
      router.push("/dashboard/snippets")
      router.refresh()
    } else {
      alert("Failed to delete snippet")
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading snippet...</p>
      </div>
    )
  }

  if (!snippet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-muted-foreground">Snippet not found</p>
        <Link href="/dashboard/snippets">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Snippets
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Snippet</h2>
          <p className="text-muted-foreground">
            Update your snippet details and context
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </div>

      <SnippetForm
        initialData={{
          title: snippet.title,
          description: snippet.description || undefined,
          code: snippet.code,
          language: snippet.language,
          tags: snippet.tags,
          category: snippet.category || undefined,
          context: snippet.context,
        }}
        onSubmit={handleSubmit}
        submitLabel="Update Snippet"
      />
    </div>
  )
}
