import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma.service'
import { ModelGateway } from '@/ai/gateway/model-gateway'
import { SearchService } from '@/modules/knowledge/services/search.service'
import { ProductService } from '@/modules/knowledge/services/product.service'
import { KnowledgeAccessService } from '@/modules/knowledge/services/knowledge-access.service'
import { SemanticCacheService } from '@/ai/cache/semantic-cache.service'
import { QueryRewriteService } from './services/query-rewrite.service'
import type { ChatMessage } from '@/ai/interfaces'

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelGateway: ModelGateway,
    private readonly searchService: SearchService,
    private readonly productService: ProductService,
    private readonly access: KnowledgeAccessService,
    private readonly semanticCache: SemanticCacheService,
    private readonly queryRewrite: QueryRewriteService,
  ) {}

  async listConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' as const } } },
    })
    if (!conversation) throw new NotFoundException('会话不存在')
    return conversation
  }

  async renameConversation(userId: string, conversationId: string, title: string) {
    await this.ensureConversationOwner(userId, conversationId)
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { title: title.trim().slice(0, 80) || '新对话' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })
  }

  async deleteConversation(userId: string, conversationId: string) {
    await this.ensureConversationOwner(userId, conversationId)
    await this.prisma.message.deleteMany({ where: { conversationId } })
    await this.prisma.conversation.delete({ where: { id: conversationId } })
    return { ok: true }
  }

  /** Build system prompt with RAG context */
  private buildSystemPrompt(retrievedContext?: string): string {
    const base = `你是 Jarvis，一个企业级电商团队 AI 工作助手。你的知识来自团队维护的文档和商品资料库。
回答要求:
- 基于提供的文档和商品资料回答，不要编造信息
- 如果资料库中没有相关信息，诚实告知
- 涉及商品时优先给出商品名、SKU、价格、库存、卖点、注意事项和客服话术
- 使用 Markdown 格式组织回答
- 引用具体文档或商品来源`

    if (retrievedContext) {
      return `${base}\n\n## 参考资料\n${retrievedContext}`
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
    type: 'conversation' | 'token' | 'citations' | 'done' | 'error'
    data: unknown
  }> {
    // 1. Get or create conversation
    let conversationId = options?.conversationId
    if (conversationId) {
      await this.ensureConversationOwner(userId, conversationId)
    } else {
      const conv = await this.prisma.conversation.create({
        data: {
          userId,
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        },
      })
      conversationId = conv.id
    }

    yield { type: 'conversation' as const, data: { conversationId } }

    if (options?.knowledgeBaseId) {
      await this.access.ensureKnowledgeBaseAccess(userId, options.knowledgeBaseId)
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
          data: { conversationId, tokenCount: Math.ceil(cached.response.length / 2), modelName: '(cached)' },
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
      type?: 'document' | 'product'
      chunkId?: string
      documentName?: string
      content: string
      score: number
      productId?: string
      knowledgeBaseId?: string
      productName?: string
      category?: string | null
      brand?: string | null
      skuCode?: string
      imageUrl?: string
      price?: number | null
      stockStatus?: string
      sellingPoints?: string | null
      notes?: string | null
      skus?: Array<{
        skuCode: string
        color?: string | null
        size?: string | null
        price?: number | null
        stockStatus: string
        platformLink?: string | null
      }>
      faqs?: Array<{ question: string; answer: string }>
    }> = []

    if (options?.knowledgeBaseId) {
      // Query rewrite: expand user query for better recall
      let rewrittenQueries: string[]
      try {
        rewrittenQueries = await this.queryRewrite.rewrite(content)
      } catch {
        rewrittenQueries = [content]
      }

      try {
        // Search with all queries, merge and deduplicate
        const allResults = await Promise.all(
          rewrittenQueries.map((q) =>
            this.searchService.hybridSearch(q, {
              knowledgeBaseId: options.knowledgeBaseId!,
              topK: 5,
            }),
          ),
        )
        const seen = new Set<string>()
        const merged: typeof allResults[0] = []
        for (const batch of allResults) {
          for (const r of batch) {
            if (!seen.has(r.chunkId)) {
              seen.add(r.chunkId)
              merged.push(r)
            }
          }
        }
        merged.sort((a, b) => b.score - a.score)
        const topResults = merged.slice(0, 5)
        retrievedContext = topResults.map((r) => r.content).join('\n\n---\n\n')

        for (const r of topResults) {
          citations.push({
            type: 'document',
            chunkId: r.chunkId,
            documentName: r.documentName,
            content: r.content.slice(0, 200),
            score: r.score,
          })
        }
      } catch (err) {
        this.logger.warn('Document retrieval failed, continuing with product retrieval', err)
      }

      try {
        const productQueries = Array.from(new Set([content, ...rewrittenQueries].map((q) => q.trim()).filter(Boolean)))
        const productBatches = await Promise.all(
          productQueries.map((q) => this.productService.searchProducts(options.knowledgeBaseId!, q)),
        )
        const productSeen = new Set<string>()
        const productResults = productBatches
          .flat()
          .filter((product) => {
            const key = `${product.productId}:${product.skuCode ?? ''}`
            if (productSeen.has(key)) return false
            productSeen.add(key)
            return true
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
        if (productResults.length > 0) {
          const productContext = productResults
            .map((p) =>
              [
                `商品: ${p.productName}`,
                p.skuCode ? `SKU: ${p.skuCode}` : undefined,
                p.price !== undefined && p.price !== null ? `价格: ${p.price}` : undefined,
                p.stockStatus ? `库存状态: ${p.stockStatus}` : undefined,
                p.sellingPoints ? `卖点: ${p.sellingPoints}` : undefined,
                p.notes ? `注意事项: ${p.notes}` : undefined,
                p.skus?.length
                  ? `可选 SKU: ${p.skus.map((sku) => [
                    sku.skuCode,
                    sku.color,
                    sku.size,
                    sku.price !== undefined && sku.price !== null ? `¥${sku.price}` : undefined,
                    sku.stockStatus,
                  ].filter(Boolean).join('/')).join('；')}`
                  : undefined,
                p.faqs?.length
                  ? `客服话术: ${p.faqs.map((faq) => `${faq.question}：${faq.answer}`).join('；')}`
                  : undefined,
              ]
                .filter(Boolean)
                .join('\n'),
            )
            .join('\n\n---\n\n')
          retrievedContext = [retrievedContext, productContext].filter(Boolean).join('\n\n---\n\n')
          for (const product of productResults) {
            citations.push({
              ...product,
              content: [product.productName, product.skuCode, product.sellingPoints].filter(Boolean).join(' · '),
            })
          }
        }
      } catch (err) {
        this.logger.warn('Product retrieval failed, continuing without product context', err)
      }

      if (citations.length > 0) {
        yield { type: 'citations', data: citations }
      }
    }

    // 5. Build messages for LLM
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
        messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content })
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
      const errorMessage = '模型调用失败，请稍后重试'
      await this.prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content: `[错误] ${errorMessage}`,
        },
      })
      yield { type: 'error', data: errorMessage }
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

    yield { type: 'done', data: { conversationId, tokenCount: Math.ceil(fullResponse.length / 2), modelName } }
  }

  private async ensureConversationOwner(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    })
    if (!conversation) throw new NotFoundException('会话不存在')
    if (conversation.userId !== userId) throw new ForbiddenException('无权访问该会话')
  }
}
