import { Module } from '@nestjs/common'
import { KnowledgeController } from './knowledge.controller'
import { KnowledgeService } from './services/knowledge.service'
import { DocumentService } from './services/document.service'
import { ChunkingService } from './services/chunking.service'
import { EmbeddingService } from './services/embedding.service'
import { SearchService } from './services/search.service'
import { EMBEDDING_SERVICE, SEARCH_SERVICE } from '@/ai/interfaces'

@Module({
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    DocumentService,
    ChunkingService,
    EmbeddingService,
    SearchService,
    // Bind interface implementations
    { provide: EMBEDDING_SERVICE, useExisting: EmbeddingService },
    { provide: SEARCH_SERVICE, useExisting: SearchService },
  ],
  exports: [SearchService, EmbeddingService],
})
export class KnowledgeModule {}
