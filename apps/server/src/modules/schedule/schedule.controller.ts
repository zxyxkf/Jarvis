import { Controller, Get, Post, Delete, Body, Param, Inject } from '@nestjs/common'
import { ScheduleService } from './schedule.service'

@Controller('schedule')
export class ScheduleController {
  constructor(@Inject(ScheduleService) private readonly scheduleService: ScheduleService) {}

  @Post('parse')
  parse(@Body() body: { text: string }) {
    return this.scheduleService.parse(body.text)
  }

  @Post()
  create(@Body() body: { title: string; description?: string; startTime: string; endTime?: string; allDay?: boolean }) {
    return this.scheduleService.create({
      title: body.title,
      description: body.description,
      startTime: body.startTime,
      endTime: body.endTime,
      allDay: body.allDay ?? false,
    })
  }

  @Get()
  findAll() {
    return this.scheduleService.findAll()
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.scheduleService.delete(id)
  }
}
