import { ChunkingService } from '../src/modules/knowledge/services/chunking.service'

describe('ChunkingService', () => {
  let service: ChunkingService

  beforeEach(() => {
    service = new ChunkingService()
  })

  describe('chunk', () => {
    it('returns empty array for empty text', () => {
      const result = service.chunk('')
      expect(result).toHaveLength(0)
    })

    it('returns single chunk for short text', () => {
      const result = service.chunk('Hello world')
      expect(result).toHaveLength(1)
      expect(result[0]!.content).toBe('Hello world')
    })

    it('splits on paragraph boundaries', () => {
      const longPara = 'A paragraph with substantial content. '.repeat(20) // ~1K chars
      const text = longPara + '\n\n' + longPara + '\n\n' + longPara
      const result = service.chunk(text)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it('splits long text exceeding chunk size', () => {
      const text = 'word '.repeat(600)
      const result = service.chunk(text, { chunkSize: 512 })
      expect(result.length).toBeGreaterThan(1)
    })

    it('respects custom chunk size', () => {
      const text = 'word '.repeat(300)
      const result = service.chunk(text, { chunkSize: 200 })
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    it('each chunk is trimmed', () => {
      const text = '  padded text  \n\n  more padded  '
      const result = service.chunk(text)
      for (const chunk of result) {
        expect(chunk.content).toBe(chunk.content.trim())
      }
    })

    it('chunks have sequential indices', () => {
      const text = 'word '.repeat(600)
      const result = service.chunk(text, { chunkSize: 512 })
      for (let i = 0; i < result.length; i++) {
        expect(result[i]!.index).toBe(i)
      }
    })

    it('handles Chinese text correctly', () => {
      const text = '人工智能正在改变世界。' + '这是一个很长的中文句子。'.repeat(100)
      const result = service.chunk(text)
      expect(result.length).toBeGreaterThan(0)
      for (const chunk of result) {
        expect(typeof chunk.content).toBe('string')
      }
    })
  })
})
