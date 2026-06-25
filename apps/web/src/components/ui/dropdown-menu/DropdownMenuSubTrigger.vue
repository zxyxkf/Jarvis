<script setup lang="ts">
import { DropdownMenuSubTrigger, type DropdownMenuSubTriggerProps, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = withDefaults(defineProps<DropdownMenuSubTriggerProps & { class?: string; inset?: boolean }>(), {})
const forwarded = useForwardProps(props)
const klass = computed(() => cn(
  'flex cursor-pointer select-none items-center justify-between rounded-lg px-2 py-1.5 text-sm outline-none transition-colors dm-sub-item',
  props.inset && 'pl-8',
  props.class,
))
</script>

<template>
  <DropdownMenuSubTrigger v-bind="forwarded" :class="klass">
    <slot />
    <span class="ml-auto text-xs opacity-50">▸</span>
  </DropdownMenuSubTrigger>
</template>

<style>
.dm-sub-item { color: var(--color-text-secondary) }
.dm-sub-item[data-highlighted] { background: var(--color-bg-hover); color: var(--color-text-primary); outline: none }
.dm-sub-item[data-state="open"] { background: var(--color-bg-hover); color: var(--color-text-primary) }
</style>
