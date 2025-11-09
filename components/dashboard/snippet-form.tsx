"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"
import { SnippetFormData } from "@/lib/types/snippet"

type SnippetFormProps = {
  initialData?: SnippetFormData
  onSubmit: (data: SnippetFormData) => Promise<{ error?: string }>
  submitLabel?: string
}

const COMMON_LANGUAGES = [
  "javascript", "typescript", "python", "bash", "sql", "go", "rust",
  "java", "csharp", "php", "ruby", "html", "css", "json", "yaml", "markdown"
]

export function SnippetForm({ initialData, onSubmit, submitLabel = "Create Snippet" }: SnippetFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [tagInput, setTagInput] = useState("")
  const [commonMistakes, setCommonMistakes] = useState<string[]>(
    initialData?.context?.common_mistakes || []
  )
  const [mistakeInput, setMistakeInput] = useState("")
  const [prerequisites, setPrerequisites] = useState<string[]>(
    initialData?.context?.prerequisites || []
  )
  const [prerequisiteInput, setPrerequisiteInput] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      code: formData.get("code") as string,
      language: formData.get("language") as string,
      category: formData.get("category") as string,
      tags,
      context: {
        when_to_use: formData.get("when_to_use") as string,
        common_mistakes: commonMistakes,
        prerequisites: prerequisites,
      },
    }

    const result = await onSubmit(data)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const addMistake = () => {
    if (mistakeInput.trim() && !commonMistakes.includes(mistakeInput.trim())) {
      setCommonMistakes([...commonMistakes, mistakeInput.trim()])
      setMistakeInput("")
    }
  }

  const removeMistake = (mistake: string) => {
    setCommonMistakes(commonMistakes.filter(m => m !== mistake))
  }

  const addPrerequisite = () => {
    if (prerequisiteInput.trim() && !prerequisites.includes(prerequisiteInput.trim())) {
      setPrerequisites([...prerequisites, prerequisiteInput.trim()])
      setPrerequisiteInput("")
    }
  }

  const removePrerequisite = (prerequisite: string) => {
    setPrerequisites(prerequisites.filter(p => p !== prerequisite))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            The essential details about your snippet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Salesforce Production Deploy"
              defaultValue={initialData?.title}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Brief description of what this snippet does"
              rows={2}
              defaultValue={initialData?.description}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language *</Label>
              <select
                id="language"
                name="language"
                defaultValue={initialData?.language || ""}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select language...</option>
                {COMMON_LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                placeholder="e.g., deployment, authentication"
                defaultValue={initialData?.category}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Add tags..."
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Textarea
              id="code"
              name="code"
              placeholder="Paste your code here..."
              rows={10}
              defaultValue={initialData?.code}
              required
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Context (Helps Claude Learn)</CardTitle>
          <CardDescription>
            Add context to help Claude Code understand when and how to use this snippet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="when_to_use">When to use this</Label>
            <Input
              id="when_to_use"
              name="when_to_use"
              placeholder="e.g., For production deployments with JWT auth"
              defaultValue={initialData?.context?.when_to_use}
            />
          </div>

          <div className="space-y-2">
            <Label>Common mistakes to avoid</Label>
            <div className="flex gap-2">
              <Input
                value={mistakeInput}
                onChange={(e) => setMistakeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addMistake()
                  }
                }}
                placeholder="Add a common mistake..."
              />
              <Button type="button" onClick={addMistake} variant="outline">
                Add
              </Button>
            </div>
            {commonMistakes.length > 0 && (
              <ul className="space-y-2 mt-2">
                {commonMistakes.map((mistake, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 p-2 bg-muted rounded">❌ {mistake}</span>
                    <Button
                      type="button"
                      onClick={() => removeMistake(mistake)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label>Prerequisites</Label>
            <div className="flex gap-2">
              <Input
                value={prerequisiteInput}
                onChange={(e) => setPrerequisiteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addPrerequisite()
                  }
                }}
                placeholder="Add a prerequisite..."
              />
              <Button type="button" onClick={addPrerequisite} variant="outline">
                Add
              </Button>
            </div>
            {prerequisites.length > 0 && (
              <ul className="space-y-2 mt-2">
                {prerequisites.map((prerequisite, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 p-2 bg-muted rounded">✓ {prerequisite}</span>
                    <Button
                      type="button"
                      onClick={() => removePrerequisite(prerequisite)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}
