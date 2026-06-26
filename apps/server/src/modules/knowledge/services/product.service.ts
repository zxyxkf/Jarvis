import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, ProductSource, ProductStatus, StockStatus } from '@prisma/client'
import * as XLSX from 'xlsx'
import { PrismaService } from '@/infrastructure/database/prisma.service'
import { StorageService } from '@/infrastructure/storage/storage.service'
import { KnowledgeAccessService } from './knowledge-access.service'
import {
  CreateFAQDto,
  CreateProductDto,
  CreateSkuDto,
  LinkProductAssetDto,
  SyncMissingDto,
  UpdateProductDto,
  UpdateSkuDto,
} from '../dto/product.dto'

type ImportReportItem = {
  row: number
  status: 'created' | 'updated' | 'skipped' | 'error'
  reason?: string
  skuCode?: string
  productName?: string
  productKey?: string
  target?: 'new_product' | 'existing_product'
  updatedFields?: string[]
  source?: Record<string, string>
}

type ImportRowValues = {
  name?: string
  skuCode?: string
  category?: string
  brand?: string
  series?: string
  sellingPoints?: string
  notes?: string
  color?: string
  size?: string
  spec?: string
  price?: number
  stockStatus: StockStatus
  platformLink?: string
  externalProductId?: string
  externalSkuId?: string
}

type ImportCreatePlan = {
  action: 'create'
  rowData: Record<string, string>
  values: ImportRowValues & { name: string; skuCode: string }
  productKey: string
  existingProductId?: string
}

type ImportUpdatePlan = {
  action: 'update'
  rowData: Record<string, string>
  values: ImportRowValues & { name: string; skuCode: string }
  productKey: string
  skuId: string
  updatedFields: string[]
  data: Prisma.ProductSkuUpdateInput
}

