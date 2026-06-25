export interface IEmbeddingService {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  dimension(): number
}

export const EMBEDDING_SERVICE = Symbol('IEmbeddingService')
