import { ModelGateway } from '../src/ai/gateway/model-gateway'

describe('ModelGateway', () => {
  let gateway: ModelGateway

  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = 'test-key'
    process.env.QWEN_API_KEY = 'test-key-2'
    delete process.env.OPENAI_API_KEY
    gateway = new ModelGateway()
  })

  afterEach(() => {
    delete process.env.DEEPSEEK_API_KEY
    delete process.env.QWEN_API_KEY
  })

  it('resolves configured providers', () => {
    const providers = gateway.availableProviders()
    expect(providers).toContain('deepseek')
    expect(providers).toContain('qwen')
    expect(providers).not.toContain('openai')
  })

  it('resolveProvider returns first available by default', () => {
    const { providerName } = gateway.resolveProvider()
    expect(providerName).toBe('deepseek')
  })

  it('resolveProvider returns preferred when available', () => {
    const { providerName } = gateway.resolveProvider('qwen')
    expect(providerName).toBe('qwen')
  })

  it('resolveProvider falls back when preferred missing', () => {
    const { providerName } = gateway.resolveProvider('nonexistent')
    expect(providerName).toBe('deepseek')
  })

  it('throws when no providers configured', () => {
    delete process.env.DEEPSEEK_API_KEY
    delete process.env.QWEN_API_KEY
    const empty = new ModelGateway()
    expect(() => empty.resolveProvider()).toThrow('No LLM provider configured')
  })

  it('classifies short messages as simple', () => {
    const result = gateway.classifyComplexity([{ role: 'user', content: 'hi' }])
    expect(result).toBe('simple')
  })

  it('classifies long multi-turn as complex', () => {
    const messages = Array.from({ length: 5 }, (_, i) => ({
      role: 'user' as const,
      content: 'a'.repeat(500),
    }))
    expect(gateway.classifyComplexity(messages)).toBe('complex')
  })
})
