import { Module } from '@nestjs/common'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { KnowledgeModule } from '@/modules/knowledge/knowledge.module'
import { ModelGateway } from '@/ai/gateway/model-gateway'
import { SemanticCacheService } from '@/ai/cache/semantic-cache.service'

@Module({
  imports: [KnowledgeModule],
  controllers: [ChatController],
  providers: [ChatService, ModelGateway, SemanticCacheService],
  exports: [ChatService],
})
export class ChatModule {}
