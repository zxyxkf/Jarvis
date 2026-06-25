<script setup lang="ts">
import { ref } from 'vue'
import { useStreamChat } from '@/composables/useStreamChat'
import { useThemeStore, type ThemePreset } from '@/stores/theme'

const theme = useThemeStore()
const { messages, isStreaming, sendMessage, abort } = useStreamChat()
const selectedKB = ref<string | undefined>()
const inputText = ref('')

function handleSend(text: string) {
  if (!text.trim() || isStreaming.value) return
  sendMessage(text, { knowledgeBaseId: selectedKB.value })
  inputText.value = ''
}
</script>

<template>
  <div class="home-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <h2 class="sidebar-title">Jarvis</h2>

      <nav class="nav">
        <RouterLink to="/" class="nav-link active">💬 对话</RouterLink>
        <RouterLink to="/knowledge" class="nav-link">📚 知识库</RouterLink>
        <RouterLink to="/agents" class="nav-link">⚡ Agent</RouterLink>
        <RouterLink to="/settings" class="nav-link">⚙️ 设置</RouterLink>
      </nav>

      <div class="sidebar-section">
        <label class="sidebar-label">知识库</label>
        <select v-model="selectedKB" class="select">
          <option :value="undefined">通用对话</option>
          <option value="demo">Demo 知识库</option>
        </select>
      </div>

      <div class="sidebar-section">
        <label class="sidebar-label">主题</label>
        <select :value="theme.active" @change="theme.switchTo(($event.target as HTMLSelectElement).value as ThemePreset)" class="select">
          <option value="chatgpt-dark">暗色</option>
          <option value="notion-light">极简白</option>
        </select>
      </div>

      <div class="flex-1" />
      <p class="version">Jarvis v0.3</p>
    </aside>

    <!-- Main -->
    <main class="main">
      <!-- Welcome -->
      <div v-if="messages.length === 0" class="welcome">
        <div class="welcome-logo">
          <span class="welcome-j">J</span>
        </div>
        <h1 class="welcome-title">Jarvis</h1>
        <p class="welcome-sub">企业级 AI 智能助手</p>
      </div>

      <!-- Messages -->
      <div v-else class="messages">
        <div v-for="msg in messages" :key="msg.id" class="message-group">
          <div v-if="msg.role === 'user'" class="msg-row user">
            <div class="msg-bubble user-bubble">{{ msg.content }}</div>
          </div>
          <div v-else class="msg-row assistant">
            <div class="msg-bubble assistant-bubble">
              <span v-if="isStreaming && !msg.content && msg === messages[messages.length - 1]" class="typing">
                <span class="dot" style="animation-delay:0ms" />
                <span class="dot" style="animation-delay:150ms" />
                <span class="dot" style="animation-delay:300ms" />
              </span>
              <template v-else>{{ msg.content }}</template>
            </div>
            <div v-if="msg.citations?.length" class="citations">
              <span class="citations-label">📎 来源:</span>
              <span v-for="cite in msg.citations" :key="cite.chunkId" class="cite-badge" :title="cite.content">
                {{ cite.documentName }} {{ (cite.score * 100).toFixed(0) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="input-bar">
        <div class="input-wrapper">
          <textarea
            v-model="inputText"
            class="chat-input"
            placeholder="输入问题..."
            rows="1"
            :disabled="isStreaming"
            @keydown="(e: KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey && !isStreaming) { e.preventDefault(); handleSend(inputText) } }"
            @input="($el.target as HTMLTextAreaElement).style.height = 'auto'; ($el.target as HTMLTextAreaElement).style.height = Math.min($el.target.scrollHeight, 150) + 'px'"
          />
          <button v-if="!isStreaming" class="send-btn" :disabled="!inputText.trim()" @click="handleSend(inputText)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          </button>
          <button v-else class="stop-btn" @click="abort()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
          </button>
        </div>
        <p class="input-hint">Enter 发送 · Shift+Enter 换行</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.home-layout { display:flex; width:100vw; height:100vh; background:var(--color-bg-primary); color:var(--color-text-primary); font-family:Inter,system-ui,sans-serif }
.sidebar { width:260px; flex-shrink:0; background:var(--color-bg-secondary); border-right:1px solid var(--color-border-light); padding:16px; display:flex; flex-direction:column }
.sidebar-title { font-size:18px; font-weight:700; margin:0 0 20px; color:var(--color-text-primary) }
.nav { display:flex; flex-direction:column; gap:4px; margin-bottom:20px }
.nav-link { padding:8px 12px; border-radius:8px; font-size:14px; color:var(--color-text-secondary); text-decoration:none; transition:background .15s }
.nav-link:hover { background:var(--color-bg-hover) }
.nav-link.active, .router-link-active.router-link-exact-active { background:var(--color-accent-muted); color:var(--color-accent) }
.sidebar-section { margin-bottom:16px }
.sidebar-label { font-size:11px; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.05em; display:block; margin-bottom:6px }
.select { width:100%; padding:8px 12px; background:var(--color-bg-tertiary); border:1px solid var(--color-border); border-radius:8px; font-size:13px; color:var(--color-text-primary); outline:none }
.flex-1 { flex:1 }
.version { font-size:10px; color:var(--color-text-muted); opacity:.5 }
.main { flex:1; display:flex; flex-direction:column; min-width:0 }
.welcome { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center }
.welcome-logo { width:64px; height:64px; background:var(--color-accent-muted); border:1px solid var(--color-accent); border-radius:20px; display:flex; align-items:center; justify-content:center; margin-bottom:20px }
.welcome-j { color:var(--color-accent); font-size:30px; font-weight:800 }
.welcome-title { font-size:32px; font-weight:700; color:var(--color-text-primary); margin:0 0 8px }
.welcome-sub { color:var(--color-text-muted); font-size:15px; margin:0 }
.messages { flex:1; overflow-y:auto; padding:24px 32px }
.message-group { margin-bottom:24px }
.msg-row { display:flex }
.msg-row.user { justify-content:flex-end }
.msg-row.assistant { justify-content:flex-start }
.msg-bubble { max-width:75%; padding:12px 16px; font-size:14px; line-height:1.7; white-space:pre-wrap; word-break:break-word }
.user-bubble { background:var(--color-accent-muted); color:var(--color-text-primary); border-radius:16px 16px 4px 16px }
.assistant-bubble { background:var(--color-bg-tertiary); color:var(--color-text-primary); border-radius:4px 16px 16px 16px }
.typing { display:flex; gap:3px; padding:4px 0 }
.dot { width:6px; height:6px; border-radius:50%; background:var(--color-text-muted); animation:bounce 1s infinite }
.citations { margin-top:8px; padding-top:8px; border-top:1px solid var(--color-border-light); display:flex; flex-wrap:wrap; gap:6px; align-items:center }
.citations-label { font-size:11px; color:var(--color-text-muted) }
.cite-badge { font-size:11px; padding:2px 8px; background:var(--color-bg-hover); border-radius:6px; color:var(--color-text-secondary); cursor:help }
.input-bar { padding:0 32px 20px; display:flex; flex-direction:column; align-items:center }
.input-wrapper { width:100%; max-width:760px; display:flex; gap:0; background:var(--color-bg-tertiary); border:1px solid var(--color-border); border-radius:16px; padding:6px 6px 6px 16px; transition:border-color .2s; box-shadow:0 2px 8px rgba(0,0,0,.15) }
.input-wrapper:focus-within { border-color:var(--color-accent); box-shadow:0 2px 16px rgba(16,163,127,.1) }
.chat-input { flex:1; background:transparent; border:none; padding:8px 0; font-size:14px; color:var(--color-text-primary); outline:none; resize:none; max-height:150px; line-height:1.5; font-family:inherit }
.chat-input::placeholder { color:var(--color-text-muted); opacity:.7 }
.chat-input:disabled { opacity:.5 }
.send-btn { width:38px; height:38px; flex-shrink:0; background:var(--color-accent); border:none; border-radius:10px; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; margin-left:8px }
.send-btn:hover:not(:disabled) { background:var(--color-accent-hover); transform:scale(1.05) }
.send-btn:disabled { opacity:.3; cursor:not-allowed; transform:none }
.stop-btn { width:38px; height:38px; flex-shrink:0; background:#ef4444; border:none; border-radius:10px; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; margin-left:8px }
.stop-btn:hover { background:#dc2626 }
.input-hint { font-size:11px; color:var(--color-text-muted); opacity:.5; margin-top:8px; text-align:center }
@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
</style>
