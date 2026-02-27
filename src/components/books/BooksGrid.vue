<script setup>
import { computed } from 'vue'

import BookCard from '@/components/books/BookCard.vue'

const props = defineProps({
  books: {
    type: Array,
    default: () => [],
  },
  favoriteIds: {
    type: [Array, Object],
    default: () => [],
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['open-book', 'toggle-favorite'])

const favoriteIdSet = computed(() => {
  if (props.favoriteIds instanceof Set) return props.favoriteIds
  return new Set((props.favoriteIds || []).map((id) => String(id)))
})

function isFavoriteBook(bookId) {
  return favoriteIdSet.value.has(String(bookId))
}
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <BookCard
      v-for="book in props.books"
      :key="book.id"
      :book="book"
      :is-favorite="isFavoriteBook(book.id)"
      :compact="props.compact"
      @open="emit('open-book', $event)"
      @toggle-favorite="emit('toggle-favorite', $event)"
    />
  </div>
</template>
