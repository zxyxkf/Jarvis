import { Injectable, Logger } from '@nestjs/common'
import type { IRerankerService, RerankResult } from '../interfaces/reranker.interface'

@Injectable()
export class RerankerService implements IRerankerService {
  private readonly logger = new Logger(RerankerService.name)

  async rerank(
    query: string,
    documents: { id: string; content: string }[],
    topN?: number,
  ): Promise<RerankResult[]> {
    if (documents.length === 0) return []

    // Use LLM-based reranker via API (bge-reranker API endpoint or fallback)
    const apiUrl = process.env.RERANKER_API_URL || 'https://api.deepseek.com/v1'
    const apiKey = process.env.DEEPSEEK_API_KEY || ''

    // If no API key, use simple heuristic fallback: keyword overlap
    if (!apiKey) {
      return this.heuristicRerank(query, documents, topN ?? documents.length)
    }

    // @abstract-candidate: LLM API call pattern with try-catch
    // Seen: 1/3 (reranker.service)
    try {
      const response = await fetch(`${apiUrl}/rerank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'bge-reranker-v2-m3',
          query,
          documents: documents.map((d) => d.content),
          top_n: topN ?? documents.length,
        }),
      })

      if (!response.ok) {
        // DeepSeek may not have rerank endpoint — fallback
        return this.heuristicRerank(query, documents, topN ?? documents.length)
      }

      const data = (await response.json()) as {
        results: Array<{ index: number; relevance_score: number }>
      }

      return data.results.map((r) => ({
        id: documents[r.index]!.id,
        score: r.relevance_score,
      }))
    } catch (err) {
      this.logger.warn('Reranker API failed, using heuristic fallback', err)
      return this.heuristicRerank(query, documents, topN ?? documents.length)
    }
  }

  /** Simple TF-based fallback when reranker API is unavailable */
  private heuristicRerank(
    query: string,
    documents: { id: string; content: string }[],
    topN: number,
  ): RerankResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/)

    return documents
      .map((doc) => {
        const content = doc.content.toLowerCase()
        let score = 0
        for (const term of queryTerms) {
          if (term.length < 2) continue
          const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
          const matches = content.match(regex)
          if (matches) score += matches.length
        }
        // Normalize by content length
        return { id: doc.id, score: score / Math.max(content.length, 1) * 100 }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
  }
}
