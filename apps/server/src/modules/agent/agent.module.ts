import { Module } from '@nestjs/common'
import { AgentController } from './agent.controller'
import { AgentService } from './agent.service'
import { AgentExecutor } from '@/ai/agent/agent-executor'
import { ToolRegistry } from '@/ai/agent/tool-registry'
import { KnowledgeSearchTool } from './tools/knowledge-search.tool'
import { DateTimeTool } from './tools/date-time.tool'
import { KnowledgeModule } from '@/modules/knowledge/knowledge.module'
import { ModelGateway } from '@/ai/gateway/model-gateway'

@Module({
  imports: [KnowledgeModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    AgentExecutor,
    ToolRegistry,
    ModelGateway,
    KnowledgeSearchTool,
    DateTimeTool,
  ],
  exports: [AgentService],
})
export class AgentModule {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly knowledgeSearchTool: KnowledgeSearchTool,
    private readonly dateTimeTool: DateTimeTool,
  ) {
    // Auto-register built-in tools
    this.toolRegistry.register(this.knowledgeSearchTool)
    this.toolRegistry.register(this.dateTimeTool)
  }
}