type ImportAnalysis = {
  totalRows: number
  createdRows: number
  updatedRows: number
  skippedRows: number
  errorRows: number
  createdProductCount: number
  createdSkuCount: number
  report: ImportReportItem[]
  plans: Array<ImportCreatePlan | ImportUpdatePlan>
}

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: KnowledgeAccessService,
  ) {}

  getImportTemplate() {
    const rows = [
      [
        '商品名称',
        'SKU',
        '分类',
        '品牌',
        '款式',
        '颜色',
        '尺码',
        '规格',
        '颜色及规格',
        '价格',
        '商品成本',
        '市场|吊牌价',
        '库存状态',
        '图片',
        '卖点',
        '注意事项',
        '平台链接',
        '外部商品ID',
        '外部SKUID',
        '款式编码',
        '供应商名称',
        '商品标签',
        '备注',
        '安全库存下限',
        '安全库存上限',
        '主仓位',
      ],
      [
        '通勤托特包',
        'BAG-BLACK-L',
        '女包',
        'Jarvis',
        '通勤款',
        '黑色',
        '大号',
        '大容量',
        '黑色;大号',
        '299',
        '160',
        '399',
        '有货',
        'https://example.com/item/1001.jpg',
        '轻便大容量，适合通勤',
        '避免暴晒',
        'https://example.com/item/1001',
        '1001',
        '1001-BLACK-L',
        'BAG-STYLE-001',
        '示例供应商',
        '通勤,热卖',
        '客服优先推荐黑色大号',
        '10',
        '100',
        'A-1-01',
      ],
    ]
    const workbook = XLSX.utils.book_new()
    const importSheet = XLSX.utils.aoa_to_sheet(rows)
    importSheet['!cols'] = rows[0]!.map((header) => ({ wch: Math.max(12, String(header).length + 4) }))
    XLSX.utils.book_append_sheet(workbook, importSheet, '商品导入')

    const guideRows = [
      ['字段', '是否必填', '说明'],
      ['商品名称', '是', '商品主名称；同一个商品多 SKU 可以重复填写'],
      ['SKU', '是', '唯一货号；也兼容原模板里的“商品编码”“规格编号”'],
      ['款式', '是', '商品下的唯一款式；同一商品可有多个款式，一个款式可有多个 SKU；也兼容旧表头“系列”“款式编码”'],
      ['颜色/尺码/规格', '否', 'SKU 属性，不参与款式唯一性判断；不同款式可以有相同颜色和尺码'],
      ['价格', '否', '销售价；也兼容“商品价格”“基本售价”'],
      ['商品成本/市场|吊牌价', '否', '已预留在模板中，当前导入不覆盖商品主数据'],
      ['库存状态', '否', '支持：有货、低库存、无货、IN_STOCK、LOW_STOCK、OUT_OF_STOCK'],
      ['图片', '否', '可填图片 URL，后续用于素材库和商品图自动关联'],
      ['卖点/注意事项/备注', '否', '用于客服话术和 AI 检索；备注会合并到注意事项'],
      ['平台链接/外部商品ID/外部SKUID', '否', '后续对接淘宝、抖店、拼多多、ERP 开放接口时用于映射'],
      ['供应商名称', '否', '建议优先用知识库名称表示供应商；本字段作为跨供应商表格预留'],
      ['安全库存/主仓位', '否', '库存管理预留字段，当前导入保留在记录来源中'],
    ]
    const guideSheet = XLSX.utils.aoa_to_sheet(guideRows)
    guideSheet['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 70 }]
    XLSX.utils.book_append_sheet(workbook, guideSheet, '字段说明')

    return {
      fileName: 'jarvis-product-import-template.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
      fields: [
        { name: '商品名称', required: true, description: '商品主名称，同一个商品多 SKU 可重复填写' },
        { name: 'SKU', required: true, description: '唯一货号；已存在会跳过，不覆盖人工维护数据' },
        { name: '库存状态', required: false, description: '支持：有货、低库存、无货、IN_STOCK、LOW_STOCK、OUT_OF_STOCK' },
        { name: '平台链接', required: false, description: '淘宝/抖店/拼多多/ERP 等商品页或后台链接' },
        { name: '外部商品ID', required: false, description: '后续平台 API 同步时用于映射外部商品' },
        { name: '外部SKUID', required: false, description: '后续平台 API 同步时用于映射外部 SKU' },
      ],
    }
  }

  async listProducts(
    userId: string,
    knowledgeBaseId: string,
    query: { q?: string; category?: string; status?: ProductStatus; source?: ProductSource; deleted?: 'none' | 'only' | 'with'; page?: number; pageSize?: number },
  ) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    const page = Math.max(1, Math.floor(Number(query.page) || 1))
    const pageSize = Math.min(100, Math.max(10, Math.floor(Number(query.pageSize) || 20)))
    const where: Prisma.ProductWhereInput = {
      knowledgeBaseId,
      ...(query.deleted === 'only'
        ? { deletedAt: { not: null } }
        : query.deleted === 'with'
          ? {}
          : { deletedAt: null }),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
    }
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { category: { contains: query.q, mode: 'insensitive' } },
        { brand: { contains: query.q, mode: 'insensitive' } },
        { series: { contains: query.q, mode: 'insensitive' } },
        { skus: { some: { skuCode: { contains: query.q, mode: 'insensitive' }, deletedAt: null } } },
      ]
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: this.productInclude(),
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ])
    return { items: await this.withProductActors(items), total, page, pageSize }
  }

  async getProduct(userId: string, productId: string) {
    await this.access.ensureProductAccess(userId, productId)
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      include: this.productInclude(),
    })
    if (!product) throw new NotFoundException('商品不存在')
    return product
  }

  async createProduct(userId: string, knowledgeBaseId: string, dto: CreateProductDto) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    if (!dto.series?.trim()) throw new BadRequestException('请填写款式；一个商品可以有多个款式，每个款式下再维护多个 SKU')
    await this.ensureProductIdentityAvailable(knowledgeBaseId, dto)
    return this.prisma.product.create({
      data: {
        ...dto,
        status: dto.status ?? 'ACTIVE',
        source: 'MANUAL',
        knowledgeBaseId,
        maintainerId: userId,
        searchableText: this.buildSearchableText(dto),
      },
      include: this.productInclude(),
    }).then(async (product) => {
      await this.audit(userId, 'create_product', product.id, { knowledgeBaseId, productId: product.id, productName: product.name })
      return product
    })
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductDto) {
    await this.getProduct(userId, productId)
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...dto,
        searchableText: this.buildSearchableText(dto),
      },
      include: this.productInclude(),
    })
    await this.audit(userId, 'update_product', product.id, {
      knowledgeBaseId: product.knowledgeBaseId,
      productId: product.id,
      productName: product.name,
      changedFields: Object.keys(dto),
    })
    return product
  }

  async batchUpdateProductStatus(userId: string, knowledgeBaseId: string, productIds: string[], status: ProductStatus) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    const uniqueIds = Array.from(new Set(productIds.filter(Boolean))).slice(0, 100)
    if (uniqueIds.length === 0) return { requestedCount: 0, updatedCount: 0, skippedCount: 0, status }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: uniqueIds },
        knowledgeBaseId,
        deletedAt: null,
      },
      select: { id: true, name: true },
    })
    const updatableIds = products.map((product) => product.id)
    const result = await this.prisma.product.updateMany({
      where: {
        id: { in: updatableIds },
        knowledgeBaseId,
        deletedAt: null,
      },
      data: { status },
    })
    await this.audit(userId, 'batch_update_product_status', knowledgeBaseId, {
      knowledgeBaseId,
      requestedCount: uniqueIds.length,
      updatedCount: result.count,
      skippedCount: uniqueIds.length - result.count,
      status,
      productIds: updatableIds,
      productNames: products.map((product) => product.name),
    })
    return {
      requestedCount: uniqueIds.length,
      updatedCount: result.count,
      skippedCount: uniqueIds.length - result.count,
      status,
    }
  }

  async deleteProduct(userId: string, productId: string) {
    const product = await this.getProduct(userId, productId)
    const deletedAt = new Date()
    await this.prisma.product.update({ where: { id: productId }, data: { deletedAt } })
    await this.prisma.productSku.updateMany({ where: { productId }, data: { deletedAt } })
    await this.prisma.productFAQ.updateMany({ where: { productId }, data: { deletedAt } })
    await this.audit(userId, 'delete_product', productId, { knowledgeBaseId: product.knowledgeBaseId, productId, productName: product.name })
    return { ok: true }
  }

  async batchDeleteProducts(userId: string, knowledgeBaseId: string, productIds: string[]) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    const uniqueIds = Array.from(new Set(productIds.filter(Boolean))).slice(0, 100)
    if (uniqueIds.length === 0) return { requestedCount: 0, deletedCount: 0, skippedCount: 0 }

    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueIds }, knowledgeBaseId, deletedAt: null },
      select: { id: true, name: true },
    })
    const deletableIds = products.map((product) => product.id)
    if (deletableIds.length === 0) {
      await this.audit(userId, 'batch_delete_products', knowledgeBaseId, {
        knowledgeBaseId,
        requestedCount: uniqueIds.length,
        deletedCount: 0,
        skippedCount: uniqueIds.length,
        productIds: uniqueIds,
      })
      return { requestedCount: uniqueIds.length, deletedCount: 0, skippedCount: uniqueIds.length }
    }

    const deletedAt = new Date()
    const result = await this.prisma.product.updateMany({
      where: { id: { in: deletableIds }, knowledgeBaseId, deletedAt: null },
      data: { deletedAt },
    })
    await this.prisma.productSku.updateMany({ where: { productId: { in: deletableIds }, deletedAt: null }, data: { deletedAt } })
    await this.prisma.productFAQ.updateMany({ where: { productId: { in: deletableIds }, deletedAt: null }, data: { deletedAt } })
    await this.audit(userId, 'batch_delete_products', knowledgeBaseId, {
      knowledgeBaseId,
      requestedCount: uniqueIds.length,
      deletedCount: result.count,
      skippedCount: uniqueIds.length - result.count,
      productIds: deletableIds,
      productNames: products.map((product) => product.name),
    })
    return {
      requestedCount: uniqueIds.length,
      deletedCount: result.count,
      skippedCount: uniqueIds.length - result.count,
    }
  }

  async batchRestoreProducts(userId: string, knowledgeBaseId: string, productIds: string[]) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    const uniqueIds = Array.from(new Set(productIds.filter(Boolean))).slice(0, 100)
    if (uniqueIds.length === 0) return { requestedCount: 0, restoredCount: 0, skippedCount: 0 }

    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueIds }, knowledgeBaseId, deletedAt: { not: null } },
      select: { id: true, name: true },
    })
    const restorableIds = products.map((product) => product.id)
    if (restorableIds.length === 0) {
      await this.audit(userId, 'batch_restore_products', knowledgeBaseId, {
        knowledgeBaseId,
        requestedCount: uniqueIds.length,
        restoredCount: 0,
        skippedCount: uniqueIds.length,
        productIds: uniqueIds,
      })
      return { requestedCount: uniqueIds.length, restoredCount: 0, skippedCount: uniqueIds.length }
    }

    const result = await this.prisma.product.updateMany({
      where: { id: { in: restorableIds }, knowledgeBaseId, deletedAt: { not: null } },
      data: { deletedAt: null },
    })
    await this.prisma.productSku.updateMany({ where: { productId: { in: restorableIds } }, data: { deletedAt: null } })
    await this.prisma.productFAQ.updateMany({ where: { productId: { in: restorableIds } }, data: { deletedAt: null } })
    await this.audit(userId, 'batch_restore_products', knowledgeBaseId, {
      knowledgeBaseId,
      requestedCount: uniqueIds.length,
      restoredCount: result.count,
      skippedCount: uniqueIds.length - result.count,
      productIds: restorableIds,
      productNames: products.map((product) => product.name),
    })
    return {
      requestedCount: uniqueIds.length,
      restoredCount: result.count,
      skippedCount: uniqueIds.length - result.count,
    }
  }

  async createSku(userId: string, productId: string, dto: CreateSkuDto, source: ProductSource = 'MANUAL') {
    const product = await this.getProduct(userId, productId)
    await this.ensureSkuAvailable(product.knowledgeBaseId, dto.skuCode)
    const sku = await this.prisma.productSku.create({
      data: { ...dto, productId, source, stockStatus: dto.stockStatus ?? 'UNKNOWN' },
    })
    await this.audit(userId, 'create_sku', sku.id, { knowledgeBaseId: product.knowledgeBaseId, productId, productName: product.name, skuCode: sku.skuCode, source })
    return sku
  }

  async updateSku(userId: string, skuId: string, dto: UpdateSkuDto) {
    const sku = await this.access.ensureSkuAccess(userId, skuId)
    const product = await this.getProduct(userId, sku.productId)
    if (dto.skuCode && dto.skuCode !== sku.skuCode) await this.ensureSkuAvailable(product.knowledgeBaseId, dto.skuCode)
    const updated = await this.prisma.productSku.update({ where: { id: skuId }, data: dto })
    await this.audit(userId, 'update_sku', skuId, {
      knowledgeBaseId: product.knowledgeBaseId,
      productId: sku.productId,
      productName: product.name,
      changedFields: Object.keys(dto),
      skuCode: updated.skuCode,
    })
    return updated
  }

  async deleteSku(userId: string, skuId: string) {
    const sku = await this.access.ensureSkuAccess(userId, skuId)
    await this.prisma.productSku.update({ where: { id: skuId }, data: { deletedAt: new Date() } })
    const product = await this.getProduct(userId, sku.productId)
    await this.audit(userId, 'delete_sku', skuId, { knowledgeBaseId: product.knowledgeBaseId, productId: sku.productId, productName: product.name, skuCode: sku.skuCode })
    return { ok: true }
  }

  async listAssets(userId: string, knowledgeBaseId: string) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    return this.prisma.asset.findMany({
      where: { knowledgeBaseId, deletedAt: null },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async uploadAsset(
    userId: string,
    knowledgeBaseId: string,
    file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
  ) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8')
    const objectName = `assets/${knowledgeBaseId}/${crypto.randomUUID()}-${fileName}`
    const fileUrl = await this.storage.uploadFile(objectName, file.buffer, file.mimetype)
    const asset = await this.prisma.asset.create({
      data: {
        knowledgeBaseId,
        fileName,
        fileType: fileName.split('.').pop()?.toLowerCase() ?? 'file',
        mimeType: file.mimetype,
        fileSize: file.size,
        fileUrl,
        assetType: file.mimetype.startsWith('image/') ? 'IMAGE' : file.mimetype.startsWith('video/') ? 'VIDEO' : 'FILE',
        uploaderId: userId,
      },
    })
    await this.audit(userId, 'upload_asset', asset.id, { knowledgeBaseId })
    return asset
  }

  async linkAsset(userId: string, productId: string, dto: LinkProductAssetDto) {
    const product = await this.getProduct(userId, productId)
    const asset = await this.prisma.asset.findFirst({
      where: { id: dto.assetId, knowledgeBaseId: product.knowledgeBaseId, deletedAt: null },
    })
    if (!asset) throw new NotFoundException('素材不存在')
    if (dto.isPrimary) {
      await this.prisma.productAsset.updateMany({ where: { productId }, data: { isPrimary: false } })
    }
    const linkedAsset = await this.prisma.productAsset.upsert({
      where: { productId_assetId: { productId, assetId: dto.assetId } },
      update: { isPrimary: dto.isPrimary ?? false, sortOrder: dto.sortOrder ?? 0 },
      create: { productId, assetId: dto.assetId, isPrimary: dto.isPrimary ?? false, sortOrder: dto.sortOrder ?? 0 },
      include: { asset: true },
    })
    await this.audit(userId, 'link_product_asset', linkedAsset.id, {
      knowledgeBaseId: product.knowledgeBaseId,
      productId,
      productName: product.name,
      assetId: dto.assetId,
      assetName: asset.fileName,
      isPrimary: linkedAsset.isPrimary,
    })
    return linkedAsset
  }

  async deleteAsset(userId: string, assetId: string) {
    const asset = await this.access.ensureAssetAccess(userId, assetId)
    const existingAsset = await this.prisma.asset.findFirst({ where: { id: assetId }, select: { fileName: true } })
    await this.prisma.asset.update({ where: { id: assetId }, data: { deletedAt: new Date() } })
    await this.prisma.productAsset.deleteMany({ where: { assetId } })
    await this.audit(userId, 'delete_asset', assetId, { knowledgeBaseId: asset.knowledgeBaseId, assetName: existingAsset?.fileName })
    return { ok: true }
  }

  async unlinkAsset(userId: string, productId: string, assetId: string) {
    const product = await this.getProduct(userId, productId)
    await this.access.ensureAssetAccess(userId, assetId)
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId }, select: { fileName: true } })
    await this.prisma.productAsset.deleteMany({ where: { productId, assetId } })
    await this.audit(userId, 'unlink_product_asset', productId, {
      knowledgeBaseId: product.knowledgeBaseId,
      productId,
      productName: product.name,
      assetId,
      assetName: asset?.fileName,
    })
    return { ok: true }
  }

  async createFAQ(userId: string, productId: string, dto: CreateFAQDto) {
    const product = await this.getProduct(userId, productId)
    const faq = await this.prisma.productFAQ.create({ data: { ...dto, productId, sortOrder: dto.sortOrder ?? 0 } })
    await this.audit(userId, 'create_product_faq', faq.id, { knowledgeBaseId: product.knowledgeBaseId, productId, productName: product.name })
    return faq
  }

  async deleteFAQ(userId: string, faqId: string) {
    const faq = await this.access.ensureFAQAccess(userId, faqId)
    await this.prisma.productFAQ.update({ where: { id: faqId }, data: { deletedAt: new Date() } })
    const product = await this.getProduct(userId, faq.productId)
    await this.audit(userId, 'delete_product_faq', faqId, { knowledgeBaseId: product.knowledgeBaseId, productId: faq.productId, productName: product.name })
    return { ok: true }
  }

  async previewImportProducts(userId: string, knowledgeBaseId: string, file: { originalname: string; buffer: Buffer }) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    const analysis = await this.analyzeImport(file, knowledgeBaseId)
    return {
      fileName: file.originalname,
      totalRows: analysis.totalRows,
      createdRows: analysis.createdRows,
      updatedRows: analysis.updatedRows,
      skippedRows: analysis.skippedRows,
      errorRows: analysis.errorRows,
      createdProductCount: analysis.createdProductCount,
      createdSkuCount: analysis.createdSkuCount,
      report: analysis.report,
    }
  }

  async importProducts(userId: string, knowledgeBaseId: string, file: { originalname: string; buffer: Buffer }) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    const analysis = await this.analyzeImport(file, knowledgeBaseId)
    const productByImportKey = new Map<string, { id: string }>()

    for (const plan of analysis.plans) {
      if (plan.action === 'update') {
        await this.prisma.productSku.update({ where: { id: plan.skuId }, data: plan.data })
        continue
      }
      let product = productByImportKey.get(plan.productKey)
      if (!product && plan.existingProductId) product = { id: plan.existingProductId }
      if (!product) {
        product = await this.prisma.product.create({
          data: {
            knowledgeBaseId,
            name: plan.values.name,
            category: plan.values.category,
            brand: plan.values.brand,
            series: plan.values.series,
            sellingPoints: plan.values.sellingPoints,
            notes: plan.values.notes,
            source: 'EXCEL',
            maintainerId: userId,
            searchableText: Object.values(plan.rowData).filter(Boolean).join(' '),
          },
        })
      }
      productByImportKey.set(plan.productKey, product)
      await this.prisma.productSku.create({
        data: {
          productId: product.id,
          skuCode: plan.values.skuCode,
          color: plan.values.color,
          size: plan.values.size,
          spec: plan.values.spec,
          price: plan.values.price,
          stockStatus: plan.values.stockStatus,
          platformLink: plan.values.platformLink,
          externalProductId: plan.values.externalProductId,
          externalSkuId: plan.values.externalSkuId,
          source: 'EXCEL',
        },
      })
    }

    const job = await this.prisma.importJob.create({
      data: {
        knowledgeBaseId,
        fileName: file.originalname,
        totalRows: analysis.totalRows,
        createdRows: analysis.createdRows,
        skippedRows: analysis.skippedRows,
        errorRows: analysis.errorRows,
        report: analysis.report,
        creatorId: userId,
      },
    })
    await this.audit(userId, 'import_products', job.id, {
      knowledgeBaseId,
      createdRows: analysis.createdRows,
      updatedRows: analysis.updatedRows,
      skippedRows: analysis.skippedRows,
      errorRows: analysis.errorRows,
      createdProductCount: analysis.createdProductCount,
      createdSkuCount: analysis.createdSkuCount,
      fileName: file.originalname,
      productNames: Array.from(new Set(analysis.plans.map((plan) => plan.values.name))).slice(0, 8),
    })
    return job
  }

  async listImportJobs(userId: string, knowledgeBaseId: string) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    return this.prisma.importJob.findMany({ where: { knowledgeBaseId }, orderBy: { createdAt: 'desc' }, take: 20 })
  }

  async syncPreview(dto: SyncMissingDto, knowledgeBaseId?: string) {
    const results = []
    for (const item of dto.items ?? []) {
      const existing = await this.prisma.productSku.findFirst({
        where: {
          skuCode: item.skuCode,
          deletedAt: null,
          ...(knowledgeBaseId ? { product: { knowledgeBaseId } } : {}),
        },
      })
      results.push({ ...item, action: existing ? 'skip' : 'create' })
    }
    return { items: results }
  }

  async syncMissing(userId: string, knowledgeBaseId: string, dto: SyncMissingDto) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    const created = []
    const skipped = []
    for (const item of dto.items ?? []) {
      const existing = await this.prisma.productSku.findFirst({
        where: { skuCode: item.skuCode, deletedAt: null, product: { knowledgeBaseId } },
      })
      if (existing) {
        skipped.push(item)
        continue
      }
      const product = await this.prisma.product.create({
        data: {
          knowledgeBaseId,
          name: item.name,
          category: item.category,
          brand: item.brand,
          source: 'API',
          maintainerId: userId,
          searchableText: Object.values(item).filter(Boolean).join(' '),
        },
      })
      await this.prisma.productSku.create({
        data: {
          productId: product.id,
          skuCode: item.skuCode,
          price: item.price,
          stockStatus: item.stockStatus ?? 'UNKNOWN',
          platformLink: item.platformLink,
          externalProductId: item.externalProductId,
          externalSkuId: item.externalSkuId,
          source: 'API',
        },
      })
      await this.prisma.sourceMapping.create({
        data: {
          productId: product.id,
          platform: item.platform,
          shop: item.shop,
          externalProductId: item.externalProductId,
          externalSkuId: item.externalSkuId,
          lastSyncedAt: new Date(),
        },
      })
      created.push(product)
    }
    await this.audit(userId, 'sync_missing_products', knowledgeBaseId, {
      knowledgeBaseId,
      totalItems: dto.items?.length ?? 0,
      createdCount: created.length,
      skippedCount: skipped.length,
      productNames: created.map((product) => product.name).slice(0, 8),
    })
    return { createdCount: created.length, skippedCount: skipped.length, created, skipped }
  }

  async searchProducts(knowledgeBaseId: string, query: string) {
    const terms = this.tokenizeQuery(query)
    if (terms.length === 0) return []
    const products = await this.prisma.product.findMany({
      where: {
        knowledgeBaseId,
        deletedAt: null,
        OR: terms.flatMap((term) => [
          { name: { contains: term, mode: 'insensitive' as const } },
          { category: { contains: term, mode: 'insensitive' as const } },
          { brand: { contains: term, mode: 'insensitive' as const } },
          { series: { contains: term, mode: 'insensitive' as const } },
          { sellingPoints: { contains: term, mode: 'insensitive' as const } },
          { description: { contains: term, mode: 'insensitive' as const } },
          { notes: { contains: term, mode: 'insensitive' as const } },
          { skus: { some: { skuCode: { contains: term, mode: 'insensitive' as const }, deletedAt: null } } },
          { skus: { some: { color: { contains: term, mode: 'insensitive' as const }, deletedAt: null } } },
          { skus: { some: { size: { contains: term, mode: 'insensitive' as const }, deletedAt: null } } },
          { faqs: { some: { question: { contains: term, mode: 'insensitive' as const }, deletedAt: null } } },
          { faqs: { some: { answer: { contains: term, mode: 'insensitive' as const }, deletedAt: null } } },
        ]),
      },
      include: this.productInclude(),
      take: 30,
    })
    return products.map((product) => {
      const primary = product.assets.find((item) => item.isPrimary) ?? product.assets[0]
      const scoredSkus = product.skus
        .map((sku) => ({ sku, score: this.scoreText([sku.skuCode, sku.color, sku.size, sku.spec].join(' '), terms) }))
        .sort((a, b) => b.score - a.score)
      const sku = scoredSkus[0]?.sku ?? product.skus[0]
      const score = this.scoreProduct(product, terms)
      return {
        type: 'product' as const,
        productId: product.id,
        knowledgeBaseId: product.knowledgeBaseId,
        productName: product.name,
        category: product.category,
        brand: product.brand,
        skuCode: sku?.skuCode,
        imageUrl: primary?.asset.fileUrl,
        price: sku?.price,
        stockStatus: sku?.stockStatus,
        sellingPoints: product.sellingPoints,
        notes: product.notes,
        skus: product.skus.slice(0, 5).map((item) => ({
          skuCode: item.skuCode,
          color: item.color,
          size: item.size,
          price: item.price,
          stockStatus: item.stockStatus,
          platformLink: item.platformLink,
        })),
        faqs: product.faqs.slice(0, 3).map((faq) => ({ question: faq.question, answer: faq.answer })),
        score,
      }
    }).sort((a, b) => b.score - a.score).slice(0, 5)
  }

  private productInclude() {
    return {
      maintainer: { select: { id: true, name: true, email: true } },
      skus: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' as const } },
      assets: { include: { asset: true }, orderBy: { sortOrder: 'asc' as const } },
      faqs: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' as const } },
    }
  }

  private async withProductActors<T extends Array<{ id: string; maintainer?: { id: string; name: string; email: string } | null }>>(products: T) {
    if (products.length === 0) return products
    const latestUpdateLogs = await this.prisma.auditLog.findMany({
      where: { action: 'update_product', resource: { in: products.map((product) => product.id) } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const updatedByProduct = new Map<string, { id: string; name: string; email: string }>()
    for (const log of latestUpdateLogs) {
      if (log.resource && !updatedByProduct.has(log.resource)) updatedByProduct.set(log.resource, log.user)
    }
    return products.map((product) => ({
      ...product,
      createdBy: product.maintainer ?? null,
      updatedBy: updatedByProduct.get(product.id) ?? product.maintainer ?? null,
    }))
  }

  private async ensureKnowledgeBase(id: string) {
    const kb = await this.prisma.knowledgeBase.findUnique({ where: { id }, select: { id: true } })
    if (!kb) throw new NotFoundException('知识库不存在')
  }

  private async ensureProductIdentityAvailable(knowledgeBaseId: string, dto: Pick<CreateProductDto, 'name' | 'category' | 'brand' | 'series'>) {
    const existing = await this.findProductByIdentity(knowledgeBaseId, dto)
    if (existing) throw new BadRequestException('当前知识库中已存在相同款式')
  }

  private async ensureSkuAvailable(knowledgeBaseId: string, skuCode: string) {
    const existing = await this.prisma.productSku.findFirst({
      where: { skuCode, deletedAt: null, product: { knowledgeBaseId } },
    })
    if (existing) throw new BadRequestException('SKU 已存在')
  }

  private async findProductByIdentity(
    knowledgeBaseId: string,
    values: Pick<ImportRowValues, 'name' | 'category' | 'brand' | 'series'>,
  ) {
    const series = values.series?.trim()
    if (!series) return null
    return this.prisma.product.findFirst({
      where: {
        knowledgeBaseId,
        deletedAt: null,
        series: { equals: series, mode: 'insensitive' },
      },
      select: { id: true },
    })
  }

  private optionalTextFilter(value?: string) {
    const normalized = value?.trim()
    return normalized ? { equals: normalized, mode: 'insensitive' as const } : null
  }

  private buildSkuBackfill(
    values: ImportRowValues,
    existing: {
      color?: string | null
      size?: string | null
      spec?: string | null
      price?: number | null
      stockStatus?: StockStatus | null
      platformLink?: string | null
      externalProductId?: string | null
      externalSkuId?: string | null
    },
  ) {
    const data: Prisma.ProductSkuUpdateInput = {}
    const updatedFields: string[] = []
    const setIfEmpty = <Key extends keyof Prisma.ProductSkuUpdateInput>(
      field: Key,
      current: unknown,
      next: Prisma.ProductSkuUpdateInput[Key] | undefined,
    ) => {
      if (next === undefined || next === null || next === '') return
      if (current !== undefined && current !== null && current !== '') return
      data[field] = next
      updatedFields.push(String(field))
    }

    setIfEmpty('color', existing.color, values.color)
    setIfEmpty('size', existing.size, values.size)
    setIfEmpty('spec', existing.spec, values.spec)
    setIfEmpty('price', existing.price, values.price)
    setIfEmpty('platformLink', existing.platformLink, values.platformLink)
    setIfEmpty('externalProductId', existing.externalProductId, values.externalProductId)
    setIfEmpty('externalSkuId', existing.externalSkuId, values.externalSkuId)
    if ((!existing.stockStatus || existing.stockStatus === 'UNKNOWN') && values.stockStatus !== 'UNKNOWN') {
      data.stockStatus = values.stockStatus
      updatedFields.push('stockStatus')
    }
    return { data, updatedFields }
  }

  private buildSearchableText(data: Partial<CreateProductDto>) {
    return [data.name, data.category, data.brand, data.series, data.sellingPoints, data.description, data.notes]
      .filter(Boolean)
      .join(' ')
  }

  private async analyzeImport(file: { originalname: string; buffer: Buffer }, knowledgeBaseId?: string): Promise<ImportAnalysis> {
    const rows = this.parseImportRows(file)
    const report: ImportReportItem[] = []
    const plans: Array<ImportCreatePlan | ImportUpdatePlan> = []
    const seenSkus = new Set<string>()
    const createdProductKeys = new Set<string>()
    let updatedRows = 0
    let skippedRows = 0
    let errorRows = 0

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]!
      const rowNumber = i + 2
      const values = this.importRowValues(row)
      const name = values.name
      const skuCode = values.skuCode
      const style = values.series
      if (!name || !style || !skuCode) {
        errorRows += 1
        report.push({ row: rowNumber, status: 'error', reason: '缺少商品名称、款式或 SKU', skuCode, productName: name, source: row })
        continue
      }
      if (seenSkus.has(skuCode)) {
        skippedRows += 1
        report.push({ row: rowNumber, status: 'skipped', reason: '导入文件内 SKU 重复，已跳过', skuCode, productName: name, source: row })
        continue
      }
      seenSkus.add(skuCode)
      const existing = await this.prisma.productSku.findFirst({
        where: {
          skuCode,
          deletedAt: null,
          ...(knowledgeBaseId ? { product: { knowledgeBaseId } } : {}),
        },
        select: {
          id: true,
          color: true,
          size: true,
          spec: true,
          price: true,
          stockStatus: true,
          platformLink: true,
          externalProductId: true,
          externalSkuId: true,
        },
      })
      if (existing) {
        const update = this.buildSkuBackfill(values, existing)
        if (Object.keys(update.data).length > 0) {
          updatedRows += 1
          plans.push({
            action: 'update',
            rowData: row,
            values: { ...values, name, skuCode, series: style },
            productKey: this.importProductKey(values),
            skuId: existing.id,
            updatedFields: update.updatedFields,
            data: update.data,
          })
          report.push({
            row: rowNumber,
            status: 'updated',
            reason: 'SKU 已存在，已补全空字段',
            skuCode,
            productName: name,
            updatedFields: update.updatedFields,
            source: row,
          })
        } else {
          skippedRows += 1
          report.push({ row: rowNumber, status: 'skipped', reason: 'SKU 已存在，已跳过', skuCode, productName: name, source: row })
        }
        continue
      }
      const rowValues = { ...values, name, skuCode, series: style }
      const productKey = this.importProductKey(rowValues)
      const existingProduct = knowledgeBaseId ? await this.findProductByIdentity(knowledgeBaseId, rowValues) : null
      if (!existingProduct) createdProductKeys.add(productKey)
      plans.push({
        action: 'create',
        rowData: row,
        values: rowValues,
        productKey,
        existingProductId: existingProduct?.id,
      })
      report.push({
        row: rowNumber,
        status: 'created',
        skuCode,
        productName: name,
        productKey,
        target: existingProduct ? 'existing_product' : 'new_product',
        reason: existingProduct ? '已补充到已有商品' : undefined,
        source: row,
      })
    }

    return {
      totalRows: rows.length,
      createdRows: plans.filter((plan) => plan.action === 'create').length,
      updatedRows,
      skippedRows,
      errorRows,
      createdProductCount: createdProductKeys.size,
      createdSkuCount: plans.filter((plan) => plan.action === 'create').length,
      report,
      plans,
    }
  }

  private importRowValues(row: Record<string, string>) {
    const pick = (...keys: string[]) => {
      for (const key of keys) {
        const value = row[key]?.trim()
        if (value) return value
      }
      return undefined
    }
    const combinedSpec = pick('颜色及规格', '颜色规格', 'colorAndSpec')
    const [combinedColor, combinedSize, ...combinedRest] = combinedSpec?.split(/[;；,/，|]/).map((part) => part.trim()).filter(Boolean) ?? []
    return {
      name: pick('商品名称', '商品名', '商品名（必填）', 'name'),
      skuCode: pick('SKU', 'sku', 'skuCode', '商品编码', '商品编码（必填）', '规格编号', '规格编号（必填）'),
      category: pick('分类', 'category'),
      brand: pick('品牌', 'brand'),
      series: pick('款式', '商品款式', '款式名称', 'style', 'styleName', '系列', '款式编码', 'series'),
      sellingPoints: pick('卖点', '商品标签', 'sellingPoints'),
      notes: [pick('注意事项', 'notes'), pick('备注', '订单留言备注')]
        .filter(Boolean)
        .join('；') || undefined,
      color: pick('颜色', '颜色（必填）', 'color') ?? combinedColor,
      size: pick('尺码', '尺寸', '尺寸（必填）', 'size') ?? combinedSize,
      spec: pick('规格', 'spec') ?? (combinedRest.join(';') || combinedSpec),
      price: this.parsePrice(pick('价格', '商品价格', '基本售价', 'price')),
      stockStatus: this.parseStock(pick('库存状态', '商品状态', 'stockStatus')),
      platformLink: pick('平台链接', 'platformLink'),
      externalProductId: pick('外部商品ID', 'externalProductId', '供应商款式编码'),
      externalSkuId: pick('外部SKUID', 'externalSkuId', '供应商商品编码'),
    }
  }

  private importProductKey(values: ReturnType<ProductService['importRowValues']>) {
    return [values.name, values.category, values.brand, values.series]
      .map((value) => (value ?? '').trim().toLowerCase())
      .join('|')
  }

  private parseCsv(text: string) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    if (lines.length < 2) return []
    const parsedLines = lines.map((line) => this.splitCsvLine(line))
    const headerIndex = parsedLines.findIndex((row) => this.isImportHeaderRow(row))
    if (headerIndex < 0) return []
    const headers = parsedLines[headerIndex]!.map((header) => header.replace(/^\uFEFF/, '').trim())
    return parsedLines.slice(headerIndex + 1)
      .filter((values) => !this.isImportInstructionRow(values))
      .map((values) =>
        Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
      )
  }

  private parseImportRows(file: { originalname: string; buffer: Buffer }) {
    const ext = file.originalname.split('.').pop()?.toLowerCase()
    if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) return []
      const sheet = workbook.Sheets[sheetName]
      if (!sheet) return []
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: false })
      const headerIndex = rows.findIndex((row) => this.isImportHeaderRow(row))
      if (headerIndex < 0) return []
      const headers = rows[headerIndex]!.map((value) => String(value).replace(/^\uFEFF/, '').trim())
      return rows.slice(headerIndex + 1)
        .filter((row) => row.some((value) => String(value).trim()))
        .filter((row) => !this.isImportInstructionRow(row))
        .map((row) =>
          Object.fromEntries(
            headers.map((header, index) => [header, row[index] === null || row[index] === undefined ? '' : String(row[index]).trim()]),
          ),
        )
    }
    return this.parseCsv(file.buffer.toString('utf8'))
  }

  private isImportHeaderRow(row: unknown[]) {
    const headers = row.map((value) => String(value).replace(/^\uFEFF/, '').trim())
    const normalized = headers.map((header) => header.replace(/[（(].*?[）)]/g, ''))
    const hasName = normalized.some((header) => ['商品名称', '商品名', 'name'].includes(header))
    const hasSku = normalized.some((header) => ['SKU', 'sku', 'skuCode', '商品编码', '规格编号'].includes(header))
    return hasName && hasSku
  }

  private isImportInstructionRow(row: unknown[]) {
    const firstCell = String(row[0] ?? '').trim()
    return firstCell.startsWith('提示：') || firstCell.startsWith('导入说明：') || firstCell.startsWith('使用本模板')
  }

  private splitCsvLine(line: string) {
    const result: string[] = []
    let current = ''
    let quoted = false
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i]
      if (char === '"') {
        quoted = !quoted
      } else if (char === ',' && !quoted) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  private escapeCsv(value: string) {
    if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
    return value
  }

  private parsePrice(value?: string) {
    if (!value) return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  private parseStock(value?: string): StockStatus {
    if (value === '有货' || value === 'IN_STOCK') return 'IN_STOCK'
    if (value === '低库存' || value === 'LOW_STOCK') return 'LOW_STOCK'
    if (value === '无货' || value === 'OUT_OF_STOCK') return 'OUT_OF_STOCK'
    return 'UNKNOWN'
  }

  private tokenizeQuery(query: string) {
    const rawTerms = query
      .toLowerCase()
      .replace(/[，。！？、；：,.!?;:()[\]{}"'`]/g, ' ')
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2)
    const expanded = rawTerms.flatMap((term) => {
      if (!/[\u4e00-\u9fff]/.test(term) || term.length <= 2) return [term]
      const grams = []
      for (let i = 0; i < term.length - 1; i += 1) grams.push(term.slice(i, i + 2))
      return [term, ...grams]
    })
    return Array.from(new Set(expanded))
      .slice(0, 12)
  }

  private scoreProduct(product: {
    name: string
    category: string | null
    brand: string | null
    series: string | null
    sellingPoints: string | null
    description: string | null
    notes: string | null
    skus: Array<{ skuCode: string; color: string | null; size: string | null; spec: string | null }>
    faqs: Array<{ question: string; answer: string }>
  }, terms: string[]) {
    return Math.min(1, (
      this.scoreText(product.name, terms) * 0.3
      + this.scoreText([product.category, product.brand, product.series].join(' '), terms) * 0.18
      + this.scoreText([product.sellingPoints, product.description, product.notes].join(' '), terms) * 0.2
      + Math.max(0, ...product.skus.map((sku) => this.scoreText([sku.skuCode, sku.color, sku.size, sku.spec].join(' '), terms))) * 0.22
      + Math.max(0, ...product.faqs.map((faq) => this.scoreText(`${faq.question} ${faq.answer}`, terms))) * 0.1
    ))
  }

  private scoreText(text: string, terms: string[]) {
    const normalized = text.toLowerCase()
    if (!normalized) return 0
    const hits = terms.filter((term) => normalized.includes(term)).length
    return hits / Math.max(terms.length, 1)
  }

  private async audit(userId: string | undefined, action: string, resource?: string, detail?: unknown) {
    if (!userId) return
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        detail: detail === undefined ? undefined : JSON.parse(JSON.stringify(detail)),
      },
    })
  }
}
