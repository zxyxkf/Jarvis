import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma.service'
import { ModelGateway } from '@/ai/gateway/model-gateway'
import { SearchService } from '@/modules/knowledge/services/search.service'
import { SemanticCacheService } from '@/ai/cache/semantic-cache.service'
import type { ChatMessage } from '@/ai/interfaces'

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelGateway: ModelGateway,
    private readonly searchService: SearchService,
    private readonly semanticCache: SemanticCacheService,
  ) {}

  /** Build system prompt with RAG context */
  private buildSystemPrompt(retrievedContext?: string): string {
    const base = `你是 Jarvis，一个企业级 AI 智能助手。你的知识来自用户提供的文档。
回答要求:
- 基于提供的文档内容回答，不要编造信息
- 如果文档中没有相关信息，诚实告知
- 使用 Markdown 格式组织回答
- 引用具体文档来源`

    if (retrievedContext) {
      return `${base}\n\n## 参考文档内容\n${retrievedContext}`
    }
    return base
  }

  /** Stream chat with RAG retrieval */
  async *streamChat(
    userId: string,
    content: string,
    options?: {
      conversationId?: string
      knowledgeBaseId?: string
      model?: string
    },
  ): AsyncGenerator<{
    type: 'token' | 'citations' | 'done' | 'error'
    data: unknown
  }> {
    // 1. Get or create conversation
    let conversationId = options?.conversationId
    if (!conversationId) {
      const conv = await this.prisma.conversation.create({
        data: {
          userId,
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        },
      })
      conversationId = conv.id
    }

    // 2. Save user message
    await this.prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
      },
    })

    // 3. Check semantic cache (before expensive LLM call)
    if (options?.knowledgeBaseId) {
      const cached = await this.semanticCache.get(options.knowledgeBaseId, content)
      if (cached) {
        for (const token of cached.response) {
          yield { type: 'token' as const, data: token }
        }
        if (cached.citations) {
          yield { type: 'citations' as const, data: cached.citations }
        }
        yield {
          type: 'done' as const,
          data: { tokenCount: Math.ceil(cached.response.length / 2), modelName: '(cached)' },
        }
        // Save cached response as assistant message
        await this.prisma.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content: cached.response as string,
            tokenCount: Math.ceil((cached.response as string).length / 2),
            modelName: `cached:${cached.modelName}`,
            citations: cached.citations ? JSON.parse(JSON.stringify(cached.citations)) : undefined,
          },
        })
        return
      }
    }

    // 4. RAG retrieval (if knowledge base specified)
    let retrievedContext: string | undefined
    const citations: Array<{
      chunkId: string
      documentName: string
      content: string
      score: number
    }> = []

    if (options?.knowledgeBaseId) {
      try {
        const results = await this.searchService.hybridSearch(content, {
          knowledgeBaseId: options.knowledgeBaseId,
          topK: 5,
        })
        retrievedContext = results.map((r) => r.content).join('\n\n---\n\n')

        for (const r of results) {
          citations.push({
            chunkId: r.chunkId,
            documentName: r.documentName,
            content: r.content.slice(0, 200),
            score: r.score,
          })
        }

        if (citations.length > 0) {
          yield { type: 'citations', data: citations }
        }
      } catch (err) {
        this.logger.warn('RAG retrieval failed, continuing without context', err)
      }
    }

    // 4. Build messages for LLM
    const messages: ChatMessage[] = [
      { role: 'system', content: this.buildSystemPrompt(retrievedContext) },
    ]

    // Load recent conversation history (up to 10 messages)
    if (options?.conversationId) {
      const history = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 10,
      })
      for (const msg of history.slice(0, -1)) {
        // Exclude the user message we just saved
        if (msg.id !== conversationId) {
          messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content })
        }
      }
    }

    messages.push({ role: 'user', content })

    // 5. Stream LLM response
    let fullResponse = ''
    let modelName = ''

    try {
      for await (const { token, modelName: m } of this.modelGateway.streamChat(messages, {
        model: options?.model,
      })) {
        fullResponse += token
        modelName = m
        yield { type: 'token', data: token }
      }
    } catch (err) {
      this.logger.error('LLM streaming failed', err)
      yield { type: 'error', data: '模型调用失败，请稍后重试' }
      return
    }

    // 6. Save assistant message
    await this.prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: fullResponse,
        tokenCount: Math.ceil(fullResponse.length / 2),
        modelName,
        citations: citations.length > 0 ? JSON.parse(JSON.stringify(citations)) : undefined,
      },
    })

    // 6.5 Cache the response for future similar queries
    if (options?.knowledgeBaseId && fullResponse) {
      this.semanticCache
        .set(options.knowledgeBaseId, content, fullResponse, citations, modelName)
        .catch((err) => this.logger.warn('Semantic cache set failed', err))
    }

    // 7. Update conversation title (use first user message as title)
    const msgCount = await this.prisma.message.count({ where: { conversationId } })
    if (msgCount <= 2) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { title: content.slice(0, 50) },
      })
    }

    yield { type: 'done', data: { tokenCount: Math.ceil(fullResponse.length / 2), modelName } }
  }
}
