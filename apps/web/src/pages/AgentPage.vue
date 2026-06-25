<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAgent, type AgentTask } from '@/composables/useAgent'

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
            if (event.type === 'state') {
              executionLog.value.push(`#${event.data.iteration} [${event.data.step}] ${event.data.analysis}`)
            } else if (event.type === 'tool_call') {
              executionLog.value.push(`🔧 调用工具: ${JSON.stringify(event.data)}`)
            } else if (event.type === 'tool_result') {
              executionLog.value.push(`✅ 工具结果: ${JSON.stringify(event.data)}`)
            } else if (event.type === 'done') {
              executionLog.value.push('🏁 执行完成')
            } else if (event.type === 'error') {
              executionLog.value.push(`❌ 错误: ${event.data}`)
            }
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

function statusBadge(status: AgentTask['status']): string {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-500/15 text-yellow-400',
    RUNNING: 'bg-blue-500/15 text-blue-400',
    WAITING_HUMAN: 'bg-orange-500/15 text-orange-400',
    COMPLETED: 'bg-green-500/15 text-green-400',
    FAILED: 'bg-red-500/15 text-red-400',
  }
  return map[status] || ''
}
</script>

<template>
  <div class="flex h-screen bg-[var(--color-bg-primary)]">
    <aside class="w-[260px] shrink-0 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-light)] p-4 flex flex-col">
      <h2 class="text-lg font-bold mb-4">Jarvis</h2>
      <nav class="space-y-1 mb-4">
        <RouterLink to="/" class="block px-3 py-2 rounded-lg text-sm hover:bg-[var(--color-bg-hover)] transition-colors">对话</RouterLink>
        <RouterLink to="/knowledge" class="block px-3 py-2 rounded-lg text-sm hover:bg-[var(--color-bg-hover)] transition-colors">知识库</RouterLink>
        <RouterLink to="/agents" class="block px-3 py-2 rounded-lg text-sm bg-[var(--color-accent-muted)] text-[var(--color-accent)] transition-colors">Agent</RouterLink>
      </nav>
      <div class="flex-1" />
      <div class="text-[10px] text-[var(--color-text-muted)]">Jarvis v0.3</div>
    </aside>

    <main class="flex-1 p-6 overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-base font-semibold">Agent 任务</h3>
        <button class="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold transition-colors" @click="showCreate = !showCreate">
          {{ showCreate ? '取消' : '新建任务' }}
        </button>
      </div>

      <div v-if="showCreate" class="mb-6 p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-light)] space-y-3">
        <input v-model="newName" class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-sm outline-none focus:border-[var(--color-accent)]" placeholder="任务名称">
        <textarea v-model="newTask" rows="3" class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-sm outline-none focus:border-[var(--color-accent)] resize-none" placeholder="任务描述，例如：搜索知识库中的技术方案，分析它们的差异，生成对比报告"></textarea>
        <input v-model="newDesc" class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-sm outline-none focus:border-[var(--color-accent)]" placeholder="备注（可选）">
        <button class="w-full py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold transition-colors" @click="handleCreate">创建并执行</button>
      </div>

      <div v-if="loading" class="text-sm text-[var(--color-text-muted)] py-4">加载中...</div>

      <div v-if="tasks.length === 0 && !loading" class="text-sm text-[var(--color-text-muted)] py-8 text-center">
        暂无 Agent 任务
      </div>

      <div class="space-y-3">
        <div v-for="task in tasks" :key="task.id" class="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-light)]">
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ task.name }}</div>
              <div v-if="task.task" class="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{{ task.task }}</div>
            </div>
            <span class="shrink-0 ml-3 text-[10px] px-2 py-0.5 rounded" :class="statusBadge(task.status)">{{ task.status }}</span>
          </div>
          <div class="flex items-center gap-3 mt-3">
            <span class="text-[10px] text-[var(--color-text-muted)]">{{ new Date(task.createdAt).toLocaleString() }}</span>
            <button
              v-if="task.status !== 'RUNNING'"
              class="text-[10px] px-2 py-1 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors"
              :disabled="executing === task.id"
              @click="handleExecute(task)"
            >
              {{ executing === task.id ? '执行中...' : '执行' }}
            </button>
          </div>

          <div v-if="executing === task.id && executionLog.length > 0" class="mt-3 p-3 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] max-h-[300px] overflow-y-auto font-mono text-xs space-y-1">
            <div v-for="(line, i) in executionLog" :key="i" class="text-[var(--color-text-secondary)]">{{ line }}</div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
