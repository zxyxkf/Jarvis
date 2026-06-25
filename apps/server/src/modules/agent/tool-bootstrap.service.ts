import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common'
import { ToolRegistry } from '@/ai/agent/tool-registry'
import { KnowledgeSearchTool } from './tools/knowledge-search.tool'
import { DateTimeTool } from './tools/date-time.tool'

@Injectable()
export class ToolBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(ToolBootstrapService.name)

  constructor(
    @Inject(ToolRegistry) private readonly toolRegistry: ToolRegistry,
    @Inject(KnowledgeSearchTool) private readonly knowledgeSearchTool: KnowledgeSearchTool,
    @Inject(DateTimeTool) private readonly dateTimeTool: DateTimeTool,
  ) {}

  onModuleInit() {
    this.toolRegistry.register(this.knowledgeSearchTool)
    this.toolRegistry.register(this.dateTimeTool)
    this.logger.log('Agent tools registered')
  }
}
