import { Module } from '@nestjs/common'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { KnowledgeModule } from '@/modules/knowledge/knowledge.module'
import { ModelGateway } from '@/ai/gateway/model-gateway'

@Module({
  imports: [KnowledgeModule], // For SearchService
  controllers: [ChatController],
  providers: [ChatService, ModelGateway],
  exports: [ChatService],
})
export class ChatModule {}
