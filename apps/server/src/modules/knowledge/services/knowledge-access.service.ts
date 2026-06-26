import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma.service'

@Injectable()
export class KnowledgeAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureKnowledgeBaseAccess(userId: string, knowledgeBaseId: string) {
    void userId
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
      select: { id: true },
    })
    if (!knowledgeBase) throw new NotFoundException('Knowledge base not found')
    return knowledgeBase
  }

  async ensureProductAccess(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true, knowledgeBaseId: true },
    })
    if (!product) throw new NotFoundException('Product not found')
    await this.ensureKnowledgeBaseAccess(userId, product.knowledgeBaseId)
    return product
  }

  async ensureSkuAccess(userId: string, skuId: string) {
    const sku = await this.prisma.productSku.findFirst({
      where: { id: skuId, deletedAt: null },
      select: { id: true, productId: true, skuCode: true },
    })
    if (!sku) throw new NotFoundException('SKU not found')
    await this.ensureProductAccess(userId, sku.productId)
    return sku
  }

  async ensureAssetAccess(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, deletedAt: null },
      select: { id: true, knowledgeBaseId: true },
    })
    if (!asset) throw new NotFoundException('Asset not found')
    await this.ensureKnowledgeBaseAccess(userId, asset.knowledgeBaseId)
    return asset
  }

  async ensureFAQAccess(userId: string, faqId: string) {
    const faq = await this.prisma.productFAQ.findFirst({
      where: { id: faqId, deletedAt: null },
      select: { id: true, productId: true },
    })
    if (!faq) throw new NotFoundException('FAQ not found')
    await this.ensureProductAccess(userId, faq.productId)
    return faq
  }

  async ensurePlatformConnectionAccess(userId: string, connectionId: string) {
    const connection = await this.prisma.platformConnection.findUnique({
      where: { id: connectionId },
      select: { id: true, knowledgeBaseId: true },
    })
    if (!connection) throw new NotFoundException('Platform connection not found')
    await this.ensureKnowledgeBaseAccess(userId, connection.knowledgeBaseId)
    return connection
  }
}
