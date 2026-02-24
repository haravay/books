<script setup>
import { computed, inject } from 'vue'

const props = defineProps({
  value: {
    type: String,
    required: true,
  },
})

const tabsValue = inject('tabsValue')
const isVisible = computed(() => tabsValue?.value === props.value)
</script>

<template>
  <div v-if="isVisible">
    <slot />
  </div>
</template>
