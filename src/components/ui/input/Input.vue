<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  placeholder: {
    type: String,
    default: '',
  },
  class: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const classes = computed(() =>
  cn(
    'flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
    props.class,
  ),
)
</script>

<template>
  <input
    :type="type"
    :placeholder="placeholder"
    :class="classes"
    :value="modelValue"
    @input="emit('update:modelValue', $event.target.value)"
  />
</template>
