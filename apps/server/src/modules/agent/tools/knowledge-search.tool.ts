import { Injectable } from '@nestjs/common'
import type { ITool, ToolDefinition } from '@/ai/agent/tool.interface'
import { SearchService } from '@/modules/knowledge/services/search.service'

@Injectable()
export class KnowledgeSearchTool implements ITool {
  readonly definition: ToolDefinition = {
    name: 'search_knowledge',
    description: '在知识库中搜索相关文档内容。用于查找信息、回答基于文档的问题。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索查询词' },
        knowledgeBaseId: { type: 'string', description: '知识库 ID' },
      },
      required: ['query', 'knowledgeBaseId'],
    },
  }

  constructor(private readonly searchService: SearchService) {}

  async execute(args: Record<string, unknown>): Promise<string> {
    const query = args['query'] as string
    const kbId = args['knowledgeBaseId'] as string
    const results = await this.searchService.hybridSearch(query, {
      knowledgeBaseId: kbId,
      topK: 5,
    })
    if (results.length === 0) return '未找到相关文档'
    return results
      .map((r, i) => `${i + 1}. [${r.documentName}] ${r.content.slice(0, 300)}`)
      .join('\n')
  }
}
