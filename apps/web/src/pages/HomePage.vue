<script setup lang="ts">
import { ref } from 'vue'
import { useStreamChat } from '@/composables/useStreamChat'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import UserMenu from '@/components/layout/UserMenu.vue'

const { messages, isStreaming, sendMessage, abort } = useStreamChat()
const inputText = ref('')
const selectedMode = ref('chat')

function handleSend(text: string) {
  if (!text.trim() || isStreaming.value) return
  sendMessage(text, { knowledgeBaseId: selectedMode.value === 'kb' ? 'demo' : undefined })
  inputText.value = ''
}
</script>

<template>
  <div class="layout">
    <!-- Horizontally resizable: sidebar | main -->
    <SplitterGroup direction="horizontal" class="splitter-root">
      <!-- Sidebar -->
      <SplitterPanel :default-size="16" :min-size="13" :max-size="25" class="sidebar-panel">
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="sidebar-brand">
              <div class="brand-icon">J</div>
              <div class="brand-text">
                <span class="brand-name">Jarvis</span>
                <span class="brand-ver">v0.3</span>
              </div>
            </div>
          </div>
          <div class="sidebar-content">
            <div class="sidebar-group">
              <div class="sidebar-group-label">导航</div>
              <div class="sidebar-menu">
                <RouterLink to="/" class="sidebar-menu-btn active">
                  <span class="menu-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
                  <span>对话</span>
                </RouterLink>
                <RouterLink to="/knowledge" class="sidebar-menu-btn">
                  <span class="menu-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></span>
                  <span>知识库</span>
                </RouterLink>
                <RouterLink to="/agents" class="sidebar-menu-btn">
                  <span class="menu-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span>
                  <span>Agent</span>
                </RouterLink>
              </div>
            </div>
          </div>
          <div class="sidebar-footer"><UserMenu /></div>
        </aside>
      </SplitterPanel>

      <SplitterResizeHandle class="resize-handle-h" />

      <!-- Main content: vertically resizable — messages | input -->
      <SplitterPanel :default-size="84" :min-size="75" :max-size="87" class="main-panel">
        <SplitterGroup direction="vertical" class="main-splitter">
          <!-- Messages -->
          <SplitterPanel :default-size="60" :min-size="30" :max-size="85">
            <div v-if="messages.length===0" class="messages-fill">
              <div class="welcome">
                <div class="welcome-logo"><span class="welcome-j">J</span></div>
                <h1 class="welcome-title">有什么我可以帮忙的？</h1>
                <p class="welcome-sub">企业级 AI 智能助手</p>
              </div>
            </div>
            <div v-else class="messages-fill">
              <div v-for="msg in messages" :key="msg.id" class="message-group">
                <div v-if="msg.role==='user'" class="msg-row user"><div class="msg-bubble user-bubble">{{ msg.content }}</div></div>
                <div v-else class="msg-row assistant">
                  <div class="msg-bubble assistant-bubble">
                    <span v-if="isStreaming&&!msg.content&&msg===messages[messages.length-1]" class="typing"><span class="dot" style="animation-delay:0ms"/><span class="dot" style="animation-delay:150ms"/><span class="dot" style="animation-delay:300ms"/></span>
                    <template v-else>{{ msg.content }}</template>
                  </div>
                  <div v-if="msg.citations?.length" class="citations">
                    <span class="citations-label">来源:</span>
                    <span v-for="cite in msg.citations" :key="cite.chunkId" class="cite-badge" :title="cite.content">{{ cite.documentName }}</span>
                  </div>
                </div>
              </div>
            </div>
          </SplitterPanel>

          <SplitterResizeHandle class="resize-handle-v" />

          <!-- Input -->
          <SplitterPanel :default-size="40" :min-size="15" :max-size="70">
            <div class="input-panel">
              <div class="input-wrapper">
                <textarea v-model="inputText" class="chat-input" placeholder="输入问题..." :disabled="isStreaming" @keydown="(e: KeyboardEvent)=>{if(e.key==='Enter'&&!e.shiftKey&&!isStreaming){e.preventDefault();handleSend(inputText)}}"/>
                <div class="input-actions">
                  <select v-model="selectedMode" class="mode-select">
                    <option value="chat">对话</option>
                    <option value="kb">知识库</option>
                  </select>
                  <button v-if="!isStreaming" class="send-btn" :disabled="!inputText.trim()" @click="handleSend(inputText)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                  </button>
                  <button v-else class="stop-btn" @click="abort()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </SplitterPanel>
        </SplitterGroup>
      </SplitterPanel>
    </SplitterGroup>
  </div>
</template>

<style scoped>
/* ── Layout ── */
.layout{width:100vw;height:100vh;background:var(--color-bg-primary);color:var(--color-text-primary);font-family:Inter,system-ui,sans-serif}
.splitter-root{width:100%;height:100%}
.main-splitter{width:100%;height:100%}

/* ── Resize handles ── */
.resize-handle-h{width:3px;background:var(--color-border);transition:background .2s;position:relative}
.resize-handle-h:hover,.resize-handle-h[data-resize-handle-active]{background:var(--color-accent)}
.resize-handle-h::after{content:'';position:absolute;inset:-4px}
.resize-handle-v{height:3px;background:var(--color-border);transition:background .2s;position:relative;display:flex;align-items:center;justify-content:center}
.resize-handle-v:hover,.resize-handle-v[data-resize-handle-active]{background:var(--color-accent)}
.resize-handle-v::after{content:'';position:absolute;inset:0 -4px}
.resize-handle-v:hover::before{content:'';width:36px;height:3px;border-radius:2px;background:var(--color-accent)}

