<script setup>
import { computed, inject } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  value: {
    type: String,
    required: true,
  },
  class: {
    type: String,
    default: '',
  },
})

const tabsValue = inject('tabsValue')
const setTabsValue = inject('setTabsValue')

const isActive = computed(() => tabsValue?.value === props.value)

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition',
    isActive.value
      ? 'bg-card text-foreground shadow-sm dark:bg-slate-800 dark:text-slate-100'
      : 'text-foreground/70 hover:text-foreground dark:text-slate-300 dark:hover:text-slate-100',
    props.class,
  ),
)
</script>

<template>
  <button :class="classes" @click="setTabsValue?.(value)">
    <slot />
  </button>
</template>
