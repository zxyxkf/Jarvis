import { Injectable, Logger } from '@nestjs/common'
import { IEmbeddingService } from '@/ai/interfaces'

@Injectable()
export class EmbeddingService implements IEmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name)
  private readonly dimensionValue = 1024

  async embed(text: string): Promise<number[]> {
    // API-based embedding — uses the configured provider
    const apiUrl = process.env.EMBEDDING_API_URL || 'https://api.deepseek.com/v1'
    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'

    const response = await fetch(`${apiUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: text }),
    })

    if (!response.ok) {
      this.logger.error(`Embedding API error: ${response.status} ${await response.text()}`)
      throw new Error(`Embedding API failed: ${response.status}`)
    }

    const data = (await response.json()) as {
      data: [{ embedding: number[] }]
    }
    return data.data[0]!.embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const apiUrl = process.env.EMBEDDING_API_URL || 'https://api.deepseek.com/v1'
    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'

    const response = await fetch(`${apiUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: texts }),
    })

    if (!response.ok) {
      this.logger.error(`Batch embedding API error: ${response.status}`)
      throw new Error(`Batch embedding API failed: ${response.status}`)
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>
    }
    return data.data.map((d) => d.embedding)
  }

  dimension(): number {
    return this.dimensionValue
  }
}
