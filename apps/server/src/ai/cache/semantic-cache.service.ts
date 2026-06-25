import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '@/infrastructure/cache/redis.service'

interface CacheEntry {
  response: string
  citations: unknown
  modelName: string
  createdAt: number
}

@Injectable()
export class SemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name)
  private readonly ttlSeconds = 3600

  constructor(
    private readonly redis: RedisService,
  ) {}

  private makeKey(knowledgeBaseId: string, query: string): string {
    const normalized = query.trim().toLowerCase().slice(0, 200)
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i)
      hash = ((hash << 5) - hash + char) | 0
    }
    return `semantic:${knowledgeBaseId}:h${Math.abs(hash).toString(36)}`
  }

  async get(knowledgeBaseId: string, query: string): Promise<CacheEntry | null> {
    try {
      const key = this.makeKey(knowledgeBaseId, query)
      const raw = await this.redis.get(key)
      if (!raw) return null
      const entry = JSON.parse(raw) as CacheEntry
      this.logger.log(`Cache hit: ${key}`)
      return entry
    } catch (err) {
      this.logger.warn('Semantic cache get failed', err)
      return null
    }
  }

  async set(
    knowledgeBaseId: string,
    query: string,
    response: string,
    citations: unknown,
    modelName: string,
  ): Promise<void> {
    try {
      const key = this.makeKey(knowledgeBaseId, query)
      await this.redis.set(key, JSON.stringify({
        response,
        citations,
        modelName,
        createdAt: Date.now(),
      }), this.ttlSeconds)
    } catch (err) {
      this.logger.warn('Semantic cache set failed', err)
    }
  }

  async invalidateKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    try {
      await this.redis.delByPattern(`semantic:${knowledgeBaseId}:*`)
      this.logger.log(`Cache invalidated for KB: ${knowledgeBaseId}`)
    } catch (err) {
      this.logger.warn('Cache invalidation failed', err)
    }
  }

  async getStats(): Promise<{ hits: number; sets: number }> {
    try {
      const sets = Number(await this.redis.get('semantic:stats:sets') || '0')
      const hits = Number(await this.redis.get('semantic:stats:hits') || '0')
      return { hits, sets }
    } catch {
      return { hits: 0, sets: 0 }
    }
  }
}
