import { BadRequestException } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { ProductService } from '../src/modules/knowledge/services/product.service'

describe('ProductService', () => {
  const prisma = {
    $transaction: jest.fn(),
    knowledgeBase: { findUnique: jest.fn() },
    product: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
    productSku: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    productFAQ: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    asset: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    productAsset: { updateMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
    importJob: { create: jest.fn(), findMany: jest.fn() },
    sourceMapping: { create: jest.fn() },
    platformConnection: { findFirst: jest.fn(), update: jest.fn() },
    platformSyncJob: { create: jest.fn(), findMany: jest.fn() },
    auditLog: { create: jest.fn(), findMany: jest.fn() },
  }
  const storage = { uploadFile: jest.fn() }
  const access = {
    ensureKnowledgeBaseAccess: jest.fn(),
    ensureProductAccess: jest.fn(),
    ensureSkuAccess: jest.fn(),
    ensureAssetAccess: jest.fn(),
    ensureFAQAccess: jest.fn(),
  }
  let service: ProductService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ProductService(prisma as never, storage as never, access as never)
    prisma.$transaction.mockImplementation((queries: Array<Promise<unknown>>) => Promise.all(queries))
    prisma.knowledgeBase.findUnique.mockResolvedValue({ id: 'kb1' })
    prisma.product.findFirst.mockResolvedValue(null)
    prisma.product.count.mockResolvedValue(0)
    prisma.auditLog.findMany.mockResolvedValue([])
    access.ensureKnowledgeBaseAccess.mockResolvedValue({ id: 'kb1' })
    access.ensureProductAccess.mockResolvedValue({ id: 'p1', knowledgeBaseId: 'kb1' })
    access.ensureSkuAccess.mockResolvedValue({ id: 'sku1', productId: 'p1', skuCode: 'A001' })
    access.ensureAssetAccess.mockResolvedValue({ id: 'asset1', knowledgeBaseId: 'kb1' })
    access.ensureFAQAccess.mockResolvedValue({ id: 'faq1', productId: 'p1' })
  })

  it('creates product with searchable text and audit log', async () => {
    prisma.product.create.mockResolvedValue({ id: 'p1', name: '通勤包' })

    const result = await service.createProduct('u1', 'kb1', {
      name: '通勤包',
      category: '女包',
      series: '通勤款',
      sellingPoints: '轻便大容量',
    })

    expect(result).toEqual({ id: 'p1', name: '通勤包' })
    expect(prisma.product.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        knowledgeBaseId: 'kb1',
        name: '通勤包',
        series: '通勤款',
        source: 'MANUAL',
        searchableText: expect.stringContaining('轻便大容量'),
      }),
    }))
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'u1', action: 'create_product', resource: 'p1' }),
    }))
  })

  it('rejects product creation without style', async () => {
    await expect(service.createProduct('u1', 'kb1', {
      name: '通勤包',
      category: '女包',
      sellingPoints: '轻便大容量',
    } as never)).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.product.create).not.toHaveBeenCalled()
  })

  it('rejects duplicate style inside the same knowledge base', async () => {
    prisma.product.findFirst.mockResolvedValueOnce({ id: 'existing-product' })

    await expect(service.createProduct('u1', 'kb1', {
      name: '通勤包',
      category: '女包',
      brand: 'Jarvis',
      series: '通勤款',
    })).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.product.create).not.toHaveBeenCalled()
  })

  it('rejects duplicate active sku code', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' })
    prisma.productSku.findFirst.mockResolvedValue({ id: 'sku1' })

    await expect(service.createSku('u1', 'p1', { skuCode: 'A001' })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('audits product updates with changed fields', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1', knowledgeBaseId: 'kb1' })
    prisma.product.update.mockResolvedValue({ id: 'p1', knowledgeBaseId: 'kb1', name: 'Updated' })

    await service.updateProduct('u1', 'p1', { name: 'Updated' })

    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'u1',
        action: 'update_product',
        resource: 'p1',
        detail: expect.objectContaining({ changedFields: ['name'] }),
      }),
    }))
  })

  it('batch updates product status inside a knowledge base', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: '包一' }, { id: 'p2', name: '包二' }])
    prisma.product.updateMany.mockResolvedValue({ count: 2 })

    const result = await service.batchUpdateProductStatus('u1', 'kb1', ['p1', 'p2', 'p1'], 'INACTIVE')

    expect(result).toEqual({ requestedCount: 2, updatedCount: 2, skippedCount: 0, status: 'INACTIVE' })
    expect(access.ensureKnowledgeBaseAccess).toHaveBeenCalledWith('u1', 'kb1')
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['p1', 'p2'] },
        knowledgeBaseId: 'kb1',
        deletedAt: null,
      },
      select: { id: true, name: true },
    })
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['p1', 'p2'] },
        knowledgeBaseId: 'kb1',
        deletedAt: null,
      },
      data: { status: 'INACTIVE' },
    })
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'batch_update_product_status',
        resource: 'kb1',
        detail: expect.objectContaining({ requestedCount: 2, updatedCount: 2, status: 'INACTIVE', productNames: ['包一', '包二'] }),
      }),
    }))
  })

  it('batch soft deletes products with skus and faqs', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: '包一' }, { id: 'p2', name: '包二' }])
    prisma.product.updateMany.mockResolvedValue({ count: 2 })
    prisma.productSku.updateMany.mockResolvedValue({ count: 3 })
    prisma.productFAQ.updateMany.mockResolvedValue({ count: 1 })

    const result = await service.batchDeleteProducts('u1', 'kb1', ['p1', 'p2', 'p1', 'missing'])

    expect(result).toEqual({ requestedCount: 3, deletedCount: 2, skippedCount: 1 })
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['p1', 'p2', 'missing'] }, knowledgeBaseId: 'kb1', deletedAt: null },
      select: { id: true, name: true },
    })
    expect(prisma.product.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['p1', 'p2'] }, knowledgeBaseId: 'kb1', deletedAt: null },
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    }))
    expect(prisma.productSku.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { productId: { in: ['p1', 'p2'] }, deletedAt: null },
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    }))
    expect(prisma.productFAQ.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { productId: { in: ['p1', 'p2'] }, deletedAt: null },
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    }))
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'batch_delete_products',
        resource: 'kb1',
        detail: expect.objectContaining({ requestedCount: 3, deletedCount: 2, skippedCount: 1, productNames: ['包一', '包二'] }),
      }),
    }))
  })

  it('batch restores soft deleted products with skus and faqs', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: '包一' }, { id: 'p2', name: '包二' }])
    prisma.product.updateMany.mockResolvedValue({ count: 2 })
    prisma.productSku.updateMany.mockResolvedValue({ count: 3 })
    prisma.productFAQ.updateMany.mockResolvedValue({ count: 1 })

    const result = await service.batchRestoreProducts('u1', 'kb1', ['p1', 'p2', 'p1', 'missing'])

    expect(result).toEqual({ requestedCount: 3, restoredCount: 2, skippedCount: 1 })
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['p1', 'p2', 'missing'] }, knowledgeBaseId: 'kb1', deletedAt: { not: null } },
      select: { id: true, name: true },
    })
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['p1', 'p2'] }, knowledgeBaseId: 'kb1', deletedAt: { not: null } },
      data: { deletedAt: null },
    })
    expect(prisma.productSku.updateMany).toHaveBeenCalledWith({
      where: { productId: { in: ['p1', 'p2'] } },
      data: { deletedAt: null },
    })
    expect(prisma.productFAQ.updateMany).toHaveBeenCalledWith({
      where: { productId: { in: ['p1', 'p2'] } },
      data: { deletedAt: null },
    })
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'batch_restore_products',
        resource: 'kb1',
        detail: expect.objectContaining({ requestedCount: 3, restoredCount: 2, skippedCount: 1, productNames: ['包一', '包二'] }),
      }),
    }))
  })

  it('audits sku creation', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1', knowledgeBaseId: 'kb1' })
    prisma.productSku.findFirst.mockResolvedValue(null)
    prisma.productSku.create.mockResolvedValue({ id: 'sku-new', productId: 'p1', skuCode: 'NEW-001' })

    await service.createSku('u1', 'p1', { skuCode: 'NEW-001' })

    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'u1',
        action: 'create_sku',
        resource: 'sku-new',
        detail: expect.objectContaining({ productId: 'p1', skuCode: 'NEW-001' }),
      }),
    }))
  })

  it('audits product asset linking', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1', knowledgeBaseId: 'kb1' })
    prisma.asset.findFirst.mockResolvedValue({ id: 'asset1', knowledgeBaseId: 'kb1' })
    prisma.productAsset.upsert.mockResolvedValue({ id: 'pa1', productId: 'p1', assetId: 'asset1', isPrimary: true })

    await service.linkAsset('u1', 'p1', { assetId: 'asset1', isPrimary: true })

    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'u1',
        action: 'link_product_asset',
        resource: 'pa1',
        detail: expect.objectContaining({ productId: 'p1', assetId: 'asset1', isPrimary: true }),
      }),
    }))
  })

  it('audits FAQ deletion', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1', knowledgeBaseId: 'kb1', name: '通勤包' })

    await service.deleteFAQ('u1', 'faq1')

    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'u1',
        action: 'delete_product_faq',
        resource: 'faq1',
        detail: expect.objectContaining({ productId: 'p1' }),
      }),
    }))
  })

  it('imports csv and skips existing sku', async () => {
    prisma.productSku.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'sku-existing', color: null, size: null, spec: null, price: null, stockStatus: 'UNKNOWN', platformLink: null, externalProductId: null, externalSkuId: null })
    prisma.product.create.mockResolvedValue({ id: 'p1' })
    prisma.productSku.create.mockResolvedValue({ id: 'sku1' })
    prisma.importJob.create.mockImplementation(({ data }) => Promise.resolve({ id: 'job1', ...data }))

    const csv = Buffer.from('商品名称,款式,SKU,分类,价格\n通勤包,通勤款,A001,女包,299\n背包,基础款,A002,男包,199')
    const result = await service.importProducts('u1', 'kb1', { originalname: 'products.csv', buffer: csv })

    expect(result.createdRows).toBe(1)
    expect(result.skippedRows).toBe(0)
    expect(prisma.product.create).toHaveBeenCalledTimes(1)
    expect(prisma.productSku.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ skuCode: 'A001', source: 'EXCEL', price: 299 }),
    }))
    expect(result.report).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'updated', skuCode: 'A002', updatedFields: ['price'] }),
    ]))
  })

  it('previews import without creating products or import jobs', async () => {
    prisma.productSku.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'sku-existing', color: null, size: null, spec: null, price: 199, stockStatus: 'UNKNOWN', platformLink: null, externalProductId: null, externalSkuId: null })

    const csv = Buffer.from('name,style,SKU,category,price\nBag,Classic,A001,Bags,299\nBag,Classic,A001,Bags,299\nShoe,Runner,A002,Shoes,199')
    const result = await service.previewImportProducts('u1', 'kb1', { originalname: 'preview.csv', buffer: csv })

    expect(result).toEqual(expect.objectContaining({
      fileName: 'preview.csv',
      totalRows: 3,
      createdRows: 1,
      updatedRows: 0,
      createdProductCount: 1,
      createdSkuCount: 1,
      skippedRows: 2,
      errorRows: 0,
    }))
    expect(result.report).toEqual([
      expect.objectContaining({ row: 2, status: 'created', skuCode: 'A001', productName: 'Bag' }),
      expect.objectContaining({ row: 3, status: 'skipped', skuCode: 'A001' }),
      expect.objectContaining({ row: 4, status: 'skipped', skuCode: 'A002' }),
    ])
    expect(prisma.product.create).not.toHaveBeenCalled()
    expect(prisma.productSku.create).not.toHaveBeenCalled()
    expect(prisma.importJob.create).not.toHaveBeenCalled()
  })

  it('groups multiple imported skus under the same product row identity', async () => {
    prisma.productSku.findFirst.mockResolvedValue(null)
    prisma.product.create.mockResolvedValue({ id: 'p-grouped' })
    prisma.productSku.create.mockResolvedValue({ id: 'sku1' })
    prisma.importJob.create.mockImplementation(({ data }) => Promise.resolve({ id: 'job1', ...data }))

    const csv = Buffer.from('name,style,SKU,category,brand,color,price\nCommuter Bag,Classic,BAG-BLACK,Bags,Jarvis,Black,299\nCommuter Bag,Classic,BAG-GRAY,Bags,Jarvis,Gray,299')
    const result = await service.importProducts('u1', 'kb1', { originalname: 'grouped.csv', buffer: csv })

    expect(result.createdRows).toBe(2)
    expect(result.report).toEqual([
      expect.objectContaining({ status: 'created', skuCode: 'BAG-BLACK', productKey: 'commuter bag|bags|jarvis|classic' }),
      expect.objectContaining({ status: 'created', skuCode: 'BAG-GRAY', productKey: 'commuter bag|bags|jarvis|classic' }),
    ])
    expect(prisma.product.create).toHaveBeenCalledTimes(1)
    expect(prisma.productSku.create).toHaveBeenCalledTimes(2)
    expect(prisma.productSku.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ productId: 'p-grouped', skuCode: 'BAG-BLACK', color: 'Black' }),
    }))
    expect(prisma.productSku.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ productId: 'p-grouped', skuCode: 'BAG-GRAY', color: 'Gray' }),
    }))
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'import_products',
        detail: expect.objectContaining({ createdProductCount: 1, createdSkuCount: 2 }),
      }),
    }))
  })

  it('requires style when importing product rows', async () => {
    const csv = Buffer.from('name,SKU,category,brand,color,price\nCommuter Bag,BAG-NO-STYLE,Bags,Jarvis,Black,299')
    const result = await service.previewImportProducts('u1', 'kb1', { originalname: 'missing-style.csv', buffer: csv })

    expect(result.createdRows).toBe(0)
    expect(result.errorRows).toBe(1)
    expect(result.report).toEqual([
      expect.objectContaining({ status: 'error', reason: '缺少商品名称、款式或 SKU', skuCode: 'BAG-NO-STYLE' }),
    ])
  })

  it('creates separate style records when the same product has different styles with repeated color and size', async () => {
    prisma.productSku.findFirst.mockResolvedValue(null)
    prisma.product.findFirst.mockResolvedValue(null)
    prisma.product.create
      .mockResolvedValueOnce({ id: 'p-style-1' })
      .mockResolvedValueOnce({ id: 'p-style-2' })
    prisma.productSku.create.mockResolvedValue({ id: 'sku-new' })
    prisma.importJob.create.mockImplementation(({ data }) => Promise.resolve({ id: 'job1', ...data }))

    const csv = Buffer.from('name,style,SKU,category,brand,color,size,price\nCommuter Bag,Classic,BAG-CLASSIC-BLACK-L,Bags,Jarvis,Black,L,299\nCommuter Bag,Urban,BAG-URBAN-BLACK-L,Bags,Jarvis,Black,L,329')
    const result = await service.importProducts('u1', 'kb1', { originalname: 'multi-style.csv', buffer: csv })

    expect(result.createdRows).toBe(2)
    expect(result.report).toEqual([
      expect.objectContaining({ productKey: 'commuter bag|bags|jarvis|classic' }),
      expect.objectContaining({ productKey: 'commuter bag|bags|jarvis|urban' }),
    ])
    expect(prisma.product.create).toHaveBeenCalledTimes(2)
    expect(prisma.productSku.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ productId: 'p-style-1', skuCode: 'BAG-CLASSIC-BLACK-L', color: 'Black', size: 'L' }),
    }))
    expect(prisma.productSku.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ productId: 'p-style-2', skuCode: 'BAG-URBAN-BLACK-L', color: 'Black', size: 'L' }),
    }))
  })

  it('increments existing product imports by skipping existing skus and creating only missing skus', async () => {
    prisma.productSku.findFirst
      .mockResolvedValueOnce({ id: 'sku-existing', color: 'Black', size: null, spec: null, price: null, stockStatus: 'UNKNOWN', platformLink: null, externalProductId: null, externalSkuId: null })
      .mockResolvedValueOnce(null)
    prisma.product.findFirst.mockResolvedValue({ id: 'p-existing' })
    prisma.productSku.create.mockResolvedValue({ id: 'sku1' })
    prisma.importJob.create.mockImplementation(({ data }) => Promise.resolve({ id: 'job1', ...data }))

    const csv = Buffer.from('name,style,SKU,category,brand,color,price\nCommuter Bag,Classic,BAG-OLD,Bags,Jarvis,Black,299\nCommuter Bag,Classic,BAG-NEW,Bags,Jarvis,Blue,299')
    const result = await service.importProducts('u1', 'kb1', { originalname: 'existing-product.csv', buffer: csv })

    expect(result.createdRows).toBe(1)
    expect(result.skippedRows).toBe(0)
    expect(prisma.product.create).not.toHaveBeenCalled()
    expect(prisma.productSku.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sku-existing' },
      data: expect.objectContaining({ price: 299 }),
    }))
    expect(prisma.productSku.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ productId: 'p-existing', skuCode: 'BAG-NEW', source: 'EXCEL' }),
    }))
    expect(result.report).toEqual([
      expect.objectContaining({ status: 'updated', skuCode: 'BAG-OLD', reason: 'SKU 已存在，已补全空字段' }),
      expect.objectContaining({ status: 'created', skuCode: 'BAG-NEW', target: 'existing_product' }),
    ])
    expect(result.report).toEqual(expect.arrayContaining([
      expect.objectContaining({ reason: '已补充到已有商品' }),
    ]))
  })

  it('skips an existing sku when no empty fields can be backfilled', async () => {
    prisma.productSku.findFirst.mockResolvedValue({
      id: 'sku-full',
      color: 'Black',
      size: 'L',
      spec: 'standard',
      price: 299,
      stockStatus: 'IN_STOCK',
      platformLink: 'https://example.com/item/1',
      externalProductId: '1001',
      externalSkuId: '1001-BLACK-L',
    })
    prisma.importJob.create.mockImplementation(({ data }) => Promise.resolve({ id: 'job1', ...data }))

    const csv = Buffer.from('name,style,SKU,category,brand,color,size,spec,price,stockStatus,platformLink,externalProductId,externalSkuId\nCommuter Bag,Classic,BAG-FULL,Bags,Jarvis,Black,L,standard,299,IN_STOCK,https://example.com/item/1,1001,1001-BLACK-L')
    const result = await service.importProducts('u1', 'kb1', { originalname: 'full-existing.csv', buffer: csv })

    expect(result.createdRows).toBe(0)
    expect(result.skippedRows).toBe(1)
    expect(prisma.productSku.create).not.toHaveBeenCalled()
    expect(prisma.productSku.update).not.toHaveBeenCalled()
    expect(result.report).toEqual([
      expect.objectContaining({ status: 'skipped', skuCode: 'BAG-FULL', reason: 'SKU 已存在，已跳过' }),
    ])
  })

  it('creates a new sku when the same product has the same variant details but a different sku code', async () => {
    prisma.productSku.findFirst.mockResolvedValue(null)
    prisma.product.findFirst.mockResolvedValue({ id: 'p-existing' })
    prisma.productSku.create.mockResolvedValue({ id: 'sku-new' })
    prisma.importJob.create.mockImplementation(({ data }) => Promise.resolve({ id: 'job1', ...data }))

    const csv = Buffer.from('name,style,SKU,category,brand,color,size,spec,price\nCommuter Bag,Classic,BAG-CHANNEL-2,Bags,Jarvis,Black,L,standard,299')
    const result = await service.importProducts('u1', 'kb1', { originalname: 'same-variant-new-sku.csv', buffer: csv })

    expect(result.createdRows).toBe(1)
    expect(result.skippedRows).toBe(0)
    expect(prisma.productSku.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        productId: 'p-existing',
        skuCode: 'BAG-CHANNEL-2',
        color: 'Black',
        size: 'L',
        spec: 'standard',
      }),
    }))
  })

  it('imports xlsx product rows', async () => {
    prisma.productSku.findFirst.mockResolvedValue(null)
    prisma.product.create.mockResolvedValue({ id: 'p1' })
    prisma.productSku.create.mockResolvedValue({ id: 'sku1' })
    prisma.importJob.create.mockImplementation(({ data }) => Promise.resolve({ id: 'job1', ...data }))

    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.json_to_sheet([
      { 商品名称: '通勤包', 款式: '通勤款', SKU: 'XLSX-001', 分类: '女包', 价格: 399, 库存状态: '有货' },
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, '商品')
    const buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))

    const result = await service.importProducts('u1', 'kb1', { originalname: 'products.xlsx', buffer })

    expect(result.createdRows).toBe(1)
    expect(prisma.productSku.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ skuCode: 'XLSX-001', source: 'EXCEL', price: 399, stockStatus: 'IN_STOCK' }),
    }))
  })

  it('downloads a Jarvis xlsx import template', () => {
    const template = service.getImportTemplate()
    const workbook = XLSX.read(template.content, { type: 'buffer' })

    expect(template.fileName).toBe('jarvis-product-import-template.xlsx')
    expect(workbook.SheetNames).toEqual(['商品导入', '字段说明'])
    const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets['商品导入']!, { header: 1 })
    expect(rows[0]).toEqual(expect.arrayContaining(['商品名称', '款式', 'SKU', '供应商名称', '安全库存下限', '主仓位']))
  })

  it('imports xlsx rows with a note row before the header', async () => {
    prisma.productSku.findFirst.mockResolvedValue(null)
    prisma.product.create.mockResolvedValue({ id: 'p1' })
    prisma.productSku.create.mockResolvedValue({ id: 'sku1' })
    prisma.importJob.create.mockImplementation(({ data }) => Promise.resolve({ id: 'job1', ...data }))

    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ['提示：可同时填入成本、商品价格信息进行导入', '', '', '', '', ''],
      ['商品名（必填）', '款式编码', '商品编码', '颜色（必填）', '尺寸（必填）', '商品价格', '商品成本'],
      ['通勤包', 'LEGACY-STYLE', 'LEGACY-001', '黑色', '大号', '299', '160'],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, 'Worksheet')
    const buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))

    const result = await service.importProducts('u1', 'kb1', { originalname: 'legacy.xlsx', buffer })

    expect(result.createdRows).toBe(1)
    expect(prisma.productSku.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ skuCode: 'LEGACY-001', color: '黑色', size: '大号', price: 299 }),
    }))
  })

  it('syncMissing only creates missing sku items', async () => {
    prisma.productSku.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'sku-existing' })
    prisma.product.create.mockResolvedValue({ id: 'p1' })
    prisma.productSku.create.mockResolvedValue({ id: 'sku1' })
    prisma.sourceMapping.create.mockResolvedValue({ id: 'map1' })

    const result = await service.syncMissing('u1', 'kb1', {
      items: [
        { platform: 'demo', externalProductId: '100', name: '包', skuCode: 'A001' },
        { platform: 'demo', externalProductId: '101', name: '鞋', skuCode: 'A002' },
      ],
    })

    expect(result.createdCount).toBe(1)
    expect(result.skippedCount).toBe(1)
    expect(prisma.product.create).toHaveBeenCalledTimes(1)
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'u1',
        action: 'sync_missing_products',
        resource: 'kb1',
        detail: expect.objectContaining({ createdCount: 1, skippedCount: 1, totalItems: 2 }),
      }),
    }))
  })

  it('checks knowledge base access before listing products', async () => {
    prisma.product.findMany.mockResolvedValue([])
    prisma.product.count.mockResolvedValue(0)

    const result = await service.listProducts('u2', 'kb1', {})

    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 20 })
    expect(access.ensureKnowledgeBaseAccess).toHaveBeenCalledWith('u2', 'kb1')
    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ knowledgeBaseId: 'kb1', deletedAt: null }),
      skip: 0,
      take: 20,
    }))
  })

  it('can list only deleted products', async () => {
    prisma.product.findMany.mockResolvedValue([])
    prisma.product.count.mockResolvedValue(0)

    const result = await service.listProducts('u2', 'kb1', { deleted: 'only' })

    expect(result.total).toBe(0)
    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ knowledgeBaseId: 'kb1', deletedAt: { not: null } }),
    }))
  })

  it('searches products by Chinese terms across sku and FAQ fields', async () => {
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'p1',
        knowledgeBaseId: 'kb1',
        name: '通勤托特包',
        category: '女包',
        brand: 'Jarvis',
        series: null,
        sellingPoints: '轻便大容量',
        description: null,
        notes: '避免暴晒',
        skus: [
          { skuCode: 'BAG-BLACK-L', color: '黑色', size: '大号', spec: null, price: 299, stockStatus: 'IN_STOCK', platformLink: 'https://example.com/item/1001' },
        ],
        assets: [
          { isPrimary: true, asset: { fileUrl: 'assets/kb1/bag.jpg' } },
        ],
        faqs: [
          { question: '适合通勤吗', answer: '适合上班通勤和短途出行' },
        ],
      },
    ])

    const result = await service.searchProducts('kb1', '黑色大号通勤包')

    expect(result[0]).toEqual(expect.objectContaining({
      productName: '通勤托特包',
      knowledgeBaseId: 'kb1',
      skuCode: 'BAG-BLACK-L',
      imageUrl: 'assets/kb1/bag.jpg',
      price: 299,
      stockStatus: 'IN_STOCK',
      notes: '避免暴晒',
      skus: [expect.objectContaining({ color: '黑色', size: '大号', platformLink: 'https://example.com/item/1001' })],
      faqs: [expect.objectContaining({ answer: '适合上班通勤和短途出行' })],
    }))
    expect(result[0]!.score).toBeGreaterThan(0)
  })
})
