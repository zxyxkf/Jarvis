<script setup lang="ts">
import { DropdownMenuSubContent, type DropdownMenuSubContentProps, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = withDefaults(defineProps<DropdownMenuSubContentProps & { class?: string }>(), {
  sideOffset: 4,
})
const forwarded = useForwardProps(props)
const klass = computed(() => cn(
  'z-50 min-w-[8rem] overflow-hidden rounded-xl border p-1 shadow-lg dm-sub-content',
  props.class,
))
</script>

<template>
  <DropdownMenuSubContent v-bind="forwarded" :class="klass">
    <slot />
  </DropdownMenuSubContent>
</template>

<style>
.dm-sub-content {
  background: var(--color-bg-secondary) !important;
  color: var(--color-text-primary);
  border-color: var(--color-border) !important;
}
</style>
