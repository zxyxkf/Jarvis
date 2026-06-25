import { Module } from '@nestjs/common'
import { ContentGuardService } from './content-guard.service'

@Module({
  providers: [ContentGuardService],
  exports: [ContentGuardService],
})
export class ContentModule {}
