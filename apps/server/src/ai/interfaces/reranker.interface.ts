export interface IRerankerService {
  rerank(query: string, documents: { id: string; content: string }[]): Promise<RerankResult[]>
}

export interface RerankResult {
  id: string
  score: number
}

export const RERANKER_SERVICE = Symbol('IRerankerService')
