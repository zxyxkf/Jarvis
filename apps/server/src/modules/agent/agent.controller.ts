import { Controller, Post, Get, Body, Param, Req, Res, Logger } from '@nestjs/common'
import type { Request, Response } from 'express'
import { AgentService } from './agent.service'

@Controller('agents')
export class AgentController {
  private readonly logger = new Logger(AgentController.name)

  constructor(private readonly agentService: AgentService) {}

  @Post()
  create(
    @Req() req: Request,
    @Body() body: { name: string; task: string; description?: string },
  ) {
    const userId = (req.headers['x-user-id'] as string) || 'dev-user'
    return this.agentService.create(userId, body.name, body.task, body.description)
  }

  @Get()
  listTasks(@Req() req: Request) {
    const userId = (req.headers['x-user-id'] as string) || 'dev-user'
    return this.agentService.findUserTasks(userId)
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.agentService.getStatus(id)
  }

  @Post(':id/execute')
  async executeAgent(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    try {
      for await (const event of this.agentService.execute(id)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`)
        if (event.type === 'done' || event.type === 'error') break
      }
    } catch (err) {
      this.logger.error('Agent SSE stream error', err)
      res.write(`data: ${JSON.stringify({ type: 'error', data: 'Agent 执行中断' })}\n\n`)
    }

    res.end()
  }
}