/* ── Sidebar ── */
.sidebar-panel{overflow:hidden}
.sidebar{height:100%;display:flex;flex-direction:column;background:var(--color-bg-secondary)}
.sidebar-header{padding:16px;border-bottom:1px solid var(--color-border-light)}
.sidebar-brand{display:flex;align-items:center;gap:10px}
.brand-icon{width:32px;height:32px;border-radius:8px;background:var(--color-accent-muted);color:var(--color-accent);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;flex-shrink:0}
.brand-text{display:flex;flex-direction:column;gap:1px;min-width:0}
.brand-name{font-size:15px;font-weight:700;color:var(--color-text-primary)}
.brand-ver{font-size:11px;color:var(--color-text-muted)}
.sidebar-content{flex:1;overflow-y:auto;padding:12px}
.sidebar-group{margin-bottom:8px}
.sidebar-group-label{font-size:11px;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;padding:0 10px;margin-bottom:6px}
.sidebar-menu{display:flex;flex-direction:column;gap:2px}
.sidebar-menu-btn{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;font-size:13px;color:var(--color-text-secondary);text-decoration:none;transition:background .15s;cursor:pointer}
.sidebar-menu-btn:hover{background:var(--color-bg-hover)}
.sidebar-menu-btn.active{background:var(--color-accent-muted);color:var(--color-accent)}
.menu-icon{display:flex;align-items:center;opacity:.7;flex-shrink:0}
.sidebar-menu-btn.active .menu-icon{opacity:1}
.sidebar-footer{padding:12px 16px;border-top:1px solid var(--color-border-light);margin-top:auto}

/* ── Main ── */
.main-panel{overflow:hidden}
.messages-fill{height:100%;overflow-y:auto;padding:24px 32px 8px}
.welcome{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%}
.welcome-logo{width:64px;height:64px;background:var(--color-accent-muted);border:1px solid var(--color-accent);border-radius:20px;display:flex;align-items:center;justify-content:center;margin-bottom:24px}
.welcome-j{color:var(--color-accent);font-size:30px;font-weight:800}
.welcome-title{font-size:28px;font-weight:700;color:var(--color-text-primary);margin:0 0 8px}
.welcome-sub{color:var(--color-text-muted);font-size:15px;margin:0}
.message-group{margin-bottom:24px}
.msg-row{display:flex}
.msg-row.user{justify-content:flex-end}
.msg-row.assistant{justify-content:flex-start}
.msg-bubble{max-width:75%;padding:12px 16px;font-size:14px;line-height:1.7;white-space:pre-wrap;word-break:break-word}
.user-bubble{background:var(--color-accent-muted);color:var(--color-text-primary);border-radius:16px 16px 4px 16px}
.assistant-bubble{background:var(--color-bg-tertiary);color:var(--color-text-primary);border-radius:4px 16px 16px 16px}
.typing{display:flex;gap:3px;padding:4px 0}
.dot{width:6px;height:6px;border-radius:50%;background:var(--color-text-muted);animation:bounce 1s infinite}
.citations{margin-top:8px;padding-top:8px;border-top:1px solid var(--color-border-light);display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.citations-label{font-size:11px;color:var(--color-text-muted)}
.cite-badge{font-size:11px;padding:2px 8px;background:var(--color-bg-hover);border-radius:6px;color:var(--color-text-secondary);cursor:help}

/* ── Input ── */
.input-panel{height:100%;display:flex;padding:12px 24px 20px;border-top:1px solid var(--color-border-light);background:var(--color-bg-primary);overflow:hidden}
.input-wrapper{flex:1;display:flex;flex-direction:column;background:var(--color-bg-tertiary);border:1px solid var(--color-border);border-radius:16px;padding:12px 14px 10px 18px;transition:border-color .2s;min-height:0}
.input-wrapper:focus-within{border-color:var(--color-accent);box-shadow:0 2px 16px rgba(16,163,127,.1)}
.chat-input{flex:1;background:transparent;border:none;font-size:15px;color:var(--color-text-primary);outline:none;resize:none;line-height:1.55;font-family:inherit;min-height:0}
.chat-input::placeholder{color:var(--color-text-muted);opacity:.6}
.chat-input:disabled{opacity:.5}
.input-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid var(--color-border-light)}
.mode-select{padding:5px 10px;background:var(--color-bg-hover);border:1px solid var(--color-border);border-radius:8px;font-size:11px;color:var(--color-text-secondary);outline:none;cursor:pointer;font-family:inherit;transition:border-color .15s}
.mode-select:focus{border-color:var(--color-accent)}
.send-btn{width:36px;height:36px;flex-shrink:0;background:var(--color-accent);border:none;border-radius:9px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.send-btn:hover:not(:disabled){background:var(--color-accent-hover)}
.send-btn:disabled{opacity:.3;cursor:not-allowed}
.stop-btn{width:36px;height:36px;flex-shrink:0;background:#ef4444;border:none;border-radius:9px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.stop-btn:hover{background:#dc2626}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
</style>
