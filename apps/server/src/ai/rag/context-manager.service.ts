import { Injectable } from '@nestjs/common'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

@Injectable()
export class ContextManagerService {
  private readonly defaultMaxTokens = 8192

  /** Rough token estimation: ~0.5 chars per token for Chinese, ~4 for English */
  estimateTokens(text: string): number {
    let chinese = 0
    let other = 0
    for (const char of text) {
      if (/[一-鿿]/.test(char)) {
        chinese++
      } else {
        other++
      }
    }
    return Math.ceil(chinese / 0.7 + other / 3.5)
  }

  estimateTokensBatch(messages: ChatMessage[]): number {
    return messages.reduce((sum, m) => sum + this.estimateTokens(m.content), 0)
  }

  /** Sliding window: keep last N tokens worth of messages */
  slidingWindow(messages: ChatMessage[], maxTokens?: number): ChatMessage[] {
    const limit = maxTokens ?? this.defaultMaxTokens
    const result: ChatMessage[] = []
    let tokens = 0

    // Keep system message always
    const systemMsg = messages.find((m) => m.role === 'system')
    if (systemMsg) {
      result.push(systemMsg)
      tokens += this.estimateTokens(systemMsg.content)
    }

    // Add from newest to oldest, stop when hitting limit
    const nonSystem = messages.filter((m) => m.role !== 'system')
    for (let i = nonSystem.length - 1; i >= 0; i--) {
      const msg = nonSystem[i]!
      const msgTokens = this.estimateTokens(msg.content)
      if (tokens + msgTokens > limit) break
      tokens += msgTokens
      result.splice(systemMsg ? 1 : 0, 0, msg)
    }

    return result
  }

  /** Auto-compress: combine old messages into a summary */
  async compressHistory(
    messages: ChatMessage[],
    keepRecent: number,
    summaryProvider: (msgs: ChatMessage[]) => Promise<string>,
  ): Promise<ChatMessage[]> {
    if (messages.length <= keepRecent + 4) return messages

    const recent = messages.slice(-keepRecent)
    const old = messages.slice(0, -keepRecent)

    const summary = await summaryProvider(old)
    return [
      { role: 'system', content: `[对话历史摘要] ${summary}` },
      ...recent,
    ]
  }
}
