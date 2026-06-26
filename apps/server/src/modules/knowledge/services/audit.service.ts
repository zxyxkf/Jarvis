import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@/infrastructure/database/prisma.service'
import { KnowledgeAccessService } from './knowledge-access.service'

type AuditLogWithUser = Prisma.AuditLogGetPayload<{
  include: { user: { select: { id: true; name: true; email: true } } }
}>
type AuditDetail = Record<string, Prisma.JsonValue>

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: KnowledgeAccessService,
  ) {}

  async listKnowledgeBaseLogs(
    userId: string,
    knowledgeBaseId: string,
    query: { action?: string; q?: string; startDate?: string; endDate?: string; limit?: number },
  ) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100)
    const startDate = query.startDate ? new Date(query.startDate) : undefined
    const endDate = query.endDate ? new Date(query.endDate) : undefined
    const createdAt: Prisma.DateTimeFilter | undefined = {
      ...(startDate && !Number.isNaN(startDate.getTime()) ? { gte: startDate } : {}),
      ...(endDate && !Number.isNaN(endDate.getTime()) ? { lte: endDate } : {}),
    }
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(createdAt && Object.keys(createdAt).length > 0 ? { createdAt } : {}),
      AND: [
        {
          OR: [
            { resource: knowledgeBaseId },
            { detail: { path: ['knowledgeBaseId'], equals: knowledgeBaseId } },
          ],
        },
        ...(query.q
          ? [{
              OR: [
                { action: { contains: query.q, mode: 'insensitive' as const } },
                { resource: { contains: query.q, mode: 'insensitive' as const } },
                { user: { name: { contains: query.q, mode: 'insensitive' as const } } },
                { user: { email: { contains: query.q, mode: 'insensitive' as const } } },
              ],
            }]
          : []),
      ],
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return this.withProductNames(logs, knowledgeBaseId)
  }

  private async withProductNames(logs: AuditLogWithUser[], knowledgeBaseId: string) {
    if (logs.length === 0) return logs
    const productIds = new Set<string>()
    const skuIds = new Set<string>()
    const faqIds = new Set<string>()
    const productAssetIds = new Set<string>()

    for (const log of logs) {
      const detail = this.readDetail(log.detail)
      if (this.productNameFromDetail(detail)) continue
      this.collectString(detail.productId, productIds)
      this.collectStringArray(detail.productIds, productIds)
      if (this.isProductResourceAction(log.action)) this.collectString(log.resource, productIds)
      if (this.isSkuResourceAction(log.action)) this.collectString(log.resource, skuIds)
      if (this.isFaqResourceAction(log.action)) this.collectString(log.resource, faqIds)
      if (this.isProductAssetResourceAction(log.action)) this.collectString(log.resource, productAssetIds)
      if (log.action === 'unlink_product_asset') this.collectString(log.resource, productIds)
    }

    const [products, skus, faqs, productAssets] = await Promise.all([
      productIds.size
        ? this.prisma.product.findMany({
            where: { id: { in: [...productIds] }, knowledgeBaseId },
            select: { id: true, name: true },
          })
        : [],
      skuIds.size
        ? this.prisma.productSku.findMany({
            where: { id: { in: [...skuIds] }, product: { knowledgeBaseId } },
            select: { id: true, product: { select: { name: true } } },
          })
        : [],
      faqIds.size
        ? this.prisma.productFAQ.findMany({
            where: { id: { in: [...faqIds] }, product: { knowledgeBaseId } },
            select: { id: true, product: { select: { name: true } } },
          })
        : [],
      productAssetIds.size
        ? this.prisma.productAsset.findMany({
            where: { id: { in: [...productAssetIds] }, product: { knowledgeBaseId } },
            select: { id: true, product: { select: { name: true } } },
          })
        : [],
    ])

    const productNameById = new Map(products.map((product) => [product.id, product.name]))
    const skuProductNameById = new Map(skus.map((sku) => [sku.id, sku.product.name]))
    const faqProductNameById = new Map(faqs.map((faq) => [faq.id, faq.product.name]))
    const productAssetProductNameById = new Map(productAssets.map((asset) => [asset.id, asset.product.name]))

    return logs.map((log) => {
      const detail = this.readDetail(log.detail)
      if (this.productNameFromDetail(detail)) return log
      const names = new Set<string>()

      this.addProductName(detail.productId, productNameById, names)
      if (Array.isArray(detail.productIds)) {
        for (const productId of detail.productIds) this.addProductName(productId, productNameById, names)
      }
      if (this.isProductResourceAction(log.action) || log.action === 'unlink_product_asset') {
        this.addProductName(log.resource, productNameById, names)
      }
      if (this.isSkuResourceAction(log.action)) this.addMapName(log.resource, skuProductNameById, names)
      if (this.isFaqResourceAction(log.action)) this.addMapName(log.resource, faqProductNameById, names)
      if (this.isProductAssetResourceAction(log.action)) this.addMapName(log.resource, productAssetProductNameById, names)
      if (names.size === 0) return log

      const productNames = [...names]
      const hydratedDetail: AuditDetail = {
        ...detail,
        ...(productNames.length === 1 ? { productName: productNames[0] as string } : { productNames }),
      }
      return { ...log, detail: hydratedDetail }
    })
  }

  private readDetail(detail: Prisma.JsonValue | null): AuditDetail {
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) return detail as AuditDetail
    return {}
  }

  private productNameFromDetail(detail: AuditDetail) {
    if (typeof detail.productName === 'string' && detail.productName) return detail.productName
    if (Array.isArray(detail.productNames) && detail.productNames.some((name) => typeof name === 'string' && name)) return detail.productNames
    return null
  }

  private collectString(value: Prisma.JsonValue | undefined | null, target: Set<string>) {
    if (typeof value === 'string' && value) target.add(value)
  }

  private collectStringArray(value: Prisma.JsonValue | undefined | null, target: Set<string>) {
    if (!Array.isArray(value)) return
    for (const item of value) this.collectString(item, target)
  }

  private addProductName(value: Prisma.JsonValue | string | null | undefined, productNameById: Map<string, string>, target: Set<string>) {
    if (typeof value !== 'string') return
    this.addMapName(value, productNameById, target)
  }

  private addMapName(value: string | null | undefined, nameById: Map<string, string>, target: Set<string>) {
    if (!value) return
    const name = nameById.get(value)
    if (name) target.add(name)
  }

  private isProductResourceAction(action: string) {
    return ['create_product', 'update_product', 'delete_product'].includes(action)
  }

  private isSkuResourceAction(action: string) {
    return ['create_sku', 'update_sku', 'delete_sku'].includes(action)
  }

  private isFaqResourceAction(action: string) {
    return ['create_product_faq', 'delete_product_faq'].includes(action)
  }

  private isProductAssetResourceAction(action: string) {
    return action === 'link_product_asset'
  }
}
