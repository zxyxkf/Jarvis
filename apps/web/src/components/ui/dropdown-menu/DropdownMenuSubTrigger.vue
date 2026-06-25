<script setup lang="ts">
import { DropdownMenuSubTrigger, type DropdownMenuSubTriggerProps, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = withDefaults(defineProps<DropdownMenuSubTriggerProps & { class?: string; inset?: boolean }>(), {})
const forwarded = useForwardProps(props)
const klass = computed(() => cn(
  'flex cursor-default select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none transition-colors',
  'focus:bg-accent focus:text-accent-foreground',
  'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
  props.inset && 'pl-8',
  props.class,
))
</script>

<template>
  <DropdownMenuSubTrigger v-bind="forwarded" :class="klass">
    <slot />
  </DropdownMenuSubTrigger>
</template>

<style scoped>
.focus\:bg-accent:focus{background:var(--color-bg-hover)}
.focus\:text-accent-foreground:focus{color:var(--color-text-primary)}
</style>
