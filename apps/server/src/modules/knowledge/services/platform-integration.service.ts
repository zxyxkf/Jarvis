import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@/infrastructure/database/prisma.service'
import { KnowledgeAccessService } from './knowledge-access.service'
import { CreatePlatformConnectionDto, SyncMissingDto, UpdatePlatformConnectionDto } from '../dto/product.dto'

type SyncItem = SyncMissingDto['items'][number]

@Injectable()
export class PlatformIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: KnowledgeAccessService,
  ) {}

  async listConnections(userId: string, knowledgeBaseId: string) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    return this.prisma.platformConnection.findMany({
      where: { knowledgeBaseId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })
  }

  async createConnection(userId: string, knowledgeBaseId: string, dto: CreatePlatformConnectionDto) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    const connection = await this.prisma.platformConnection.create({
      data: {
        knowledgeBaseId,
        platform: dto.platform.trim(),
        shop: dto.shop?.trim() || null,
        name: dto.name.trim(),
        config: this.toJson(dto.config),
        status: dto.status ?? 'DISABLED',
        creatorId: userId,
      },
    })
    await this.audit(userId, 'create_platform_connection', connection.id, {
      knowledgeBaseId,
      platform: connection.platform,
      shop: connection.shop,
      status: connection.status,
    })
    return connection
  }

  async updateConnection(userId: string, connectionId: string, dto: UpdatePlatformConnectionDto) {
    await this.access.ensurePlatformConnectionAccess(userId, connectionId)
    const existing = await this.getConnection(connectionId)
    const connection = await this.prisma.platformConnection.update({
      where: { id: connectionId },
      data: {
        shop: dto.shop === undefined ? undefined : dto.shop.trim() || null,
        name: dto.name === undefined ? undefined : dto.name.trim(),
        config: dto.config === undefined ? undefined : this.toJson(dto.config),
        status: dto.status,
      },
    })
    await this.audit(userId, 'update_platform_connection', connection.id, {
      knowledgeBaseId: existing.knowledgeBaseId,
      platform: connection.platform,
      shop: connection.shop,
      status: dto.status,
      changedFields: Object.keys(dto),
    })
    return connection
  }

  async deleteConnection(userId: string, connectionId: string) {
    await this.access.ensurePlatformConnectionAccess(userId, connectionId)
    const connection = await this.getConnection(connectionId)
    await this.prisma.platformConnection.delete({ where: { id: connectionId } })
    await this.audit(userId, 'delete_platform_connection', connectionId, {
      knowledgeBaseId: connection.knowledgeBaseId,
      platform: connection.platform,
      shop: connection.shop,
    })
    return { ok: true }
  }

  async listSyncJobs(userId: string, knowledgeBaseId: string) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    return this.prisma.platformSyncJob.findMany({
      where: { knowledgeBaseId },
      include: { connection: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
  }

  async createPreviewJob(userId: string, knowledgeBaseId: string, items: SyncItem[], previewItems: Array<SyncItem & { action: string }>) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    const job = await this.prisma.platformSyncJob.create({
      data: {
        knowledgeBaseId,
        platform: this.pickPlatform(items),
        shop: this.pickShop(items),
        mode: 'PREVIEW',
        status: 'COMPLETED',
        totalItems: previewItems.length,
        createdItems: previewItems.filter((item) => item.action === 'create').length,
        skippedItems: previewItems.filter((item) => item.action === 'skip').length,
        report: this.toJson(previewItems),
        creatorId: userId,
      },
    })
    await this.audit(userId, 'preview_platform_sync', job.id, {
      knowledgeBaseId,
      platform: job.platform,
      shop: job.shop,
      totalItems: job.totalItems,
      createdItems: job.createdItems,
      skippedItems: job.skippedItems,
    })
    return job
  }

  async createSyncJob(
    userId: string,
    knowledgeBaseId: string,
    items: SyncItem[],
    result: { createdCount: number; skippedCount: number; created?: unknown[]; skipped?: unknown[] },
  ) {
    await this.access.ensureKnowledgeBaseAccess(userId, knowledgeBaseId)
    const connection = await this.findMatchingConnection(knowledgeBaseId, items)
    const job = await this.prisma.platformSyncJob.create({
      data: {
        knowledgeBaseId,
        connectionId: connection?.id,
        platform: this.pickPlatform(items),
        shop: this.pickShop(items),
        mode: 'SYNC_MISSING',
        status: 'COMPLETED',
        totalItems: items.length,
        createdItems: result.createdCount,
        skippedItems: result.skippedCount,
        report: this.toJson({ items, created: result.created, skipped: result.skipped }),
        creatorId: userId,
      },
    })
    if (connection) {
      await this.prisma.platformConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date(), status: 'ENABLED' },
      })
    }
    await this.audit(userId, 'sync_missing_platform_products', job.id, {
      knowledgeBaseId,
      platform: job.platform,
      shop: job.shop,
      createdItems: job.createdItems,
      skippedItems: job.skippedItems,
      totalItems: job.totalItems,
    })
    return job
  }

  async fetchConnectionItems(userId: string, connectionId: string): Promise<SyncItem[]> {
    await this.access.ensurePlatformConnectionAccess(userId, connectionId)
    const connection = await this.getConnection(connectionId)
    if (connection.status !== 'ENABLED') throw new BadRequestException('Platform connection is disabled')
    const config = (connection.config ?? {}) as Record<string, unknown>
    if (Array.isArray(config.items)) {
      const items = config.items.map((item) => this.normalizeItem(connection.platform, connection.shop ?? undefined, item))
      await this.audit(userId, 'fetch_platform_connection_items', connection.id, {
        knowledgeBaseId: connection.knowledgeBaseId,
        platform: connection.platform,
        shop: connection.shop,
        fetchedCount: items.length,
      })
      return items
    }
    await this.audit(userId, 'fetch_platform_connection_items', connection.id, {
      knowledgeBaseId: connection.knowledgeBaseId,
      platform: connection.platform,
      shop: connection.shop,
      fetchedCount: 0,
    })
    return []
  }

  private normalizeItem(platform: string, shop: string | undefined, item: unknown): SyncItem {
    const record = item as Record<string, unknown>
    if (!record.externalProductId || !record.name || !record.skuCode) {
      throw new BadRequestException('Connector item requires externalProductId, name and skuCode')
    }
    return {
      platform,
      shop,
      externalProductId: String(record.externalProductId),
      externalSkuId: record.externalSkuId ? String(record.externalSkuId) : undefined,
      name: String(record.name),
      skuCode: String(record.skuCode),
      category: record.category ? String(record.category) : undefined,
      brand: record.brand ? String(record.brand) : undefined,
      price: record.price === undefined || record.price === null || record.price === '' ? undefined : Number(record.price),
      stockStatus: this.normalizeStockStatus(record.stockStatus),
      platformLink: record.platformLink ? String(record.platformLink) : undefined,
    }
  }

  private normalizeStockStatus(value: unknown): SyncItem['stockStatus'] {
    const text = String(value ?? 'UNKNOWN')
    if (['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNKNOWN'].includes(text)) return text as SyncItem['stockStatus']
    return undefined
  }

  private async getConnection(connectionId: string) {
    const connection = await this.prisma.platformConnection.findUnique({ where: { id: connectionId } })
    if (!connection) throw new NotFoundException('Platform connection not found')
    return connection
  }

  private async findMatchingConnection(knowledgeBaseId: string, items: SyncItem[]) {
    const platform = this.pickPlatform(items)
    const shop = this.pickShop(items)
    return this.prisma.platformConnection.findFirst({
      where: { knowledgeBaseId, platform, shop: shop ?? null },
    })
  }

  private pickPlatform(items: SyncItem[]) {
    return items[0]?.platform ?? 'manual'
  }

  private pickShop(items: SyncItem[]) {
    return items[0]?.shop
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
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
