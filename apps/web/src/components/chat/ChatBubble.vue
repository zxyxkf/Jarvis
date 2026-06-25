<script setup lang="ts">
defineProps<{
  role: 'user' | 'assistant'
  content: string
  isLoading?: boolean
}>()
</script>

<template>
  <div class="flex w-full" :class="role === 'user' ? 'justify-end' : 'justify-start'">
    <div
      :class="[
        'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed transition-colors',
        role === 'user'
          ? 'bg-emerald-500/15 text-[var(--color-text-primary)] rounded-br-md'
          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-bl-md',
      ]"
    >
      <div v-if="isLoading" class="flex items-center gap-1 py-1">
        <span class="w-2 h-2 rounded-full bg-[var(--color-text-muted)] animate-bounce" style="animation-delay: 0ms" />
        <span class="w-2 h-2 rounded-full bg-[var(--color-text-muted)] animate-bounce" style="animation-delay: 150ms" />
        <span class="w-2 h-2 rounded-full bg-[var(--color-text-muted)] animate-bounce" style="animation-delay: 300ms" />
      </div>
      <div v-else class="whitespace-pre-wrap break-words">{{ content }}</div>
    </div>
  </div>
</template>
