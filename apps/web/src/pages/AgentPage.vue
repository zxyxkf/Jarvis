<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAgent, type AgentTask } from '@/composables/useAgent'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import AppSidebar from '@/components/layout/AppSidebar.vue'

const { tasks, loading, fetchTasks, createTask } = useAgent()
const showCreate = ref(false)
const newName = ref('')
const newTask = ref('')
const newDesc = ref('')
const executing = ref<string | null>(null)
const executionLog = ref<string[]>([])

onMounted(() => fetchTasks())

async function handleCreate() {
  if (!newName.value.trim() || !newTask.value.trim()) return
  await createTask(newName.value.trim(), newTask.value.trim(), newDesc.value.trim() || undefined)
  newName.value = ''
  newTask.value = ''
  newDesc.value = ''
  showCreate.value = false
}

async function handleExecute(task: AgentTask) {
  executing.value = task.id
  executionLog.value = []
  const token = localStorage.getItem('accessToken') || ''
  try {
    const response = await fetch(`/api/v1/agents/${task.id}/execute`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let done = false
    while (!done) {
      const { done: streamDone, value } = await reader.read()
      done = streamDone
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'state') executionLog.value.push(`#${event.data.iteration} [${event.data.step}] ${event.data.analysis}`)
            else if (event.type === 'tool_call') executionLog.value.push(`🔧 调用工具: ${JSON.stringify(event.data)}`)
            else if (event.type === 'tool_result') executionLog.value.push(`✅ 工具结果: ${JSON.stringify(event.data)}`)
            else if (event.type === 'done') executionLog.value.push('🏁 执行完成')
            else if (event.type === 'error') executionLog.value.push(`❌ 错误: ${event.data}`)
          } catch { /* skip */ }
        }
      }
    }
  } catch (err) {
    executionLog.value.push(`❌ 连接失败: ${err instanceof Error ? err.message : '未知错误'}`)
  }
  executing.value = null
  await fetchTasks()
}

function statusLabel(s: string): string {
  const m: Record<string,string> = { PENDING:'待执行', RUNNING:'运行中', WAITING_HUMAN:'等待确认', COMPLETED:'已完成', FAILED:'失败' }
  return m[s] || s
}
function statusClass(s: string): string {
  const m: Record<string,string> = { PENDING:'s-warn', RUNNING:'s-info', COMPLETED:'s-ok', FAILED:'s-err' }
  return 'status-tag ' + (m[s] || '')
}
</script>

<template>
  <div class="page">
    <SplitterGroup direction="horizontal" class="splitter-root">
      <SplitterPanel :default-size="16" :min-size="13" :max-size="25" class="sidebar-panel">
        <AppSidebar />
      </SplitterPanel>
      <SplitterResizeHandle class="resize-handle-h" />
      <SplitterPanel :default-size="84" class="main-panel">
        <main class="main">
      <div class="main-header">
        <h3 class="main-title">Agent 任务</h3>
        <button class="btn-primary" @click="showCreate = !showCreate">{{ showCreate ? '取消' : '+ 新建任务' }}</button>
      </div>

      <div v-if="showCreate" class="create-card">
        <input v-model="newName" class="field" placeholder="任务名称" />
        <textarea v-model="newTask" rows="3" class="field" placeholder="任务描述，例如：搜索知识库中的技术方案，分析差异，生成对比报告" />
        <input v-model="newDesc" class="field" placeholder="备注（可选）" />
        <button class="btn-primary" style="width:100%" @click="handleCreate">创建并执行</button>
      </div>

      <div v-if="loading" class="empty">加载中...</div>
      <div v-if="tasks.length === 0 && !loading" class="empty">暂无 Agent 任务</div>

      <div v-for="task in tasks" :key="task.id" class="task-card">
        <div class="task-header">
          <div class="task-left">
            <div class="task-name">{{ task.name }}</div>
            <div class="task-desc">{{ task.task }}</div>
          </div>
          <span :class="statusClass(task.status)">{{ statusLabel(task.status) }}</span>
        </div>
        <div class="task-footer">
          <span class="task-time">{{ new Date(task.createdAt).toLocaleString() }}</span>
          <button
            v-if="task.status !== 'RUNNING'"
            class="btn-execute"
            :disabled="executing === task.id"
            @click="handleExecute(task)"
          >{{ executing === task.id ? '执行中...' : '▶ 执行' }}</button>
        </div>
        <div v-if="executing === task.id && executionLog.length > 0" class="exec-log">
          <div v-for="(line, i) in executionLog" :key="i" class="log-line">{{ line }}</div>
        </div>
      </div>
        </main>
      </SplitterPanel>
    </SplitterGroup>
  </div>
