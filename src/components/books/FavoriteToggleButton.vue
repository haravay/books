<script setup>
import { Heart } from 'lucide-vue-next'

import Button from '@/components/ui/button/Button.vue'

defineProps({
  isFavorite: {
    type: Boolean,
    default: false,
  },
  removeOnly: {
    type: Boolean,
    default: false,
  },
  fullWidth: {
    type: Boolean,
    default: true,
  },
})

defineEmits(['toggle'])
</script>

<template>
  <Button
    :variant="removeOnly ? 'outline' : (isFavorite ? 'default' : 'outline')"
    :class="fullWidth
      ? 'mt-auto w-full gap-2 dark:border-[hsl(217_24%_34%)] dark:bg-[hsl(221_34%_18%)] dark:text-[hsl(210_40%_98%)]'
      : 'gap-2'"
    @click.stop="$emit('toggle')"
  >
    <Heart class="h-4 w-4" :class="(removeOnly || isFavorite) ? 'fill-current' : ''" />
    <template v-if="removeOnly">
      Удалить из избранного
    </template>
    <template v-else>
      {{ isFavorite ? 'Убрать из избранного' : 'В избранное' }}
    </template>
  </Button>
</template>
