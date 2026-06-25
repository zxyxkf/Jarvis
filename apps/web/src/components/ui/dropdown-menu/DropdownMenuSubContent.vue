<script setup lang="ts">
import { DropdownMenuSubContent, type DropdownMenuSubContentProps, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = withDefaults(defineProps<DropdownMenuSubContentProps & { class?: string }>(), {
  sideOffset: 4,
})
const forwarded = useForwardProps(props)
const klass = computed(() => cn(
  'z-50 min-w-[8rem] overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg',
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
  'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
  props.class,
))
</script>

<template>
  <DropdownMenuSubContent v-bind="forwarded" :class="klass">
    <slot />
  </DropdownMenuSubContent>
</template>

<style scoped>
.bg-popover{background:var(--color-bg-secondary)}
.text-popover-foreground{color:var(--color-text-primary)}
</style>
