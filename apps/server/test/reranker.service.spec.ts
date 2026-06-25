import { RerankerService } from '../src/ai/rag/reranker.service'

describe('RerankerService', () => {
  let service: RerankerService

  beforeEach(() => {
    delete process.env.DEEPSEEK_API_KEY
    service = new RerankerService()
  })

  it('returns empty array for empty documents', async () => {
    const result = await service.rerank('query', [])
    expect(result).toHaveLength(0)
  })

  it('heuristic rerank scores keyword matches higher', async () => {
    const docs = [
      { id: 'a', content: 'irrelevant text' },
      { id: 'b', content: 'machine learning is great for machines' },
      { id: 'c', content: 'machine learning and deep learning' },
    ]
    const result = await service.rerank('machine learning', docs)
    expect(result).toHaveLength(3)
    // 'c' has two occurrences of 'machine' and 'learning'
    expect(result[0]!.id).toBe('c')
  })

  it('heuristic rerank respects topN', async () => {
    const docs = [
      { id: 'a', content: 'x y z' },
      { id: 'b', content: 'x y z extra' },
      { id: 'c', content: 'x y z double' },
    ]
    const result = await service.rerank('x', docs, 2)
    expect(result).toHaveLength(2)
  })
})
