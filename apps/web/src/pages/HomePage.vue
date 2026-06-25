<script setup lang="ts">
import { ref } from 'vue'
import { useStreamChat } from '@/composables/useStreamChat'
import ChatBubble from '@/components/chat/ChatBubble.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import ChatSources from '@/components/chat/ChatSources.vue'

const { messages, isStreaming, sendMessage, abort } = useStreamChat()
const selectedKB = ref<string | undefined>()

function handleSend(text: string) {
  sendMessage(text, { knowledgeBaseId: selectedKB.value })
}

function handleStop() {
  abort()
}
</script>

<template>
  <div class="flex h-screen bg-[var(--color-bg-primary)]">
    <!-- Sidebar -->
    <aside class="w-[260px] shrink-0 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-light)] p-4 flex flex-col">
      <div class="mb-6">
        <h2 class="text-lg font-bold text-[var(--color-text-primary)]">Jarvis</h2>
      </div>
      <div class="mb-4">
        <label class="block text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">知识库</label>
        <select
          v-model="selectedKB"
          class="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors"
        >
          <option :value="undefined">通用对话</option>
          <option value="demo">Demo 知识库</option>
        </select>
      </div>
      <div class="flex-1" />
      <div class="text-[10px] text-[var(--color-text-muted)]">
        Phase 3 — v0.3
      </div>
    </aside>

    <!-- Main Chat -->
    <main class="flex-1 flex flex-col min-w-0">
      <!-- Welcome -->
      <div v-if="messages.length === 0" class="flex-1 flex flex-col items-center justify-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-2">
          <span class="text-emerald-400 text-xl font-bold">J</span>
        </div>
        <h1 class="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Jarvis</h1>
        <p class="text-[var(--color-text-secondary)] text-sm">企业级 AI 智能助手</p>
      </div>

      <!-- Messages -->
      <div v-else class="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        <div v-for="msg in messages" :key="msg.id" class="space-y-3">
          <ChatBubble
            :role="msg.role as 'user' | 'assistant'"
            :content="msg.content"
            :is-loading="isStreaming && msg.role === 'assistant' && !msg.content && msg === messages[messages.length - 1]"
          />
          <ChatSources
            v-if="msg.citations?.length"
            :citations="msg.citations"
          />
        </div>
      </div>

      <!-- Input -->
      <ChatInput
        :disabled="isStreaming"
        @send="handleSend"
        @stop="handleStop"
      />
    </main>
  </div>
</template>
