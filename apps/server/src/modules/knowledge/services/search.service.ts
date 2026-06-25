import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/infrastructure/database/prisma.service'
import { EmbeddingService } from './embedding.service'
import { ISearchService, SearchResult, SearchOptions } from '@/ai/interfaces'

@Injectable()
export class SearchService implements ISearchService {
  private readonly logger = new Logger(SearchService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async vectorSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const topK = options.topK ?? 10
    const minScore = options.minScore ?? 0.5

    const queryEmbedding = await this.embeddingService.embed(query)
    const vectorStr = `[${queryEmbedding.join(',')}]`

    // pgvector cosine similarity search
    interface RawSearchRow {
      id: string
      content: string
      document_id: string
      file_name: string
      score: number
      metadata: string | null
    }

    const results = await this.prisma.$queryRawUnsafe<RawSearchRow[]>(
      `SELECT
        c.id,
        c.content,
        c."documentId" as document_id,
        d."fileName" as file_name,
        1 - (c.embedding <=> $1::vector) as score,
        c.metadata::text
      FROM "Chunk" c
      JOIN "Document" d ON c."documentId" = d.id
      WHERE c."knowledgeBaseId" = $2
        AND c.embedding IS NOT NULL
        AND 1 - (c.embedding <=> $1::vector) > $3
      ORDER BY score DESC
      LIMIT $4`,
      vectorStr,
      options.knowledgeBaseId,
      minScore,
      topK,
    )

    return results.map((r: RawSearchRow) => ({
      chunkId: r.id,
      documentId: r.document_id,
      documentName: r.file_name,
      content: r.content,
      score: Number(r.score),
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
    }))
  }

  async hybridSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const topK = options.topK ?? 10

    // Run vector and keyword search in parallel
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch(query, { ...options, topK: topK * 2 }),
      this.keywordSearch(query, options),
    ])

    // RRF (Reciprocal Rank Fusion)
    const fused = this.rrfFusion(vectorResults, keywordResults, 60)
    return fused.slice(0, topK)
  }

  private async keywordSearch(
    query: string,
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    const topK = (options.topK ?? 10) * 2

    // PostgreSQL full-text search (tsvector)
    interface KeywordRow {
      id: string
      content: string
      document_id: string
      file_name: string
      score: number
    }

    const results = await this.prisma.$queryRawUnsafe<KeywordRow[]>(
      `SELECT
        c.id, c.content, c."documentId" as document_id,
        d."fileName" as file_name,
        ts_rank(
          to_tsvector('simple', c.content),
          plainto_tsquery('simple', $1)
        ) as score
      FROM "Chunk" c
      JOIN "Document" d ON c."documentId" = d.id
      WHERE c."knowledgeBaseId" = $2
        AND to_tsvector('simple', c.content) @@ plainto_tsquery('simple', $1)
      ORDER BY score DESC
      LIMIT $3`,
      query,
      options.knowledgeBaseId,
      topK,
    )

    return results.map((r: KeywordRow) => ({
      chunkId: r.id,
      documentId: r.document_id,
      documentName: r.file_name,
      content: r.content,
      score: Number(r.score),
    }))
  }

  private rrfFusion(
    vecResults: SearchResult[],
    keyResults: SearchResult[],
    k: number,
  ): SearchResult[] {
    const scoreMap = new Map<
      string,
      { result: SearchResult; score: number }
    >()

    const addToMap = (results: SearchResult[], weight = 1.0) => {
      results.forEach((r, rank) => {
        const rrfScore = weight / (k + rank + 1)
        const existing = scoreMap.get(r.chunkId)
        if (existing) {
          existing.score += rrfScore
        } else {
          scoreMap.set(r.chunkId, { result: r, score: rrfScore })
        }
      })
    }

    addToMap(vecResults, 1.0)
    addToMap(keyResults, 0.8) // keyword weight slightly lower

    return Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .map((e) => ({ ...e.result, score: e.score }))
  }
}
