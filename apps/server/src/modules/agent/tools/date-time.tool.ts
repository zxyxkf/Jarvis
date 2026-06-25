import { Injectable } from '@nestjs/common'
import type { ITool, ToolDefinition } from '@/ai/agent/tool.interface'

@Injectable()
export class DateTimeTool implements ITool {
  readonly definition: ToolDefinition = {
    name: 'get_datetime',
    description: '获取当前日期和时间。用于日程安排、时间计算。',
    parameters: {
      type: 'object',
      properties: {
        format: { type: 'string', description: "'full' | 'date' | 'time'" },
      },
      required: [],
    },
  }

  async execute(args: Record<string, unknown>): Promise<string> {
    const format = (args['format'] as string) || 'full'
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().split(' ')[0]
    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]

    switch (format) {
      case 'date':
        return `${dateStr} (星期${dayOfWeek})`
      case 'time':
        return timeStr!
      default:
        return `${dateStr} ${timeStr} 星期${dayOfWeek}`
    }
  }
}
