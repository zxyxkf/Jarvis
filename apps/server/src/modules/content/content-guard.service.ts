import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class ContentGuardService {
  private readonly logger = new Logger(ContentGuardService.name)

  private readonly blockedPatterns = [
    /system:\s*override/i,
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    /pretend\s+(you\s+)?are/i,
    /jailbreak/i,
    /DAN\s*mode/i,
    /bypass\s+(safety|security|filter)/i,
    /forget\s+(everything|your\s+training)/i,
    /reveal\s+(your\s+)?system\s+(prompt|message|instruction)/i,
    /show\s+(me\s+)?other\s+users?\s+(data|messages|conversations)/i,
    /delete\s+(all|everything)/i,
  ]

  auditInput(text: string): { safe: boolean; reason?: string; risk: 'none' | 'low' | 'high' } {
    if (text.length > 50000) {
      return { safe: false, reason: '输入过长', risk: 'high' }
    }

    for (const pattern of this.blockedPatterns) {
      if (pattern.test(text)) {
        this.logger.warn(`Blocked prompt matching pattern: ${pattern.source}`)
        return { safe: false, reason: '输入包含不允许的内容', risk: 'high' }
      }
    }

    return { safe: true, risk: 'none' }
  }

  /** Verify if LLM output is grounded in provided context */
  auditOutput(
    response: string,
    context?: string,
  ): { safe: boolean; hallucinationRisk: 'none' | 'low' | 'high'; flags: string[] } {
    const flags: string[] = []

    if (response.includes('I don\'t know') || response.includes('无法') || response.includes('不确定')) {
      flags.push('uncertainty_expressed')
    }

    // @abstract-candidate: Entity grounding check
    // Seen: 1/3 (content-guard.service)
    if (context) {
      // Simple heuristic: check if key named entities in response exist in context
      const entities = this.extractNamedEntities(response)
      let ungrounded = 0
      for (const entity of entities) {
        if (!context.includes(entity)) {
          ungrounded++
        }
      }
      if (ungrounded > entities.length * 0.3) {
        flags.push('high_ungrounded_entities')
      }
    }

    return {
      safe: !flags.includes('high_ungrounded_entities'),
      hallucinationRisk: flags.length > 0 ? 'low' : 'none',
      flags,
    }
  }

  private extractNamedEntities(text: string): string[] {
    // Simple: extract proper nouns (capitalized words, numbers, dates)
    const matches = text.match(/\b[A-Z一-鿿]{2,}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d+\.?\d*%\b/g)
    return matches ? [...new Set(matches)] : []
  }
}
