export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolResult {
  callId: string
  output: string
  error?: string
}

export interface ITool {
  readonly definition: ToolDefinition
  execute(args: Record<string, unknown>): Promise<string>
}

export const TOOL_REGISTRY = Symbol('IToolRegistry')
