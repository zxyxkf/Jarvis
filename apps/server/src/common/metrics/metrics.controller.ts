import { Controller, Get, Header } from '@nestjs/common'

// Simple Prometheus text format metrics exporter
const metrics = {
  chatRequests: 0,
  chatTokens: 0,
  chatErrors: 0,
  searchRequests: 0,
  searchLatencyMs: 0,
  searchLatencyCount: 0,
  agentTasks: 0,
  agentErrors: 0,
  cacheHits: 0,
  cacheMisses: 0,
}

export function incrementChatRequests() { metrics.chatRequests++ }
export function addChatTokens(n: number) { metrics.chatTokens += n }
export function incrementChatErrors() { metrics.chatErrors++ }
export function incrementSearchRequests() { metrics.searchRequests++ }
export function addSearchLatency(ms: number) { metrics.searchLatencyMs += ms; metrics.searchLatencyCount++ }
export function incrementAgentTasks() { metrics.agentTasks++ }
export function incrementAgentErrors() { metrics.agentErrors++ }
export function incrementCacheHit() { metrics.cacheHits++ }
export function incrementCacheMiss() { metrics.cacheMisses++ }

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  getMetrics(): string {
    const lines: string[] = [
      '# HELP jarvis_chat_requests_total Total chat requests',
      '# TYPE jarvis_chat_requests_total counter',
      `jarvis_chat_requests_total ${metrics.chatRequests}`,
      '# HELP jarvis_chat_tokens_total Total tokens generated',
      '# TYPE jarvis_chat_tokens_total counter',
      `jarvis_chat_tokens_total ${metrics.chatTokens}`,
      '# HELP jarvis_chat_errors_total Total chat errors',
      '# TYPE jarvis_chat_errors_total counter',
      `jarvis_chat_errors_total ${metrics.chatErrors}`,
      '# HELP jarvis_search_requests_total Total search requests',
      '# TYPE jarvis_search_requests_total counter',
      `jarvis_search_requests_total ${metrics.searchRequests}`,
      '# HELP jarvis_search_latency_avg_ms Average search latency',
      '# TYPE jarvis_search_latency_avg_ms gauge',
      `jarvis_search_latency_avg_ms ${metrics.searchLatencyCount > 0 ? Math.round(metrics.searchLatencyMs / metrics.searchLatencyCount) : 0}`,
      '# HELP jarvis_agent_tasks_total Total agent tasks',
      '# TYPE jarvis_agent_tasks_total counter',
      `jarvis_agent_tasks_total ${metrics.agentTasks}`,
      '# HELP jarvis_agent_errors_total Total agent errors',
      '# TYPE jarvis_agent_errors_total counter',
      `jarvis_agent_errors_total ${metrics.agentErrors}`,
      '# HELP jarvis_cache_total Cache hits/misses',
      '# TYPE jarvis_cache_total gauge',
      `jarvis_cache_hits ${metrics.cacheHits}`,
      `jarvis_cache_misses ${metrics.cacheMisses}`,
      '',
    ]
    return lines.join('\n')
  }
}
