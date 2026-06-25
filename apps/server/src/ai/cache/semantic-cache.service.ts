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
  private readonly ttlSeconds = 3600 // 1 hour

  constructor(
    private readonly redis: RedisService,
  ) {}

  /** Generate cache key from query embedding */
  private async makeKey(knowledgeBaseId: string, query: string): Promise<string> {
    const hash = await this.hashQuery(query)
    return `semantic:${knowledgeBaseId}:${hash}`
  }

  private async hashQuery(query: string): Promise<string> {
    // Simple hash for dedup — embedding-based similarity match is too expensive for cache lookup
    const normalized = query.trim().toLowerCase().slice(0, 200)
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i)
      hash = ((hash << 5) - hash + char) | 0
    }
    return `h${Math.abs(hash).toString(36)}`
  }

  async get(knowledgeBaseId: string, query: string): Promise<CacheEntry | null> {
    const key = await this.makeKey(knowledgeBaseId, query)
    const raw = await this.redis.get(key)
    if (!raw) return null
    try {
      const entry = JSON.parse(raw) as CacheEntry
      this.logger.log(`Cache hit: ${key}`)
      return entry
    } catch {
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
    const key = await this.makeKey(knowledgeBaseId, query)
    const entry: CacheEntry = {
      response,
      citations,
      modelName,
      createdAt: Date.now(),
    }
    await this.redis.set(key, JSON.stringify(entry), this.ttlSeconds)
  }

  /** Invalidate cache for a knowledge base (called after document changes) */
  async invalidateKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    const pattern = `semantic:${knowledgeBaseId}:*`
    await this.redis.delByPattern(pattern)
    this.logger.log(`Cache invalidated for KB: ${knowledgeBaseId}`)
  }

  /** Get approximate hit rate from Redis stats */
  async getStats(): Promise<{ hits: number; sets: number }> {
    const sets = Number(await this.redis.get('semantic:stats:sets') || '0')
    const hits = Number(await this.redis.get('semantic:stats:hits') || '0')
    return { hits, sets }
  }
}
