<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  class: {
    type: String,
    default: '',
  },
})

const classes = computed(() =>
  cn(
    'inline-flex h-11 items-center rounded-lg border border-border bg-muted p-1 text-foreground dark:border-slate-700 dark:bg-slate-900',
    props.class,
  ),
)
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
