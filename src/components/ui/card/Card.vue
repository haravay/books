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
    'rounded-xl border border-border bg-card text-foreground shadow-soft',
    props.class,
  ),
)
</script>

<template>
  <article :class="classes">
    <slot />
  </article>
</template>
