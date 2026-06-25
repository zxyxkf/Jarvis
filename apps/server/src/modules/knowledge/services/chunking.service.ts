import { Injectable } from '@nestjs/common'

export interface ChunkResult {
  content: string
  index: number
  metadata?: Record<string, unknown>
}

@Injectable()
export class ChunkingService {
  private readonly defaultChunkSize = 512
  private readonly defaultOverlap = 0.2 // 20%

  chunk(text: string, options?: { chunkSize?: number; overlap?: number }): ChunkResult[] {
    const chunkSize = options?.chunkSize ?? this.defaultChunkSize
    const overlap = options?.overlap ?? this.defaultOverlap

    // Use recursive character splitting
    const separators = ['\n\n', '\n', '。', '. ', ' ', '']
    return this.recursiveSplit(text, separators, chunkSize, overlap)
  }

  private recursiveSplit(
    text: string,
    separators: string[],
    chunkSize: number,
    overlapRatio: number,
  ): ChunkResult[] {
    const [sep, ...rest] = separators
    if (!sep && rest.length === 0) {
      // Last resort: character split
      return this.splitByLength(text, chunkSize, overlapRatio)
    }

    const splits = text.split(sep!)
    const chunks: ChunkResult[] = []
    let currentChunk = ''
    let index = 0

    for (const split of splits) {
      const candidate = currentChunk ? `${currentChunk}${sep}${split}` : split

      if (candidate.length > chunkSize && currentChunk.length > 0) {
        chunks.push({ content: currentChunk.trim(), index: index++, metadata: {} })
        currentChunk = split
      } else if (candidate.length > chunkSize) {
        // Single split is too large, recurse with next separator
        const subChunks = this.recursiveSplit(split, rest, chunkSize, overlapRatio)
        chunks.push(...subChunks.map((c) => ({ ...c, index: index++ })))
      } else {
        currentChunk = candidate
      }
    }

    if (currentChunk.trim()) {
      chunks.push({ content: currentChunk.trim(), index: index++, metadata: {} })
    }

    return chunks
  }

  private splitByLength(text: string, chunkSize: number, overlapRatio: number): ChunkResult[] {
    const chunks: ChunkResult[] = []
    const overlap = Math.floor(chunkSize * overlapRatio)
    let start = 0
    let index = 0

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length)
      chunks.push({
        content: text.slice(start, end).trim(),
        index: index++,
        metadata: {},
      })
      if (end >= text.length) break
      start = end - overlap
    }

    return chunks
  }
}
