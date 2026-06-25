// === 对话/消息类型 ===

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  tokenCount?: number
  modelName?: string
  citations?: Citation[]
  createdAt: string
}

export interface Citation {
  chunkId: string
  documentName: string
  content: string
  score: number
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

// === SSE 流式响应类型 ===

export interface SSETokenEvent {
  type: 'token'
  content: string
}

export interface SSECitationEvent {
  type: 'citation'
  citations: Citation[]
}

export interface SSEErrorEvent {
  type: 'error'
  message: string
}

export interface SSEDoneEvent {
  type: 'done'
  tokenCount: number
  modelName: string
}

export type SSEEvent = SSETokenEvent | SSECitationEvent | SSEErrorEvent | SSEDoneEvent

// === 对话请求 ===

export interface ChatRequest {
  conversationId?: string
  content: string
  knowledgeBaseId?: string
  model?: string
}

export interface ChatResponseChunk {
  content: string
  isComplete: boolean
}
