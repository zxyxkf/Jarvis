import { z } from 'zod'

// === 知识库 ===

export const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export const updateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
})

// === 对话 ===

export const chatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  content: z.string().min(1).max(10000),
  knowledgeBaseId: z.string().uuid().optional(),
  model: z.string().optional(),
})

// === 分页 ===

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateKnowledgeBaseInput = z.infer<typeof createKnowledgeBaseSchema>
export type UpdateKnowledgeBaseInput = z.infer<typeof updateKnowledgeBaseSchema>
export type ChatRequestInput = z.infer<typeof chatRequestSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
