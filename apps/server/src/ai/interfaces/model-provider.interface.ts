export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface ChatResponse {
  content: string
  tokenCount: number
  modelName: string
}

export interface IModelProvider {
  readonly name: string
  readonly defaultModel: string
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>
  streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string>
}

export const MODEL_PROVIDER = Symbol('IModelProvider')
