import { DocumentParserService } from '../src/modules/knowledge/services/document-parser.service'

describe('DocumentParserService', () => {
  let service: DocumentParserService

  beforeEach(() => {
    service = new DocumentParserService()
  })

  it('parses plain text', async () => {
    const { text } = await service.parse(Buffer.from('hello world'), 'text/plain')
    expect(text).toBe('hello world')
  })

  it('parses markdown', async () => {
    const { text } = await service.parse(Buffer.from('# Title\n\ncontent'), 'text/markdown')
    expect(text).toContain('Title')
    expect(text).toContain('content')
  })

  it('parses CSV', async () => {
    const { text } = await service.parse(Buffer.from('a,b,c\n1,2,3'), 'text/csv')
    expect(text).toContain('a,b,c')
  })

  it('falls back to utf-8 for unknown types', async () => {
    const { text } = await service.parse(Buffer.from('unknown'), 'application/unknown')
    expect(text).toBe('unknown')
  })

  it('attempts PDF parsing, falls back gracefully', async () => {
    // pdf-parse may fail in test env — service should not throw
    const { text } = await service.parse(Buffer.from('%PDF-1.4 fake'), 'application/pdf')
    expect(typeof text).toBe('string')
    expect(text.length).toBeGreaterThan(0)
  })

  it('attempts Word parsing, falls back gracefully', async () => {
    const { text } = await service.parse(
      Buffer.from('fake docx content'),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    expect(typeof text).toBe('string')
  })

  it('cleanText removes null bytes from raw buffer', async () => {
    const buf = Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x77, 0x6f, 0x72, 0x6c, 0x64])
    const { text } = await service.parse(buf, 'text/plain')
    expect(text).not.toContain('\x00')
  })

  it('cleanText reduces excessive newlines', async () => {
    const buf = Buffer.from('line1\n\n\n\n\n\n\n\nline2')
    const { text } = await service.parse(buf, 'text/plain')
    const newlineCount = (text.match(/\n/g) || []).length
    expect(newlineCount).toBeLessThan(5)
  })
})
