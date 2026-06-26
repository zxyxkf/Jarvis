import { Module } from '@nestjs/common'
import { KnowledgeController } from './knowledge.controller'
import { KnowledgeService } from './services/knowledge.service'
import { DocumentService } from './services/document.service'
import { ChunkingService } from './services/chunking.service'
import { EmbeddingService } from './services/embedding.service'
import { SearchService } from './services/search.service'
import { DocumentParserService } from './services/document-parser.service'
import { ProductService } from './services/product.service'
import { PlatformIntegrationService } from './services/platform-integration.service'
import { KnowledgeAccessService } from './services/knowledge-access.service'
import { AuditService } from './services/audit.service'
import { EMBEDDING_SERVICE, SEARCH_SERVICE } from '@/ai/interfaces'

@Module({
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    DocumentService,
    DocumentParserService,
    ChunkingService,
    EmbeddingService,
    SearchService,
    ProductService,
    PlatformIntegrationService,
    KnowledgeAccessService,
    AuditService,
    { provide: EMBEDDING_SERVICE, useExisting: EmbeddingService },
    { provide: SEARCH_SERVICE, useExisting: SearchService },
  ],
  exports: [SearchService, EmbeddingService, DocumentService, ProductService, PlatformIntegrationService, KnowledgeAccessService, AuditService],
})
export class KnowledgeModule {}
