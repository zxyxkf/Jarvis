import { Injectable, NotFoundException } from '@nestjs/common'
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
    return this.prisma.knowledgeBase.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { documents: true } } },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async findById(userId: string, id: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id, ownerId: userId },
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
    // Delete chunks first (cascade), then documents, then KB
    await this.prisma.chunk.deleteMany({ where: { knowledgeBaseId: id } })
    await this.prisma.document.deleteMany({ where: { knowledgeBaseId: id } })
    await this.prisma.knowledgeBase.delete({ where: { id } })
  }
}
