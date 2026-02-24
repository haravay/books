<script setup>
import { provide, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])
const current = ref(props.modelValue)

watch(
  () => props.modelValue,
  (value) => {
    current.value = value
  },
)

function setValue(value) {
  current.value = value
  emit('update:modelValue', value)
}

provide('tabsValue', current)
provide('setTabsValue', setValue)
</script>

<template>
  <div>
    <slot />
  </div>
</template>
