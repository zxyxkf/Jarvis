<script setup lang="ts">
import { ref } from 'vue'
import { useStreamChat } from '@/composables/useStreamChat'

const { messages, isStreaming, sendMessage, abort } = useStreamChat()
const inputText = ref('')
const selectedKB = ref<string | undefined>()

function handleSend() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return
  sendMessage(text, { knowledgeBaseId: selectedKB.value })
  inputText.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="chat-layout">
    <!-- Sidebar placeholder -->
    <aside class="chat-sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">Jarvis</h2>
      </div>
      <div class="sidebar-section">
        <p class="sidebar-label">知识库</p>
        <select v-model="selectedKB" class="kb-select">
          <option :value="undefined">通用对话</option>
          <option value="demo">Demo 知识库</option>
        </select>
      </div>
    </aside>

    <!-- Main chat area -->
    <main class="chat-main">
      <div v-if="messages.length === 0" class="chat-welcome">
        <h1 class="welcome-title">Jarvis</h1>
        <p class="welcome-sub">企业级 AI 智能助手</p>
      </div>

      <div class="chat-messages" v-if="messages.length > 0">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-row"
          :class="msg.role"
        >
          <div class="message-bubble">
            <div class="message-content" v-text="msg.content" />
            <div v-if="msg.citations?.length" class="message-citations">
              <span class="citations-label">📎 来源:</span>
              <span
                v-for="cite in msg.citations"
                :key="cite.chunkId"
                class="citation-badge"
                :title="cite.content"
              >
                {{ cite.documentName }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input-bar">
        <textarea
          v-model="inputText"
          class="chat-input"
          placeholder="输入问题..."
          :disabled="isStreaming"
          rows="1"
          @keydown="handleKeydown"
          @input="($event.target as HTMLTextAreaElement).style.height = 'auto'; ($event.target as HTMLTextAreaElement).style.height = ($event.target as HTMLTextAreaElement).scrollHeight + 'px'"
        />
        <button
          v-if="!isStreaming"
          class="send-btn"
          :disabled="!inputText.trim()"
          @click="handleSend"
        >
          发送
        </button>
        <button
          v-else
          class="stop-btn"
          @click="abort"
        >
          停止
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
}

.chat-sidebar {
  width: var(--sidebar-width);
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border-light);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  margin-bottom: var(--space-6);
}

.sidebar-title {
  font-size: var(--text-lg);
  font-weight: 700;
}

.sidebar-section {
  margin-bottom: var(--space-4);
}

.sidebar-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.kb-select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}

.welcome-title {
  font-size: 2.5rem;
  font-weight: 700;
}

.welcome-sub {
  color: var(--color-text-secondary);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6) var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.message-row {
  display: flex;
}

.message-row.user {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 70%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}

.message-row.user .message-bubble {
  background: var(--color-accent-muted);
  color: var(--color-text-primary);
  border-bottom-right-radius: var(--radius-sm);
}

.message-row.assistant .message-bubble {
  background: var(--color-bg-tertiary);
  border-bottom-left-radius: var(--radius-sm);
}

.message-citations {
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border-light);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  align-items: center;
}

.citations-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.citation-badge {
  font-size: var(--text-xs);
  padding: 2px var(--space-2);
  background: var(--color-bg-hover);
  border-radius: var(--radius-sm);
  cursor: help;
}

.chat-input-bar {
  padding: var(--space-4) var(--space-8);
  display: flex;
  gap: var(--space-3);
  border-top: 1px solid var(--color-border-light);
}

.chat-input {
  flex: 1;
  padding: var(--space-3);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  resize: none;
  max-height: 150px;
}

.chat-input:focus {
  border-color: var(--color-accent);
}

.send-btn, .stop-btn {
  padding: var(--space-2) var(--space-5);
  background: var(--color-accent);
  color: white;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: var(--text-sm);
  transition: background var(--duration-fast);
}

.send-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stop-btn {
  background: var(--color-danger);
}
</style>
