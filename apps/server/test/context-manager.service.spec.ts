import { ContextManagerService } from '../src/ai/rag/context-manager.service'

describe('ContextManagerService', () => {
  let service: ContextManagerService

  beforeEach(() => { service = new ContextManagerService() })

  it('estimates tokens for Chinese text', () => {
    const tokens = service.estimateTokens('人工智能正在改变世界')
    expect(tokens).toBeGreaterThan(0)
    expect(tokens).toBeLessThanOrEqual(20)
  })

  it('estimates tokens for English text', () => {
    const tokens = service.estimateTokens('artificial intelligence is changing the world')
    expect(tokens).toBeGreaterThan(0)
    expect(tokens).toBeLessThan(15)
  })

  it('slidingWindow keeps system message always', () => {
    const msgs = [
      { role: 'system' as const, content: 'You are helpful.' },
      { role: 'user' as const, content: 'hi' },
    ]
    const result = service.slidingWindow(msgs, 100)
    expect(result[0]!.role).toBe('system')
  })

  it('slidingWindow keeps recent messages', () => {
    const msgs = [
      { role: 'user' as const, content: 'msg1' },
      { role: 'assistant' as const, content: 'msg2' },
      { role: 'user' as const, content: 'msg3' },
    ]
    const result = service.slidingWindow(msgs, 50)
    expect(result.length).toBeGreaterThan(0)
    expect(result[result.length - 1]!.content).toBe('msg3')
  })

  it('slidingWindow respects token limit', () => {
    const longContent = 'x'.repeat(5000)
    const msgs = [
      { role: 'user' as const, content: longContent },
      { role: 'assistant' as const, content: 'short' },
    ]
    const result = service.slidingWindow(msgs, 500)
    expect(result.length).toBeLessThan(msgs.length)
  })

  it('estimateTokensBatch sums all messages', () => {
    const msgs = [{ role: 'user' as const, content: '你好世界' }]
    const total = service.estimateTokensBatch(msgs)
    expect(total).toBeGreaterThan(0)
  })
})
