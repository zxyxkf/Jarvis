import { Injectable, Logger } from '@nestjs/common'
import { ModelGateway } from '@/ai/gateway/model-gateway'

@Injectable()
export class QueryRewriteService {
  private readonly logger = new Logger(QueryRewriteService.name)

  constructor(private readonly modelGateway: ModelGateway) {}

  /** Rewrite user query from conversational to search-optimized */
  async rewrite(originalQuery: string, conversationContext?: string): Promise<string[]> {
    try {
      const ctx = conversationContext
        ? `对话上下文: ${conversationContext}`
        : ''

      const prompt = `你是一个搜索查询优化器。将用户的自然语言问题改写为1-3个更适合文档检索的查询。
原始问题: ${originalQuery}
${ctx}

规则:
- 提取关键实体和概念
- 生成不同角度的查询（如：定义、对比、操作步骤）
- 保持原意，不添加新信息
- 使用简洁的关键词组合

返回 JSON: { "queries": ["query1", "query2", "query3"] }`

      const { config } = this.modelGateway.resolveProvider()
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.defaultModel,
          messages: [
            { role: 'system', content: 'You are a search query optimizer.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 256,
          response_format: { type: 'json_object' },
        }),
      })

      if (!response.ok) return [originalQuery]

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>
      }
      const parsed = JSON.parse(data.choices[0]!.message.content) as {
        queries: string[]
      }
      this.logger.log(`Rewrote "${originalQuery.slice(0,30)}..." → [${parsed.queries.join(', ')}]`)
      return parsed.queries.length > 0 ? parsed.queries : [originalQuery]
    } catch (err) {
      this.logger.warn('Query rewrite failed, using original', err)
      return [originalQuery]
    }
  }
}
