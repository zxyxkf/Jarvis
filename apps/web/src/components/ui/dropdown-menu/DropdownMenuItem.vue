<script setup lang="ts">
import { DropdownMenuItem, type DropdownMenuItemProps, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = withDefaults(defineProps<DropdownMenuItemProps & { class?: string; inset?: boolean }>(), {})
const forwarded = useForwardProps(props)
const klass = computed(() => cn(
  'relative flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none transition-colors dm-item',
  props.inset && 'pl-8',
  props.class,
))
</script>

<template>
  <DropdownMenuItem v-bind="forwarded" :class="klass">
    <slot />
  </DropdownMenuItem>
</template>

<style>
.dm-item { color: var(--color-text-secondary) }
.dm-item[data-highlighted] { background: var(--color-bg-hover); color: var(--color-text-primary); outline: none }
.dm-item[data-disabled] { pointer-events: none; opacity: 0.5 }
</style>
