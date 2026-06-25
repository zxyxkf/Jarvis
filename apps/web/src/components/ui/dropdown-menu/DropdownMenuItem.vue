<script setup lang="ts">
import { DropdownMenuItem, type DropdownMenuItemProps, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = withDefaults(defineProps<DropdownMenuItemProps & { class?: string; inset?: boolean }>(), {})
const forwarded = useForwardProps(props)
const klass = computed(() => cn(
  'relative flex cursor-default select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none transition-colors',
  'focus:bg-accent focus:text-accent-foreground',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  props.inset && 'pl-8',
  props.class,
))
</script>

<template>
  <DropdownMenuItem v-bind="forwarded" :class="klass">
    <slot />
  </DropdownMenuItem>
</template>

<style scoped>
.focus\:bg-accent:focus{background:var(--color-bg-hover)}
.focus\:text-accent-foreground:focus{color:var(--color-text-primary)}
</style>
