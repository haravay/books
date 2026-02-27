<script setup>
import { X } from 'lucide-vue-next'

import Button from '@/components/ui/button/Button.vue'
import FavoriteToggleButton from '@/components/books/FavoriteToggleButton.vue'

const props = defineProps({
  book: {
    type: Object,
    required: true,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'toggle-favorite'])

function handleToggleFavorite() {
  emit('toggle-favorite', props.book)
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    @click.self="emit('close')"
  >
    <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6 text-foreground shadow-2xl dark:border-[hsl(217_24%_34%)] dark:bg-[hsl(221_39%_14%)] dark:text-[hsl(210_40%_98%)]">
      <div class="flex items-start justify-between gap-4">
        <h2 class="text-2xl font-bold">{{ props.book.title }}</h2>
        <Button variant="ghost" size="icon" @click="emit('close')">
          <X class="h-5 w-5" />
        </Button>
      </div>

      <div class="mt-5 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <img :src="props.book.thumbnail" :alt="props.book.title" class="w-full rounded-lg object-cover" />
        <div class="space-y-3 text-foreground dark:text-[hsl(210_40%_98%)]">
          <p><span class="font-semibold">Автор:</span> {{ props.book.authors || 'Не указан' }}</p>
          <p><span class="font-semibold">Дата:</span> {{ props.book.publishedDate || 'Не указана' }}</p>
          <p><span class="font-semibold">Издатель:</span> {{ props.book.publisher || 'Не указан' }}</p>
          <p><span class="font-semibold">Страниц:</span> {{ props.book.pageCount || 'Не указано' }}</p>
          <p><span class="font-semibold">Категории:</span> {{ props.book.categories || 'Не указаны' }}</p>
          <p><span class="font-semibold">Язык:</span> {{ props.book.language || 'Не указан' }}</p>
          <p class="whitespace-pre-line text-[hsl(var(--foreground)/0.88)] dark:text-[hsl(210_40%_96%)]">
            {{ props.book.description || 'Описание отсутствует' }}
          </p>

          <div class="flex flex-wrap gap-2 pt-2">
            <FavoriteToggleButton
              :is-favorite="props.isFavorite"
              :full-width="false"
              @toggle="handleToggleFavorite"
            />
            <a v-if="props.book.previewLink" :href="props.book.previewLink" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">Открыть в Google Books</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
