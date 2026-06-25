import { Test } from '@nestjs/testing'
import { KnowledgeService } from '../src/modules/knowledge/services/knowledge.service'
import { PrismaService } from '../src/infrastructure/database/prisma.service'
import { NotFoundException } from '@nestjs/common'

describe('KnowledgeService', () => {
  let service: KnowledgeService
  let prisma: { knowledgeBase: Record<string, jest.Mock> }

  beforeEach(async () => {
    prisma = {
      knowledgeBase: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
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

  it('delete cascades chunks → documents → KB', async () => {
    prisma.knowledgeBase.findFirst.mockResolvedValue({ id: 'kb1' })
    await service.delete('u1', 'kb1')
    // Delete order matters for FK constraints
    expect(prisma.knowledgeBase.delete).toHaveBeenCalledWith({ where: { id: 'kb1' } })
  })
})
