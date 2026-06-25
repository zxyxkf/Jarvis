<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()

const versions = [
  { version: 'V0.3.0', date: '2026-06-25', changes: 'Chat UI 重构、可拖拽输入区、用户菜单、主题系统' },
  { version: 'V0.2.0', date: '2026-06-25', changes: 'Agent 编排、文档解析、查询改写、语义缓存' },
  { version: 'V0.1.0', date: '2026-06-25', changes: '知识库 CRUD、RAG 混合检索、SSE 流式对话' },
  { version: 'V0.0.1', date: '2026-06-25', changes: '项目初始化、Monorepo 架构、CI 管线' },
]
</script>

<template>
  <div class="overlay" @click="emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <div>
          <h3 class="modal-title">关于 Jarvis</h3>
          <p class="modal-sub">企业级 AI 智能效率助手</p>
        </div>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <div class="current">
        <span class="badge">当前版本</span>
        <span class="current-ver">V0.3.0</span>
      </div>

      <div class="history">
        <div class="history-title">版本历史</div>
        <div v-for="v in versions" :key="v.version" class="ver-row">
          <div class="ver-top">
            <span class="ver-tag">{{ v.version }}</span>
            <span class="ver-date">{{ v.date }}</span>
          </div>
          <div class="ver-changes">{{ v.changes }}</div>
        </div>
      </div>

      <p class="footer">Built with NestJS · Vue 3 · PostgreSQL · LangChain</p>
    </div>
  </div>
</template>

<style scoped>
.overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:500; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px) }
.modal { background:var(--color-bg-secondary); border:1px solid var(--color-border); border-radius:20px; padding:32px; width:420px; max-width:90vw; max-height:80vh; overflow-y:auto; box-shadow:0 24px 64px rgba(0,0,0,.5) }
.modal-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px }
.modal-title { font-size:20px; font-weight:700; color:var(--color-text-primary); margin:0 0 4px }
.modal-sub { font-size:13px; color:var(--color-text-muted); margin:0 }
.close-btn { width:32px; height:32px; border-radius:8px; border:none; background:var(--color-bg-hover); color:var(--color-text-secondary); cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0 }
.close-btn:hover { background:var(--color-border); color:var(--color-text-primary) }
.current { display:flex; align-items:center; gap:12px; padding:14px 18px; background:var(--color-accent-muted); border-radius:12px; margin-bottom:24px }
.badge { font-size:11px; padding:2px 10px; border-radius:6px; background:var(--color-accent); color:#fff; font-weight:600 }
.current-ver { font-size:18px; font-weight:700; color:var(--color-accent) }
.history { margin-bottom:24px }
.history-title { font-size:11px; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:12px }
.ver-row { padding:12px 14px; border-radius:10px; transition:background .15s; margin-bottom:4px }
.ver-row:hover { background:var(--color-bg-hover) }
.ver-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px }
.ver-tag { font-size:13px; font-weight:600; color:var(--color-text-primary) }
.ver-date { font-size:11px; color:var(--color-text-muted) }
.ver-changes { font-size:12px; color:var(--color-text-secondary); line-height:1.5 }
.footer { text-align:center; font-size:11px; color:var(--color-text-muted); opacity:.5; margin:0 }
</style>
