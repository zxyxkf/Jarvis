import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma.service'
import { CreateKnowledgeBaseDto, UpdateKnowledgeBaseDto } from '../dto/knowledge-base.dto'

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateKnowledgeBaseDto) {
    return this.prisma.knowledgeBase.create({
      data: { ...dto, ownerId: userId },
    })
  }

  async findAll(userId: string) {
    void userId
    return this.prisma.knowledgeBase.findMany({
      include: { _count: { select: { documents: true } } },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async findById(userId: string, id: string) {
    void userId
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id },
      include: { _count: { select: { documents: true, chunks: true } } },
    })
    if (!kb) throw new NotFoundException('知识库不存在')
    return kb
  }

  async update(userId: string, id: string, dto: UpdateKnowledgeBaseDto) {
    await this.findById(userId, id)
    return this.prisma.knowledgeBase.update({
      where: { id },
      data: dto,
    })
  }

  async delete(userId: string, id: string) {
    await this.findById(userId, id)
    const importJobCount = await this.prisma.importJob.count({ where: { knowledgeBaseId: id } })
    if (importJobCount > 0) {
      throw new BadRequestException('该知识库已有导入记录，导入记录需要保留，不允许删除知识库')
    }
    await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { knowledgeBaseId: id },
        select: { id: true },
      })
      const productIds = products.map((product) => product.id)
      const connections = await tx.platformConnection.findMany({
        where: { knowledgeBaseId: id },
        select: { id: true },
      })
      const connectionIds = connections.map((connection) => connection.id)

      if (productIds.length > 0) {
        await tx.productAsset.deleteMany({ where: { productId: { in: productIds } } })
        await tx.productFAQ.deleteMany({ where: { productId: { in: productIds } } })
        await tx.productSku.deleteMany({ where: { productId: { in: productIds } } })
        await tx.sourceMapping.deleteMany({ where: { productId: { in: productIds } } })
      }

      if (connectionIds.length > 0) {
        await tx.platformSyncJob.updateMany({
          where: { connectionId: { in: connectionIds } },
          data: { connectionId: null },
        })
      }

      await tx.platformSyncJob.deleteMany({ where: { knowledgeBaseId: id } })
      await tx.platformConnection.deleteMany({ where: { knowledgeBaseId: id } })
      await tx.asset.deleteMany({ where: { knowledgeBaseId: id } })
      await tx.product.deleteMany({ where: { knowledgeBaseId: id } })
      await tx.chunk.deleteMany({ where: { knowledgeBaseId: id } })
      await tx.document.deleteMany({ where: { knowledgeBaseId: id } })
      await tx.knowledgeBase.delete({ where: { id } })
    })
  }
}
