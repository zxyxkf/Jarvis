import { Controller, Post, Get, Patch, Delete, Body, Req, Res, Param, Logger, UseGuards, Inject } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Request, Response } from 'express'
import { ChatService } from './chat.service'

interface JwtRequest extends Request {
  user: { id: string; email: string; role: string }
}

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  private readonly logger = new Logger(ChatController.name)

  constructor(
    @Inject(ChatService) private readonly chatService: ChatService,
  ) {}

  @Get('conversations')
  async listConversations(@Req() req: JwtRequest) {
    return this.chatService.listConversations(req.user.id)
  }

  @Get('conversations/:id')
  async getConversation(@Req() req: JwtRequest, @Param('id') id: string) {
    return this.chatService.getConversation(req.user.id, id)
  }

  @Patch('conversations/:id')
  async renameConversation(@Req() req: JwtRequest, @Param('id') id: string, @Body() body: { title?: string }) {
    return this.chatService.renameConversation(req.user.id, id, body.title ?? '')
  }

  @Delete('conversations/:id')
  async deleteConversation(@Req() req: JwtRequest, @Param('id') id: string) {
    return this.chatService.deleteConversation(req.user.id, id)
  }

  @Post('stream')
  async streamChat(
    @Req() req: JwtRequest,
    @Body() body: { content: string; conversationId?: string; knowledgeBaseId?: string; model?: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    try {
      for await (const event of this.chatService.streamChat(req.user.id, body.content, {
        conversationId: body.conversationId,
        knowledgeBaseId: body.knowledgeBaseId,
        model: body.model,
      })) {
        res.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    } catch (err) {
      this.logger.error('SSE stream error', err)
      res.write(`data: ${JSON.stringify({ type: 'error', data: '流式响应中断' })}\n\n`)
    }

    res.end()
  }
}
