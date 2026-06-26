import { AuditService } from '../src/modules/knowledge/services/audit.service'

describe('AuditService', () => {
  const prisma = {
    auditLog: { findMany: jest.fn() },
    product: { findMany: jest.fn() },
    productSku: { findMany: jest.fn() },
    productFAQ: { findMany: jest.fn() },
    productAsset: { findMany: jest.fn() },
  }
  const access = {
    ensureKnowledgeBaseAccess: jest.fn(),
  }
  let service: AuditService

  beforeEach(() => {
    jest.clearAllMocks()
    access.ensureKnowledgeBaseAccess.mockResolvedValue({ id: 'kb1' })
    prisma.auditLog.findMany.mockResolvedValue([])
    prisma.product.findMany.mockResolvedValue([])
    prisma.productSku.findMany.mockResolvedValue([])
    prisma.productFAQ.findMany.mockResolvedValue([])
    prisma.productAsset.findMany.mockResolvedValue([])
    service = new AuditService(prisma as never, access as never)
  })

  it('lists knowledge base audit logs with bounded limit, actor search, and date range', async () => {
    await service.listKnowledgeBaseLogs('u1', 'kb1', {
      action: 'update_product',
      q: '张三',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-06-26T15:59:59.999Z',
      limit: 500,
    })

    expect(access.ensureKnowledgeBaseAccess).toHaveBeenCalledWith('u1', 'kb1')
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        action: 'update_product',
        createdAt: {
          gte: new Date('2026-06-01T00:00:00.000Z'),
          lte: new Date('2026-06-26T15:59:59.999Z'),
        },
        AND: expect.any(Array),
      }),
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }))
    expect(prisma.auditLog.findMany.mock.calls[0][0].where.AND[1].OR).toEqual(expect.arrayContaining([
      { user: { name: { contains: '张三', mode: 'insensitive' } } },
      { user: { email: { contains: '张三', mode: 'insensitive' } } },
    ]))
  })

  it('hydrates product names for legacy product related logs', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      { id: 'log1', action: 'update_product', resource: 'p1', detail: { knowledgeBaseId: 'kb1' }, createdAt: new Date(), user: { id: 'u1', name: '用户', email: 'u1@test.com' } },
      { id: 'log2', action: 'update_sku', resource: 'sku1', detail: { knowledgeBaseId: 'kb1' }, createdAt: new Date(), user: { id: 'u1', name: '用户', email: 'u1@test.com' } },
      { id: 'log3', action: 'create_product_faq', resource: 'faq1', detail: { knowledgeBaseId: 'kb1' }, createdAt: new Date(), user: { id: 'u1', name: '用户', email: 'u1@test.com' } },
      { id: 'log4', action: 'link_product_asset', resource: 'pa1', detail: { knowledgeBaseId: 'kb1' }, createdAt: new Date(), user: { id: 'u1', name: '用户', email: 'u1@test.com' } },
      { id: 'log5', action: 'upload_asset', resource: 'a1', detail: { knowledgeBaseId: 'kb1' }, createdAt: new Date(), user: { id: 'u1', name: '用户', email: 'u1@test.com' } },
    ])
    prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: '连衣裙' }])
    prisma.productSku.findMany.mockResolvedValue([{ id: 'sku1', product: { name: '牛仔裤' } }])
    prisma.productFAQ.findMany.mockResolvedValue([{ id: 'faq1', product: { name: '针织衫' } }])
    prisma.productAsset.findMany.mockResolvedValue([{ id: 'pa1', product: { name: '风衣' } }])

    const logs = await service.listKnowledgeBaseLogs('u1', 'kb1', {})

    expect(logs.map((log) => log.detail)).toEqual([
      { knowledgeBaseId: 'kb1', productName: '连衣裙' },
      { knowledgeBaseId: 'kb1', productName: '牛仔裤' },
      { knowledgeBaseId: 'kb1', productName: '针织衫' },
      { knowledgeBaseId: 'kb1', productName: '风衣' },
      { knowledgeBaseId: 'kb1' },
    ])
  })
})
