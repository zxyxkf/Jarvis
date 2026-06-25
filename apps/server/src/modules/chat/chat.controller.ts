import { Controller, Post, Get, Body, Req, Res, Param, Logger, UseGuards, Inject } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Request, Response } from 'express'
import { ChatService } from './chat.service'
import { PrismaService } from '@/infrastructure/database/prisma.service'

interface JwtRequest extends Request {
  user: { id: string; email: string; role: string }
}

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  private readonly logger = new Logger(ChatController.name)

  constructor(
    @Inject(ChatService) private readonly chatService: ChatService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Get('conversations')
  async listConversations(@Req() req: JwtRequest) {
    return this.prisma.conversation.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })
  }

  @Get('conversations/:id')
  async getConversation(@Param('id') id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
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
