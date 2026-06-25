import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma.service'
import { AgentExecutor } from '@/ai/agent/agent-executor'

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentExecutor: AgentExecutor,
  ) {}

  async create(userId: string, name: string, task: string, description?: string) {
    return this.prisma.agentTask.create({
      data: {
        name,
        description,
        task,
        workflow: {},
        creatorId: userId,
      },
    })
  }

  async *execute(taskId: string): AsyncGenerator<{
    type: 'state' | 'token' | 'tool_call' | 'tool_result' | 'done' | 'error'
    data: unknown
  }> {
    const task = await this.prisma.agentTask.findUnique({
      where: { id: taskId },
    })
    if (!task) {
      yield { type: 'error', data: '任务不存在' }
      return
    }

    const workflowData = task.workflow as Record<string, unknown>
    const taskDescription = (workflowData['task'] as string) || task.name

    await this.prisma.agentTask.update({
      where: { id: taskId },
      data: { status: 'RUNNING' },
    })

    try {
      for await (const event of this.agentExecutor.execute(taskId, taskDescription)) {
        yield event
        if (event.type === 'done' || event.type === 'error') break
      }

      await this.prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          state: { completedAt: new Date().toISOString() },
        },
      })
    } catch (err) {
      this.logger.error('Agent execution error', err)
      await this.prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          state: { error: err instanceof Error ? err.message : 'Unknown error' },
        },
      })
    }
  }

  async findUserTasks(userId: string) {
    return this.prisma.agentTask.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async getStatus(taskId: string) {
    const task = await this.prisma.agentTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        name: true,
        status: true,
        state: true,
        result: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!task) throw new NotFoundException('Agent 任务不存在')
    return task
  }
}
