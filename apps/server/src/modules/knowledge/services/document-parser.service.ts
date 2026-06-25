import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name)

  async parse(buffer: Buffer, mimetype: string): Promise<{ text: string }> {
    switch (mimetype) {
      case 'application/pdf':
        return this.parsePDF(buffer)
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        return this.parseWord(buffer)
      case 'text/plain':
      case 'text/markdown':
      case 'text/csv':
        return { text: buffer.toString('utf-8') }
      default:
        return { text: buffer.toString('utf-8') }
    }
  }

  private async parsePDF(buffer: Buffer): Promise<{ text: string }> {
    try {
      const pdfParse = (await import('pdf-parse')) as unknown as (buf: Buffer) => Promise<{ text: string }>
      const data = await pdfParse(buffer)
      return { text: this.cleanText(data.text) }
    } catch {
      this.logger.warn('pdf-parse unavailable, treating PDF as raw text')
      return { text: buffer.toString('utf-8') }
    }
  }

  private async parseWord(buffer: Buffer): Promise<{ text: string }> {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return { text: this.cleanText(result.value) }
    } catch {
      this.logger.warn('mammoth unavailable, treating Word as raw text')
      return { text: buffer.toString('utf-8') }
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      // eslint-disable-next-line no-control-regex
      .replace(/\x00/g, '')
      .trim()
  }
}
