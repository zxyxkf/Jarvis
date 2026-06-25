import { Injectable, Logger } from '@nestjs/common'
import type { IModelProvider, ChatMessage, ChatOptions, ChatResponse } from '../interfaces'

interface ProviderConfig {
  name: string
  apiKey: string
  baseUrl: string
  defaultModel: string
}

@Injectable()
export class ModelGateway {
  private readonly logger = new Logger(ModelGateway.name)
  private readonly providers: Map<string, ProviderConfig>
  private readonly fallbackOrder: string[]

  constructor() {
    this.providers = new Map()
    this.fallbackOrder = ['deepseek', 'qwen', 'openai']

    // DeepSeek
    if (process.env.DEEPSEEK_API_KEY) {
      this.providers.set('deepseek', {
        name: 'deepseek',
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseUrl: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
      })
    }
    // Qwen
    if (process.env.QWEN_API_KEY) {
      this.providers.set('qwen', {
        name: 'qwen',
        apiKey: process.env.QWEN_API_KEY,
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        defaultModel: 'qwen-turbo',
      })
    }
    // OpenAI (fallback)
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
      })
    }
  }

  /** Resolve a provider by name, with fallback chain */
  resolveProvider(preferred?: string): { config: ProviderConfig; providerName: string } {
    if (preferred && this.providers.has(preferred)) {
      return { config: this.providers.get(preferred)!, providerName: preferred }
    }
    for (const name of this.fallbackOrder) {
      if (this.providers.has(name)) {
        return { config: this.providers.get(name)!, providerName: name }
      }
    }
    throw new Error('No LLM provider configured. Set DEEPSEEK_API_KEY or QWEN_API_KEY.')
  }

  /** Get all available provider names */
  availableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /** Simple prompt classification: lightweight vs heavy */
  classifyComplexity(messages: ChatMessage[]): 'simple' | 'complex' {
    const content = messages.map((m) => m.content).join(' ')
    // Heuristic: long content + multi-turn → complex
    if (content.length > 2000 || messages.length > 4) return 'complex'
    return 'simple'
  }

  /** Stream chat with automatic fallback */
  async *streamChat(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncGenerator<{ token: string; modelName: string }> {
    let lastError: Error | null = null

    for (const providerName of this.fallbackOrder) {
      const config = this.providers.get(providerName)
      if (!config) continue

      try {
        const model = options?.model || config.defaultModel
        this.logger.log(`Streaming with ${providerName}/${model}`)

        const response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            stream: true,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 2048,
          }),
        })

        if (!response.ok) {
          const errText = await response.text()
          this.logger.warn(`${providerName} returned ${response.status}: ${errText}`)
          lastError = new Error(`${providerName}: ${response.status}`)
          continue
        }

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') return
              try {
                const parsed = JSON.parse(data)
                const token = parsed.choices?.[0]?.delta?.content
                if (token) {
                  yield { token, modelName: `${providerName}/${model}` }
                }
              } catch {
                // Skip malformed SSE chunks
              }
            }
          }
        }
        return // Success — exit fallback loop
      } catch (err) {
        this.logger.warn(`${providerName} stream error:`, err)
        lastError = err as Error
      }
    }

    // All providers failed
    throw lastError || new Error('All LLM providers failed')
  }
}
