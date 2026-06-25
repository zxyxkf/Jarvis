<script setup lang="ts">
import { DropdownMenuContent, type DropdownMenuContentProps, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = withDefaults(defineProps<DropdownMenuContentProps & { class?: string }>(), {
  sideOffset: 4,
})
const forwarded = useForwardProps(props)
const klass = computed(() => cn(
  'z-50 min-w-[8rem] overflow-hidden rounded-xl border p-1 shadow-lg dm-content',
  props.class,
))
</script>

<template>
  <DropdownMenuContent v-bind="forwarded" :class="klass">
    <slot />
  </DropdownMenuContent>
</template>

<style>
.dm-content {
  background: var(--color-bg-secondary) !important;
  color: var(--color-text-primary);
  border-color: var(--color-border) !important;
}
</style>
