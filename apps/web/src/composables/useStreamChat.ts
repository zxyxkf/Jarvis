import { ref } from 'vue'
import type { Citation } from '@jarvis/shared'
import { useAuthStore } from '@/stores/auth'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  citations?: Citation[]
  timestamp: number
}

export interface ConversationSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ConversationDetail extends ConversationSummary {
  messages: Array<{
    id: string
    role: ChatMessage['role']
    content: string
    citations?: Citation[]
    createdAt: string
  }>
}

export type { Citation }

export function useStreamChat() {
  const messages = ref<ChatMessage[]>([])
  const conversations = ref<ConversationSummary[]>([])
  const currentConversationId = ref<string | null>(null)
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
    const conversationId = options?.conversationId ?? currentConversationId.value ?? undefined
    addUserMessage(content)
    const assistantId = addAssistantPlaceholder()
    isStreaming.value = true

    const controller = new AbortController()
    abortController.value = controller

    try {
      const authStore = useAuthStore()
      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authStore.getAuthHeaders(),
        },
          body: JSON.stringify({
            content,
            knowledgeBaseId: options?.knowledgeBaseId,
            conversationId,
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

              if (event.type === 'conversation') {
                const data = event.data as { conversationId?: string }
                if (data.conversationId) currentConversationId.value = data.conversationId
              } else if (event.type === 'token') {
                msg.content += event.data as string
              } else if (event.type === 'citations') {
                msg.citations = event.data as Citation[]
              } else if (event.type === 'done') {
                const data = event.data as { conversationId?: string }
                if (data.conversationId) currentConversationId.value = data.conversationId
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
      await fetchConversations()
    }
  }

  async function fetchConversations() {
    const authStore = useAuthStore()
    const res = await fetch('/api/v1/chat/conversations', { headers: authStore.getAuthHeaders() })
    const body = await res.json()
    conversations.value = (body.data as ConversationSummary[]) ?? []
  }

  async function loadConversation(conversationId: string) {
    if (isStreaming.value) return
    const authStore = useAuthStore()
    const res = await fetch(`/api/v1/chat/conversations/${conversationId}`, { headers: authStore.getAuthHeaders() })
    const body = await res.json()
    const conversation = body.data as ConversationDetail | null
    if (!conversation) return
    currentConversationId.value = conversation.id
    messages.value = conversation.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      citations: msg.citations,
      timestamp: new Date(msg.createdAt).getTime(),
    }))
  }

  function startNewConversation() {
    if (isStreaming.value) return
    currentConversationId.value = null
    clear()
  }

  async function renameConversation(conversationId: string, title: string) {
    const authStore = useAuthStore()
    const res = await fetch(`/api/v1/chat/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authStore.getAuthHeaders() },
      body: JSON.stringify({ title }),
    })
    const body = await res.json()
    if (body.code === 0) await fetchConversations()
    return body
  }

  async function deleteConversation(conversationId: string) {
    if (isStreaming.value) return
    const authStore = useAuthStore()
    await fetch(`/api/v1/chat/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: authStore.getAuthHeaders(),
    })
    if (currentConversationId.value === conversationId) {
      currentConversationId.value = null
      clear()
    }
    await fetchConversations()
  }

  function abort() {
    abortController.value?.abort()
  }

  function clear() {
    messages.value = []
  }

  return {
    messages, conversations, currentConversationId, isStreaming,
    sendMessage, fetchConversations, loadConversation, startNewConversation,
    renameConversation, deleteConversation, abort, clear,
  }
}
