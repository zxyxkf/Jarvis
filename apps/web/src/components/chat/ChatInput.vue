<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  disabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  send: [text: string]
  stop: []
}>()

const text = ref('')
const textarea = ref<HTMLTextAreaElement>()

function handleSend() {
  const content = text.value.trim()
  if (!content || props.disabled) return
  emit('send', content)
  text.value = ''
  nextTick(() => autoResize())
}

function handleStop() {
  emit('stop')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function autoResize() {
  if (!textarea.value) return
  textarea.value.style.height = 'auto'
  textarea.value.style.height = Math.min(textarea.value.scrollHeight, 150) + 'px'
}

watch(text, () => nextTick(() => autoResize()))
</script>

<template>
  <div class="flex items-end gap-3 px-8 py-4 border-t border-[var(--color-border-light)] bg-[var(--color-bg-primary)]">
    <textarea
      ref="textarea"
      v-model="text"
      class="flex-1 resize-none bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors max-h-[150px]"
      :placeholder="placeholder || '输入问题...'"
      :disabled="disabled"
      rows="1"
      @keydown="handleKeydown"
    />
    <button
      v-if="!disabled"
      aria-label="发送"
      class="shrink-0 w-10 h-10 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      :disabled="!text.trim()"
      @click="handleSend"
    >
      →
    </button>
    <button
      v-else
      aria-label="停止生成"
      class="shrink-0 w-10 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
      @click="handleStop"
    >
      ■
    </button>
  </div>
</template>
