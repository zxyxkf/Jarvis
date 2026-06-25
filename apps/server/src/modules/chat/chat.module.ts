import { Module } from '@nestjs/common'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { QueryRewriteService } from './services/query-rewrite.service'
import { KnowledgeModule } from '@/modules/knowledge/knowledge.module'
import { ModelGateway } from '@/ai/gateway/model-gateway'
import { SemanticCacheService } from '@/ai/cache/semantic-cache.service'
import { RerankerService } from '@/ai/rag/reranker.service'
import { ContextManagerService } from '@/ai/rag/context-manager.service'

@Module({
  imports: [KnowledgeModule],
  controllers: [ChatController],
  providers: [ChatService, QueryRewriteService, ModelGateway, SemanticCacheService, RerankerService, ContextManagerService],
  exports: [ChatService],
})
export class ChatModule {}
