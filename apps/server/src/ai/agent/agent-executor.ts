import { Injectable, Logger } from '@nestjs/common'
import { ModelGateway } from '@/ai/gateway/model-gateway'
import { ToolRegistry } from './tool-registry'
import type { AgentState } from './agent-state'
import { createInitialState } from './agent-state'

@Injectable()
export class AgentExecutor {
  private readonly logger = new Logger(AgentExecutor.name)

  constructor(
    private readonly modelGateway: ModelGateway,
    private readonly toolRegistry: ToolRegistry,
  ) {}

  /** Execute an agent task with streaming state updates */
  async *execute(
    taskId: string,
    task: string,
  ): AsyncGenerator<{
    type: 'state' | 'token' | 'tool_call' | 'tool_result' | 'done' | 'error'
    data: unknown
  }> {
    const state = createInitialState(taskId, task)

    while (state.currentIteration < state.maxIterations) {
      state.currentIteration++
      this.logger.log(`Agent iteration ${state.currentIteration}/${state.maxIterations}`)

      // 1. ANALYZE — ask LLM what to do
      try {
        const analysis = await this.analyze(state)
        yield { type: 'state', data: { iteration: state.currentIteration, step: 'analyze', analysis } }

        // If LLM says complete, we're done
        if (state.nextStep === 'complete') {
          yield { type: 'done', data: { iterations: state.currentIteration, results: state.intermediateResults } }
          return
        }

        if (state.nextStep === 'error') {
          yield { type: 'error', data: state.error }
          return
        }

        // 2. EXECUTE — run tool calls
        if (state.toolCalls.length > 0) {
          yield { type: 'tool_call', data: state.toolCalls }
          const results = await this.toolRegistry.execute(state.toolCalls)
          state.toolResults.push(...results)
          yield { type: 'tool_result', data: results }

          // Add tool results to message history
          for (const r of results) {
            state.messages.push({
              role: 'tool',
              content: r.error ? `Error: ${r.error}` : r.output,
            })
          }
        }
      } catch (err) {
        state.error = err instanceof Error ? err.message : 'Agent execution failed'
        yield { type: 'error', data: state.error }
        return
      }
    }

    // Max iterations reached
    state.nextStep = 'complete'
    yield {
      type: 'done',
      data: {
        iterations: state.currentIteration,
        results: state.intermediateResults,
        note: 'Max iterations reached',
      },
    }
  }

  private async analyze(state: AgentState): Promise<string> {
    const tools = this.toolRegistry.getDefinitions()
    const toolList = tools
      .map(
        (t) =>
          `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`,
      )
      .join('\n')

    const analyzePrompt = `可用工具:
${toolList}

你的任务: ${state.task}

回复格式 (必须是有效 JSON):
{
  "step": "analyze" | "execute" | "complete",
  "reasoning": "你的分析",
  "toolCalls": [
    { "id": "call_1", "name": "tool_name", "arguments": { "key": "value" } }
  ],
  "output": "如果已完成，输出最终结果"
}

规则:
- 如果可以从任务中直接解答，设置 step="complete"
- 如果需要使用工具，设置 step="execute" 并提供 toolCalls
- 如果任务无法完成，设置 step="complete" 并在 output 说明原因
- 每次只能调用 1-3 个工具`

    const messages = [
      ...state.messages,
      { role: 'user' as const, content: analyzePrompt },
    ]

    const result = await this.modelGateway.resolveProvider()
    const { config } = result
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.defaultModel,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      throw new Error(`LLM analysis failed: ${response.status}`)
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>
    }

    const parsed = JSON.parse(data.choices[0]!.message.content) as {
      step: string
      reasoning: string
      toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>
      output?: string
    }

    state.nextStep = parsed.step as AgentState['nextStep']
    state.messages.push({
      role: 'assistant',
      content: parsed.reasoning,
    })

    if (parsed.toolCalls) {
      state.toolCalls = parsed.toolCalls.map((tc) => ({
        id: tc.id || `call_${Date.now()}`,
        name: tc.name,
        arguments: tc.arguments || {},
      }))
    }

    if (parsed.output) {
      state.intermediateResults.push(parsed.output)
    }

    return parsed.reasoning
  }
}
