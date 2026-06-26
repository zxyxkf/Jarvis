import { Controller, Get, Param, Res } from '@nestjs/common'
import type { Response } from 'express'
import { StorageService } from './storage.service'

@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get('*path')
  async getFile(@Param('path') path: string[] | string, @Res() res: Response) {
    const objectName = Array.isArray(path) ? path.join('/') : path
    const normalized = objectName.replace(/^jarvis-documents\//, '')
    const file = await this.storage.getFile(normalized)
    res.send(file)
  }
}
