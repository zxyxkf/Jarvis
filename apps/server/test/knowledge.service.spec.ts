import { Test } from '@nestjs/testing'
import { KnowledgeService } from '../src/modules/knowledge/services/knowledge.service'
import { PrismaService } from '../src/infrastructure/database/prisma.service'
import { BadRequestException, NotFoundException } from '@nestjs/common'

describe('KnowledgeService', () => {
  let service: KnowledgeService
  let prisma: Record<string, Record<string, jest.Mock> | jest.Mock>

  beforeEach(async () => {
    prisma = {
      knowledgeBase: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma)),
      product: { findMany: jest.fn(), deleteMany: jest.fn() },
      productAsset: { deleteMany: jest.fn() },
      productFAQ: { deleteMany: jest.fn() },
      productSku: { deleteMany: jest.fn() },
      sourceMapping: { deleteMany: jest.fn() },
      asset: { deleteMany: jest.fn() },
      importJob: { count: jest.fn() },
      platformConnection: { findMany: jest.fn(), deleteMany: jest.fn() },
      platformSyncJob: { updateMany: jest.fn(), deleteMany: jest.fn() },
      chunk: { deleteMany: jest.fn() },
      document: { deleteMany: jest.fn() },
    }
    // @abstract-candidate: Test setup pattern with mocked Prisma
    // Seen: 1/3 (knowledge.service.spec)
    const module = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    service = module.get(KnowledgeService)
  })

  it('create returns new knowledge base', async () => {
    const mock = { id: 'kb1', name: 'test', ownerId: 'u1' }
    prisma.knowledgeBase.create.mockResolvedValue(mock)
    const result = await service.create('u1', { name: 'test' })
    expect(result).toEqual(mock)
    expect(prisma.knowledgeBase.create).toHaveBeenCalledWith({
      data: { name: 'test', ownerId: 'u1' },
    })
  })

  it('findAll returns user bases with document count', async () => {
    prisma.knowledgeBase.findMany.mockResolvedValue([{ id: 'kb1', _count: { documents: 3 } }])
    const result = await service.findAll('u1')
    expect(result).toHaveLength(1)
    expect(result[0]._count.documents).toBe(3)
  })

  it('findById throws NotFoundException for missing KB', async () => {
    prisma.knowledgeBase.findFirst.mockResolvedValue(null)
    await expect(service.findById('u1', 'missing')).rejects.toThrow(NotFoundException)
  })

  it('findById returns KB with counts', async () => {
    prisma.knowledgeBase.findFirst.mockResolvedValue({
      id: 'kb1', name: 'test', _count: { documents: 5, chunks: 100 },
    })
    const result = await service.findById('u1', 'kb1')
    expect(result._count.documents).toBe(5)
  })

  it('update modifies name', async () => {
    prisma.knowledgeBase.findFirst.mockResolvedValue({ id: 'kb1' })
    prisma.knowledgeBase.update.mockResolvedValue({ id: 'kb1', name: 'updated' })
    const result = await service.update('u1', 'kb1', { name: 'updated' })
    expect(result.name).toBe('updated')
  })

  it('delete removes ecommerce and document data before deleting KB', async () => {
    prisma.knowledgeBase.findFirst.mockResolvedValue({ id: 'kb1' })
    prisma.importJob.count.mockResolvedValue(0)
    prisma.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }])
    prisma.platformConnection.findMany.mockResolvedValue([{ id: 'conn1' }])

    await service.delete('u1', 'kb1')

    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.productAsset.deleteMany).toHaveBeenCalledWith({ where: { productId: { in: ['p1', 'p2'] } } })
    expect(prisma.productFAQ.deleteMany).toHaveBeenCalledWith({ where: { productId: { in: ['p1', 'p2'] } } })
    expect(prisma.productSku.deleteMany).toHaveBeenCalledWith({ where: { productId: { in: ['p1', 'p2'] } } })
    expect(prisma.sourceMapping.deleteMany).toHaveBeenCalledWith({ where: { productId: { in: ['p1', 'p2'] } } })
    expect(prisma.platformSyncJob.updateMany).toHaveBeenCalledWith({
      where: { connectionId: { in: ['conn1'] } },
      data: { connectionId: null },
    })
    expect(prisma.platformSyncJob.deleteMany).toHaveBeenCalledWith({ where: { knowledgeBaseId: 'kb1' } })
    expect(prisma.platformConnection.deleteMany).toHaveBeenCalledWith({ where: { knowledgeBaseId: 'kb1' } })
    expect(prisma.importJob.count).toHaveBeenCalledWith({ where: { knowledgeBaseId: 'kb1' } })
    expect(prisma.asset.deleteMany).toHaveBeenCalledWith({ where: { knowledgeBaseId: 'kb1' } })
    expect(prisma.product.deleteMany).toHaveBeenCalledWith({ where: { knowledgeBaseId: 'kb1' } })
    expect(prisma.chunk.deleteMany).toHaveBeenCalledWith({ where: { knowledgeBaseId: 'kb1' } })
    expect(prisma.document.deleteMany).toHaveBeenCalledWith({ where: { knowledgeBaseId: 'kb1' } })
    expect(prisma.knowledgeBase.delete).toHaveBeenCalledWith({ where: { id: 'kb1' } })
  })

  it('rejects deleting a knowledge base that has import records', async () => {
    prisma.knowledgeBase.findFirst.mockResolvedValue({ id: 'kb1' })
    prisma.importJob.count.mockResolvedValue(1)

    await expect(service.delete('u1', 'kb1')).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.knowledgeBase.delete).not.toHaveBeenCalled()
  })
})
