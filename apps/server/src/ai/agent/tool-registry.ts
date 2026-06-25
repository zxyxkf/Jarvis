import { Injectable, Logger } from '@nestjs/common'
import type { ITool, ToolDefinition, ToolCall, ToolResult } from './tool.interface'

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name)
  private readonly tools = new Map<string, ITool>()

  register(tool: ITool): void {
    this.tools.set(tool.definition.name, tool)
    this.logger.log(`Tool registered: ${tool.definition.name}`)
  }

  get(name: string): ITool | undefined {
    return this.tools.get(name)
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition)
  }

  async execute(calls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = []
    for (const call of calls) {
      const tool = this.tools.get(call.name)
      if (!tool) {
        results.push({ callId: call.id, output: '', error: `Tool not found: ${call.name}` })
        continue
      }
      try {
        const output = await tool.execute(call.arguments)
        results.push({ callId: call.id, output })
      } catch (err) {
        results.push({
          callId: call.id,
          output: '',
          error: err instanceof Error ? err.message : 'Tool execution failed',
        })
      }
    }
    return results
  }
}
