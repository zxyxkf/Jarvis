import { Global, Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { CacheModule } from './cache/cache.module'
import { StorageModule } from './storage/storage.module'

@Global()
@Module({
  imports: [DatabaseModule, CacheModule, StorageModule],
  exports: [DatabaseModule, CacheModule, StorageModule],
})
export class InfrastructureModule {}
