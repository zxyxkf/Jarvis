export interface SearchResult {
  chunkId: string
  documentId: string
  documentName: string
  content: string
  score: number
  metadata?: Record<string, unknown>
}

export interface SearchOptions {
  knowledgeBaseId: string
  topK?: number
  minScore?: number
}

export interface ISearchService {
  vectorSearch(query: string, options: SearchOptions): Promise<SearchResult[]>
  hybridSearch(query: string, options: SearchOptions): Promise<SearchResult[]>
}

export const SEARCH_SERVICE = Symbol('ISearchService')
