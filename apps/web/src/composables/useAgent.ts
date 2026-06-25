import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

export interface AgentTask {
  id: string
  name: string
  task: string
  description?: string
  status: 'PENDING' | 'RUNNING' | 'WAITING_HUMAN' | 'COMPLETED' | 'FAILED'
  state?: Record<string, unknown>
  result?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export function useAgent() {
  const tasks = ref<AgentTask[]>([])
  const loading = ref(false)
  const auth = useAuthStore()

  async function fetchTasks() {
    loading.value = true
    const res = await fetch('/api/v1/agents', { headers: auth.getAuthHeaders() })
    const body = await res.json()
    tasks.value = (body.data as AgentTask[]) ?? []
    loading.value = false
  }

  async function createTask(name: string, task: string, desc?: string) {
    const res = await fetch('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
      body: JSON.stringify({ name, task, description: desc }),
    })
    const body = await res.json()
    if (body.code === 0) await fetchTasks()
    return body.data as AgentTask
  }

  async function getStatus(id: string): Promise<AgentTask> {
    const res = await fetch(`/api/v1/agents/${id}/status`, { headers: auth.getAuthHeaders() })
    const body = await res.json()
    return body.data as AgentTask
  }

  return { tasks, loading, fetchTasks, createTask, getStatus }
}
