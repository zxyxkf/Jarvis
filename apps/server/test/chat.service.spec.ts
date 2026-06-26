import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { ChatService } from '../src/modules/chat/chat.service'

describe('ChatService', () => {
  const prisma = {
    conversation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    message: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  }
  const modelGateway = {
    streamChat: jest.fn(),
  }
  const searchService = {
    hybridSearch: jest.fn(),
  }
  const productService = {
    searchProducts: jest.fn(),
  }
  const access = {
    ensureKnowledgeBaseAccess: jest.fn(),
  }
  const semanticCache = {
    get: jest.fn(),
    set: jest.fn(),
  }
  const queryRewrite = {
    rewrite: jest.fn(),
  }

  let service: ChatService

  beforeEach(() => {
    jest.clearAllMocks()
    semanticCache.get.mockResolvedValue(null)
    semanticCache.set.mockResolvedValue(undefined)
    queryRewrite.rewrite.mockResolvedValue(['查询商品'])
    searchService.hybridSearch.mockResolvedValue([])
    productService.searchProducts.mockResolvedValue([])
    access.ensureKnowledgeBaseAccess.mockResolvedValue({ id: 'kb-1' })
    prisma.message.findMany.mockResolvedValue([])
    prisma.message.count.mockResolvedValue(2)
    prisma.conversation.update.mockResolvedValue({ id: 'conv-1' })
    service = new ChatService(
      prisma as never,
      modelGateway as never,
      searchService as never,
      productService as never,
      access as never,
      semanticCache as never,
      queryRewrite as never,
    )
  })

  it('returns conversation id for a new streamed conversation and saves both messages', async () => {
    prisma.conversation.create.mockResolvedValue({ id: 'conv-1' })
    prisma.message.create.mockResolvedValue({})
    modelGateway.streamChat.mockImplementation(async function* () {
      yield { token: '您好', modelName: 'test-model' }
    })

    const events = []
    for await (const event of service.streamChat('user-1', '查询商品')) {
      events.push(event)
    }

    expect(events[0]).toEqual({ type: 'conversation', data: { conversationId: 'conv-1' } })
    expect(events).toContainEqual({ type: 'token', data: '您好' })
    expect(events.at(-1)).toEqual({
      type: 'done',
      data: { conversationId: 'conv-1', tokenCount: 1, modelName: 'test-model' },
    })
    expect(prisma.message.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ conversationId: 'conv-1', role: 'user', content: '查询商品' }),
    }))
    expect(prisma.message.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ conversationId: 'conv-1', role: 'assistant', content: '您好' }),
    }))
  })

  it('rejects streaming into a conversation owned by another user', async () => {
    prisma.conversation.findUnique.mockResolvedValue({ userId: 'other-user' })

    const stream = service.streamChat('user-1', '查询商品', { conversationId: 'conv-1' })

    await expect(stream.next()).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.message.create).not.toHaveBeenCalled()
  })

  it('rejects streaming into a missing conversation', async () => {
    prisma.conversation.findUnique.mockResolvedValue(null)

    const stream = service.streamChat('user-1', '查询商品', { conversationId: 'missing' })

    await expect(stream.next()).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.message.create).not.toHaveBeenCalled()
  })

  it('validates knowledge base access before cache or retrieval', async () => {
    prisma.conversation.create.mockResolvedValue({ id: 'conv-1' })
    access.ensureKnowledgeBaseAccess.mockRejectedValue(new NotFoundException('Knowledge base not found'))

    const stream = service.streamChat('user-1', '查询商品', { knowledgeBaseId: 'missing-kb' })

    await expect(stream.next()).resolves.toEqual({
      value: { type: 'conversation', data: { conversationId: 'conv-1' } },
      done: false,
    })
    await expect(stream.next()).rejects.toBeInstanceOf(NotFoundException)
    expect(semanticCache.get).not.toHaveBeenCalled()
    expect(searchService.hybridSearch).not.toHaveBeenCalled()
    expect(productService.searchProducts).not.toHaveBeenCalled()
  })

  it('searches products with original and rewritten queries and deduplicates citations', async () => {
    prisma.conversation.create.mockResolvedValue({ id: 'conv-1' })
    prisma.message.create.mockResolvedValue({})
    queryRewrite.rewrite.mockResolvedValue(['黑色托特包', '通勤包'])
    const productCitation = {
      type: 'product',
      productId: 'p1',
      knowledgeBaseId: 'kb1',
      productName: '通勤托特包',
      skuCode: 'BAG-BLACK',
      score: 0.9,
    }
    productService.searchProducts
      .mockResolvedValueOnce([productCitation])
      .mockResolvedValueOnce([{ ...productCitation, score: 0.8 }])
      .mockResolvedValueOnce([])
    modelGateway.streamChat.mockImplementation(async function* () {
      yield { token: '已找到', modelName: 'test-model' }
    })

    const events = []
    for await (const event of service.streamChat('user-1', '客户要黑色通勤大包', { knowledgeBaseId: 'kb1' })) {
      events.push(event)
    }

    expect(productService.searchProducts).toHaveBeenCalledTimes(3)
    expect(productService.searchProducts).toHaveBeenNthCalledWith(1, 'kb1', '客户要黑色通勤大包')
    expect(productService.searchProducts).toHaveBeenNthCalledWith(2, 'kb1', '黑色托特包')
    expect(productService.searchProducts).toHaveBeenNthCalledWith(3, 'kb1', '通勤包')
    expect(events).toContainEqual({
      type: 'citations',
      data: [expect.objectContaining({ productId: 'p1', content: '通勤托特包 · BAG-BLACK' })],
    })
  })

  it('renames an owned conversation', async () => {
    prisma.conversation.findUnique.mockResolvedValue({ userId: 'user-1' })
    prisma.conversation.update.mockResolvedValue({ id: 'conv-1', title: '售前咨询' })

    const result = await service.renameConversation('user-1', 'conv-1', '售前咨询')

    expect(result).toEqual({ id: 'conv-1', title: '售前咨询' })
    expect(prisma.conversation.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'conv-1' },
      data: { title: '售前咨询' },
    }))
  })

  it('deletes an owned conversation with messages first', async () => {
    prisma.conversation.findUnique.mockResolvedValue({ userId: 'user-1' })
    prisma.message.deleteMany.mockResolvedValue({ count: 2 })
    prisma.conversation.delete.mockResolvedValue({ id: 'conv-1' })

    await expect(service.deleteConversation('user-1', 'conv-1')).resolves.toEqual({ ok: true })

    expect(prisma.message.deleteMany).toHaveBeenCalledWith({ where: { conversationId: 'conv-1' } })
    expect(prisma.conversation.delete).toHaveBeenCalledWith({ where: { id: 'conv-1' } })
  })

  it('persists an assistant error message when model streaming fails', async () => {
    prisma.conversation.create.mockResolvedValue({ id: 'conv-1' })
    prisma.message.create.mockResolvedValue({})
    modelGateway.streamChat.mockReturnValue({
      [Symbol.asyncIterator]() {
        return this
      },
      async next() {
        throw new Error('provider unavailable')
      },
    })

    const events = []
    for await (const event of service.streamChat('user-1', 'hello')) {
      events.push(event)
    }

    expect(events).toContainEqual({ type: 'error', data: '模型调用失败，请稍后重试' })
    expect(prisma.message.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        conversationId: 'conv-1',
        role: 'assistant',
        content: '[错误] 模型调用失败，请稍后重试',
      }),
    }))
  })
})
