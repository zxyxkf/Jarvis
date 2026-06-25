export interface AgentState {
  taskId: string
  task: string
  messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>
  toolCalls: Array<{
    id: string
    name: string
    arguments: Record<string, unknown>
  }>
  toolResults: Array<{
    callId: string
    output: string
    error?: string
  }>
  intermediateResults: string[]
  nextStep: 'analyze' | 'execute' | 'evaluate' | 'complete' | 'error'
  error: string | null
  maxIterations: number
  currentIteration: number
}

export function createInitialState(taskId: string, task: string): AgentState {
  return {
    taskId,
    task,
    messages: [
      {
        role: 'system',
        content: `你是 Jarvis Agent，一个智能任务执行引擎。
你可以使用工具来完成用户的复杂任务。
分析任务 → 选择工具 → 执行工具 → 评估结果 → 完成或重试。
每次迭代报告你做了什么、结果如何、下一步计划。`,
      },
      { role: 'user', content: task },
    ],
    toolCalls: [],
    toolResults: [],
    intermediateResults: [],
    nextStep: 'analyze',
    error: null,
    maxIterations: 5,
    currentIteration: 0,
  }
}
