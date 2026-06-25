// === 知识库/文档类型 ===

export type DocStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface KnowledgeBase {
  id: string
  name: string
  description?: string
  documentCount: number
  createdAt: string
  updatedAt: string
}

export interface Document {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  status: DocStatus
  errorMessage?: string
  knowledgeBaseId: string
  chunkCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateKnowledgeBaseRequest {
  name: string
  description?: string
}

export interface UpdateKnowledgeBaseRequest {
  name?: string
  description?: string
}
