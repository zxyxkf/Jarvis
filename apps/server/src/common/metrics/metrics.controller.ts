import { Controller, Get } from '@nestjs/common'

@Controller('metrics')
export class MetricsController {
  @Get()
  getMetrics() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: Date.now(),
    }
  }
}
