<script setup lang="ts">
interface Citation {
  chunkId: string
  documentName: string
  content: string
  score: number
}

defineProps<{
  citations: Citation[]
}>()
</script>

<template>
  <div class="mt-2 pt-2 border-t border-[var(--color-border-light)]">
    <p class="text-xs text-[var(--color-text-muted)] mb-1.5">📎 参考来源</p>
    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="cite in citations"
        :key="cite.chunkId"
        class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] cursor-help hover:bg-[var(--color-border)] transition-colors"
        :title="cite.content"
      >
        {{ cite.documentName }}
        <span class="text-[var(--color-text-muted)] text-[10px]">{{ (cite.score * 100).toFixed(0) }}%</span>
      </span>
    </div>
  </div>
</template>
