import { Controller, Post, Get, Body, Param, Req, Res, Logger, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Request, Response } from 'express'
import { AgentService } from './agent.service'

interface JwtRequest extends Request {
  user: { id: string; email: string; role: string }
}

@Controller('agents')
@UseGuards(AuthGuard('jwt'))
export class AgentController {
  private readonly logger = new Logger(AgentController.name)

  constructor(private readonly agentService: AgentService) {}

  @Post()
  create(
    @Req() req: JwtRequest,
    @Body() body: { name: string; task: string; description?: string },
  ) {
    return this.agentService.create(req.user.id, body.name, body.task, body.description)
  }

  @Get()
  listTasks(@Req() req: JwtRequest) {
    return this.agentService.findUserTasks(req.user.id)
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
