import { PlatformIntegrationService } from '../src/modules/knowledge/services/platform-integration.service'

describe('PlatformIntegrationService', () => {
  const prisma = {
    knowledgeBase: { findUnique: jest.fn() },
    platformConnection: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    platformSyncJob: { create: jest.fn(), findMany: jest.fn() },
    auditLog: { create: jest.fn() },
  }
  const access = {
    ensureKnowledgeBaseAccess: jest.fn(),
    ensurePlatformConnectionAccess: jest.fn(),
  }
  let service: PlatformIntegrationService

  beforeEach(() => {
    jest.clearAllMocks()
    prisma.knowledgeBase.findUnique.mockResolvedValue({ id: 'kb1' })
    access.ensureKnowledgeBaseAccess.mockResolvedValue({ id: 'kb1' })
    access.ensurePlatformConnectionAccess.mockResolvedValue({ id: 'conn1', knowledgeBaseId: 'kb1' })
    service = new PlatformIntegrationService(prisma as never, access as never)
  })

  it('creates platform connection with disabled default', async () => {
    prisma.platformConnection.create.mockResolvedValue({
      id: 'conn1',
      platform: 'taobao',
      name: 'Taobao main shop',
      status: 'DISABLED',
    })

    const result = await service.createConnection('u1', 'kb1', {
      platform: 'taobao',
      shop: 'main',
      name: 'Taobao main shop',
    })

    expect(result.id).toBe('conn1')
    expect(prisma.platformConnection.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        knowledgeBaseId: 'kb1',
        platform: 'taobao',
        shop: 'main',
        status: 'DISABLED',
        creatorId: 'u1',
      }),
    }))
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'create_platform_connection', resource: 'conn1' }),
    }))
  })

  it('records sync missing job and touches matching connection', async () => {
    prisma.platformConnection.findFirst.mockResolvedValue({ id: 'conn1' })
    prisma.platformConnection.update.mockResolvedValue({ id: 'conn1' })
    prisma.platformSyncJob.create.mockImplementation(({ data }) => Promise.resolve({ id: 'job1', ...data }))

    const job = await service.createSyncJob('u1', 'kb1', [
      { platform: 'taobao', shop: 'main', externalProductId: '1001', name: 'Bag', skuCode: 'BAG-001' },
    ], { createdCount: 1, skippedCount: 0, created: [{ id: 'p1' }], skipped: [] })

    expect(job).toEqual(expect.objectContaining({
      id: 'job1',
      connectionId: 'conn1',
      mode: 'SYNC_MISSING',
      totalItems: 1,
      createdItems: 1,
    }))
    expect(prisma.platformConnection.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'conn1' },
      data: expect.objectContaining({ status: 'ENABLED' }),
    }))
  })

  it('checks knowledge base access before listing connections', async () => {
    prisma.platformConnection.findMany.mockResolvedValue([])

    await service.listConnections('u2', 'kb1')

    expect(access.ensureKnowledgeBaseAccess).toHaveBeenCalledWith('u2', 'kb1')
    expect(prisma.platformConnection.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { knowledgeBaseId: 'kb1' },
    }))
  })

  it('audits connector item fetching without storing credentials', async () => {
    prisma.platformConnection.findUnique.mockResolvedValue({
      id: 'conn1',
      knowledgeBaseId: 'kb1',
      platform: 'demo',
      shop: 'main',
      status: 'ENABLED',
      config: {
        items: [
          { externalProductId: '1001', externalSkuId: '1001-A', name: 'Bag', skuCode: 'BAG-001' },
        ],
      },
    })

    const items = await service.fetchConnectionItems('u1', 'conn1')

    expect(items).toEqual([expect.objectContaining({ platform: 'demo', shop: 'main', skuCode: 'BAG-001' })])
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'u1',
        action: 'fetch_platform_connection_items',
        resource: 'conn1',
        detail: expect.objectContaining({ fetchedCount: 1, platform: 'demo', shop: 'main' }),
      }),
    }))
    expect(prisma.auditLog.create.mock.calls[0][0].data.detail).not.toHaveProperty('config')
  })
})