</template>

<style scoped>
.page{width:100vw;height:100vh;background:var(--color-bg-primary);color:var(--color-text-primary);font-family:Inter,system-ui,sans-serif}
.splitter-root{width:100%;height:100%}
.sidebar-panel{overflow:hidden}
.resize-handle-h{width:3px;background:var(--color-border);transition:background .2s;position:relative}
.resize-handle-h:hover,.resize-handle-h[data-resize-handle-active]{background:var(--color-accent)}
.resize-handle-h::after{content:'';position:absolute;inset:-4px}
.main-panel{overflow:hidden}
.main{height:100%;overflow-y:auto;padding:32px}
.main-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px }
.main-title { font-size:16px; font-weight:600; color:var(--color-text-primary); margin:0 }
.btn-primary { padding:8px 18px; background:var(--color-accent); color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; transition:background .15s; font-family:inherit }
.btn-primary:hover { background:var(--color-accent-hover) }
.btn-primary:disabled { opacity:.5; cursor:not-allowed }
.create-card { background:var(--color-bg-secondary); border:1px solid var(--color-border-light); border-radius:14px; padding:16px; margin-bottom:24px; display:flex; flex-direction:column; gap:10px }
.field { width:100%; box-sizing:border-box; padding:10px 14px; background:var(--color-bg-tertiary); border:1px solid var(--color-border); border-radius:10px; font-size:13px; color:var(--color-text-primary); outline:none; font-family:inherit; resize:vertical; transition:border-color .15s }
.field:focus { border-color:var(--color-accent) }
.task-card { background:var(--color-bg-secondary); border:1px solid var(--color-border-light); border-radius:14px; padding:18px; margin-bottom:12px; transition:border-color .15s }
.task-card:hover { border-color:var(--color-border) }
.task-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px }
.task-left { flex:1; min-width:0; margin-right:12px }
.task-name { font-size:14px; font-weight:600; color:var(--color-text-primary); margin-bottom:4px }
.task-desc { font-size:12px; color:var(--color-text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.status-tag { font-size:10px; padding:2px 10px; border-radius:6px; flex-shrink:0 }
.status-tag.s-warn { background:rgba(245,158,11,.12); color:#f59e0b }
.status-tag.s-info { background:rgba(59,130,246,.12); color:#3b82f6 }
.status-tag.s-ok { background:rgba(16,185,129,.12); color:#10b981 }
.status-tag.s-err { background:rgba(239,68,68,.12); color:#ef4444 }
.task-footer { display:flex; align-items:center; justify-content:space-between }
.task-time { font-size:12px; color:var(--color-text-muted) }
.btn-execute { padding:6px 14px; background:var(--color-accent-muted); color:var(--color-accent); border:1px solid transparent; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .15s }
.btn-execute:hover:not(:disabled) { background:var(--color-accent); color:#fff }
.btn-execute:disabled { opacity:.5; cursor:not-allowed }
.exec-log { margin-top:14px; padding:14px; background:var(--color-bg-primary); border:1px solid var(--color-border); border-radius:10px; max-height:300px; overflow-y:auto; font-family:monospace; font-size:12px }
.log-line { color:var(--color-text-secondary); line-height:1.8 }
.empty { text-align:center; color:var(--color-text-muted); font-size:14px; padding:64px 0 }
</style>
