import { Injectable } from '@nestjs/common'

export interface ScheduleItem {
  id: string
  title: string
  description?: string
  startTime: string
  endTime?: string
  allDay: boolean
}

@Injectable()
export class ScheduleService {
  private readonly items: ScheduleItem[] = []

  async parse(input: string): Promise<ScheduleItem> {
    // AI-powered schedule parsing placeholder
    // Phase 3: integrate LLM to extract date/time/title from natural language
    return {
      id: crypto.randomUUID(),
      title: input.slice(0, 100),
      startTime: new Date().toISOString(),
      allDay: false,
    }
  }

  async create(item: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
    const newItem: ScheduleItem = { ...item, id: crypto.randomUUID() }
    this.items.push(newItem)
    return newItem
  }

  async findAll(): Promise<ScheduleItem[]> {
    return this.items.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    )
  }

  async delete(id: string): Promise<void> {
    const idx = this.items.findIndex((i) => i.id === id)
    if (idx >= 0) this.items.splice(idx, 1)
  }
}
