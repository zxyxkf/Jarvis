import { ref } from 'vue'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  citations?: Citation[]
  timestamp: number
}

export interface Citation {
  chunkId: string
  documentName: string
  content: string
  score: number
}

export function useStreamChat() {
  const messages = ref<ChatMessage[]>([])
  const isStreaming = ref(false)
  const abortController = ref<AbortController | null>(null)

  function addUserMessage(content: string) {
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    })
  }

  function addAssistantPlaceholder() {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }
    messages.value.push(msg)
    return msg.id
  }

  async function sendMessage(
    content: string,
    options?: { knowledgeBaseId?: string; conversationId?: string },
  ) {
    addUserMessage(content)
    const assistantId = addAssistantPlaceholder()
    isStreaming.value = true

    const controller = new AbortController()
    abortController.value = controller

    try {
      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          knowledgeBaseId: options?.knowledgeBaseId,
          conversationId: options?.conversationId,
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))
              const msg = messages.value.find((m) => m.id === assistantId)
              if (!msg) continue

              if (event.type === 'token') {
                msg.content += event.data as string
              } else if (event.type === 'citations') {
                msg.citations = event.data as Citation[]
              } else if (event.type === 'error') {
                msg.content = `[错误] ${event.data}`
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const msg = messages.value.find((m) => m.id === assistantId)
        if (msg && !msg.content) {
          msg.content = '[请求失败，请重试]'
        }
      }
    } finally {
      isStreaming.value = false
    }
  }

  function abort() {
    abortController.value?.abort()
  }

  function clear() {
    messages.value = []
  }

  return { messages, isStreaming, sendMessage, abort, clear }
}
