import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core'
import { InfrastructureModule } from './infrastructure/infrastructure.module'
import { HealthModule } from './modules/health/health.module'
import { KnowledgeModule } from './modules/knowledge/knowledge.module'
import { ChatModule } from './modules/chat/chat.module'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { StorageService } from './infrastructure/storage/storage.service'

@Module({
  imports: [InfrastructureModule, HealthModule, KnowledgeModule, ChatModule],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {
  constructor(private readonly storage: StorageService) {
    this.storage.ensureBucket().catch((err) => {
      console.warn('MinIO bucket init failed (MinIO may not be running):', err.message)
    })
  }
}
