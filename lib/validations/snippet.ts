import { z } from "zod"

export const snippetSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  code: z.string().min(1, "Code is required"),
  language: z.string().min(1, "Language is required"),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  context: z.object({
    when_to_use: z.string().optional(),
    common_mistakes: z.array(z.string()).optional(),
    prerequisites: z.array(z.string()).optional(),
    troubleshooting: z.record(z.string()).optional(),
  }).optional(),
})

export type SnippetInput = z.infer<typeof snippetSchema>
