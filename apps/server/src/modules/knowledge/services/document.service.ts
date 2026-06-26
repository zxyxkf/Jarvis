import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma.service'
import { StorageService } from '@/infrastructure/storage/storage.service'
import { ChunkingService } from './chunking.service'
import { EmbeddingService } from './embedding.service'
import { DocumentParserService } from './document-parser.service'

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService,
    private readonly parserService: DocumentParserService,
  ) {}

  async upload(
    userId: string,
    knowledgeBaseId: string,
    file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
  ) {
    const kb = await this.prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
      select: { id: true },
    })
    if (!kb) throw new NotFoundException('知识库不存在')

    // 1. Create document record
    const document = await this.prisma.document.create({
      data: {
        fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        fileType: this.getFileType(file.originalname),
        fileSize: file.size,
        fileUrl: '', // filled after MinIO upload
        status: 'PENDING',
        knowledgeBaseId,
        uploaderId: userId,
      },
    })

    // 2. Upload to MinIO
    const objectName = `${knowledgeBaseId}/${document.id}/${file.originalname}`
    const fileUrl = await this.storage.uploadFile(
      objectName,
      file.buffer,
      file.mimetype,
    )

    // 3. Update fileUrl
    await this.prisma.document.update({
      where: { id: document.id },
      data: { fileUrl, status: 'PROCESSING' },
    })

    // 4. Process async — parse + chunk + embed
    this.processDocument(document.id, file.buffer, file.mimetype).catch(
      (err) => this.logger.error(`Document processing failed: ${document.id}`, err),
    )

    return { documentId: document.id, status: 'PROCESSING' }
  }

  private async processDocument(
    documentId: string,
    buffer: Buffer,
    mimetype: string,
  ) {
    try {
      // Extract text from buffer
      const text = await this.extractText(buffer, mimetype)

      // Chunk
      const chunks = this.chunkingService.chunk(text)

      // Embed and store
      const texts = chunks.map((c) => c.content)
      const embeddings = await this.embeddingService.embedBatch(texts)

      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { knowledgeBaseId: true },
      })

      // Batch insert chunks with embeddings
      await this.prisma.$transaction(
        chunks.map((chunk, i) =>
          this.prisma.$executeRawUnsafe(
            `INSERT INTO "Chunk" (id, content, embedding, "chunkIndex", metadata, "documentId", "knowledgeBaseId", "createdAt")
             VALUES ($1, $2, $3::vector, $4, $5, $6, $7, NOW())`,
            crypto.randomUUID(),
            chunk.content,
            `[${embeddings[i]!.join(',')}]`,
            chunk.index,
            JSON.stringify(chunk.metadata ?? {}),
            documentId,
            document!.knowledgeBaseId,
          ),
        ),
      )

      // Mark as completed
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'COMPLETED' },
      })

      this.logger.log(`Document processed: ${documentId}, ${chunks.length} chunks`)
    } catch (error) {
      this.logger.error(`Document processing error: ${documentId}`, error)
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    }
  }

  private async extractText(buffer: Buffer, mimetype: string): Promise<string> {
    const result = await this.parserService.parse(buffer, mimetype)
    return result.text
  }

  async getStatus(userId: string, documentId: string) {
    void userId
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        fileName: true,
        status: true,
        errorMessage: true,
        fileSize: true,
        createdAt: true,
        _count: { select: { chunks: true } },
      },
    })
    if (!doc) throw new NotFoundException('文档不存在')
    return doc
  }

  async findByKnowledgeBase(userId: string, knowledgeBaseId: string) {
    void userId
    return this.prisma.document.findMany({
      where: { knowledgeBaseId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async delete(userId: string, documentId: string) {
    void userId
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId },
    })
    if (!doc) throw new NotFoundException('文档不存在')

    // Delete chunks
    await this.prisma.chunk.deleteMany({ where: { documentId } })
    // Delete MinIO file
    if (doc.fileUrl) {
      const objectName = doc.fileUrl.replace('jarvis-documents/', '')
      await this.storage.deleteFile(objectName).catch(() => {})
    }
    // Delete record
    await this.prisma.document.delete({ where: { id: documentId } })
  }

  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    const map: Record<string, string> = {
      pdf: 'pdf',
      docx: 'docx',
      doc: 'doc',
      md: 'md',
      txt: 'txt',
      xlsx: 'xlsx',
      xls: 'xls',
    }
    return map[ext ?? ''] ?? 'unknown'
  }
}
