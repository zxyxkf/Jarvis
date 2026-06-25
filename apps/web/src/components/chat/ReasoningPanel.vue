<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  steps: Array<{ iteration: number; step: string; analysis: string }>
}>()

const expanded = ref(true)
</script>

<template>
  <div class="mb-4 rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-secondary)]">
    <button
      class="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors"
      @click="expanded = !expanded"
    >
      <span>🧠 推理过程 ({{ steps.length }} 步)</span>
      <span>{{ expanded ? '▾' : '▸' }}</span>
    </button>
    <div v-if="expanded" class="px-4 pb-3 space-y-2">
      <div
        v-for="s in steps"
        :key="s.iteration"
        class="text-xs"
      >
        <span class="text-[var(--color-accent)] font-mono">#{{ s.iteration }}</span>
        <span class="text-[var(--color-text-muted)] ml-2 uppercase tracking-wider text-[10px]">{{ s.step }}</span>
        <p class="mt-0.5 text-[var(--color-text-secondary)] leading-relaxed">{{ s.analysis }}</p>
      </div>
    </div>
  </div>
</template>
