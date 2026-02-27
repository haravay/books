<script setup>
import Card from '@/components/ui/card/Card.vue'
import FavoriteToggleButton from '@/components/books/FavoriteToggleButton.vue'

defineProps({
  book: {
    type: Object,
    required: true,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['open', 'toggle-favorite'])
</script>

<template>
  <Card
    class="flex cursor-pointer flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lg"
    @click="$emit('open', book)"
  >
    <img :src="book.thumbnail" :alt="book.title" class="h-64 w-full object-cover" />
    <div class="flex flex-1 flex-col space-y-3 bg-transparent p-4 text-foreground dark:bg-[hsl(221_34%_16%)] dark:text-[hsl(210_40%_98%)]">
      <div>
        <h2
          class="text-lg font-bold text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [line-clamp:2] dark:text-[hsl(210_40%_98%)]"
        >
          {{ book.title }}
        </h2>
        <p class="mt-1 text-sm text-foreground/80 dark:text-[hsl(210_40%_92%)]">{{ book.authors }}</p>
        <p
          v-if="!compact"
          class="mt-1 text-xs font-medium uppercase tracking-wide text-[hsl(var(--foreground)/0.72)] dark:text-[hsl(210_40%_88%)]"
        >
          {{ book.publishedDate }}
        </p>
      </div>

      <p
        v-if="!compact"
        class="overflow-hidden text-sm [display:-webkit-box] [-webkit-box-orient:vertical] text-[hsl(var(--foreground)/0.9)] dark:text-[hsl(210_40%_94%)]"
        style="-webkit-line-clamp: 3; line-clamp: 3;"
      >
        {{ book.description }}
      </p>

      <FavoriteToggleButton
        :is-favorite="isFavorite"
        :remove-only="compact"
        @toggle="$emit('toggle-favorite', book)"
      />
    </div>
  </Card>
</template>
