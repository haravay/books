<script setup>
import { BookOpen, Search } from 'lucide-vue-next'

import BookDetailsModal from '@/components/books/BookDetailsModal.vue'
import BooksGrid from '@/components/books/BooksGrid.vue'
import { useBooksApp } from '@/composables/useBooksApp'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import Tabs from '@/components/ui/tabs/Tabs.vue'
import TabsContent from '@/components/ui/tabs/TabsContent.vue'
import TabsList from '@/components/ui/tabs/TabsList.vue'
import TabsTrigger from '@/components/ui/tabs/TabsTrigger.vue'

const {
  titleQuery,
  authorQuery,
  books,
  loading,
  error,
  hasSearched,
  tab,
  currentPage,
  totalPages,
  pageNumbers,
  selectedBook,
  isDark,
  favoriteBooks,
  displayTotalPages,
  displayTotalItems,
  catalogCounter,
  favoriteBookIds,
  submitSearch,
  goToPage,
  openBookDetails,
  closeBookDetails,
  resetToHome,
  toggleTheme,
  isFavorite,
  toggleFavorite,
} = useBooksApp()

</script>

<template>
  <div class="mx-auto max-w-7xl p-4 md:p-8">
    <Tabs v-model="tab">
      <section
        class="rounded-xl border border-border/80 p-5 shadow-soft backdrop-blur [background-color:hsl(var(--card)/0.88)] md:p-7 dark:border-[hsl(var(--border)/0.95)] dark:bg-card dark:shadow-lg dark:[-webkit-backdrop-filter:none] dark:[backdrop-filter:none]"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.15em] text-[hsl(var(--foreground)/0.7)] dark:text-[hsl(var(--foreground))]">
              Google Books API
            </p>
            <h1
              class="mt-2 flex cursor-pointer items-center gap-2 text-2xl font-extrabold md:text-4xl"
              @click="resetToHome"
            >
              <BookOpen class="h-7 w-7 text-primary" />
              Каталог книг
            </h1>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <TabsList>
              <TabsTrigger value="catalog">Каталог ({{ catalogCounter }})</TabsTrigger>
              <TabsTrigger value="favorites">Избранное ({{ favoriteBooks.length }})</TabsTrigger>
            </TabsList>
            <button
              type="button"
              role="switch"
              :aria-checked="isDark"
              :aria-label="isDark ? 'Включена темная тема' : 'Включена светлая тема'"
              class="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-muted px-2 text-xs font-semibold text-foreground transition hover:bg-card"
              @click="toggleTheme"
            >
              <span class="px-1.5 text-foreground/80 dark:text-foreground">
                {{ isDark ? 'Тёмная' : 'Светлая' }}
              </span>
              <span class="relative h-6 w-11 rounded-full bg-border transition-colors dark:bg-background">
                <span
                  class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform dark:bg-foreground"
                  :class="{ 'translate-x-5': isDark }"
                />
              </span>
            </button>
          </div>
        </div>
      </section>

      <TabsContent value="catalog">
        <section
          class="mt-6 rounded-xl border border-border/80 p-5 shadow-soft backdrop-blur [background-color:hsl(var(--card)/0.88)] md:p-7 dark:border-[hsl(var(--border)/0.95)] dark:bg-card dark:shadow-lg dark:[-webkit-backdrop-filter:none] dark:[backdrop-filter:none]"
        >
          <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div class="w-full">
              <div class="grid gap-3 md:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium">Название</label>
                  <Input v-model="titleQuery" placeholder="Например: Гарри Поттер" @keyup.enter="submitSearch" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium">Автор</label>
                  <Input v-model="authorQuery" placeholder="Например: Роулинг" @keyup.enter="submitSearch" />
                </div>
              </div>
            </div>
            <Button class="gap-2 md:min-w-40" :disabled="loading" @click="submitSearch">
              <Search class="h-4 w-4" />
              {{ loading ? 'Загрузка...' : 'Найти книги' }}
            </Button>
          </div>
        </section>

        <section class="mt-6">
          <p
            v-if="error"
            class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            {{ error }}
          </p>

          <div v-if="loading" class="mt-5 text-sm text-foreground/70">Загружаю книги...</div>

          <div v-else-if="!hasSearched" class="mt-5 text-sm text-foreground/70">
            Введите запрос и нажмите "Найти книги".
          </div>

          <div v-else-if="books.length === 0" class="mt-5 text-sm text-foreground/70">
            По вашему запросу ничего не найдено.
          </div>

          <BooksGrid
            v-else
            class="mt-5"
            :books="books"
            :favorite-ids="favoriteBookIds"
            @open-book="openBookDetails"
            @toggle-favorite="toggleFavorite"
          />

          <div v-if="hasSearched && books.length > 0 && totalPages > 1" class="mt-6 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" :disabled="currentPage === 1 || loading" @click="goToPage(currentPage - 1)">
              Назад
            </Button>
            <Button
              v-for="page in pageNumbers"
              :key="page"
              size="sm"
              :variant="page === currentPage ? 'default' : 'outline'"
              @click="goToPage(page)"
            >
              {{ page }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="currentPage >= totalPages || loading"
              @click="goToPage(currentPage + 1)"
            >
              Далее
            </Button>
            <p class="ml-auto text-sm text-foreground/70">
              Страница {{ currentPage }} из {{ displayTotalPages }}. Найдено книг: {{ displayTotalItems }}.
            </p>
          </div>
        </section>
      </TabsContent>

      <TabsContent value="favorites">
        <section class="mt-6">
          <div v-if="favoriteBooks.length === 0" class="text-sm text-foreground/70">
            Избранных книг пока нет.
          </div>

          <BooksGrid
            v-else
            :books="favoriteBooks"
            :favorite-ids="favoriteBookIds"
            compact
            @open-book="openBookDetails"
            @toggle-favorite="toggleFavorite"
          />
        </section>
      </TabsContent>
    </Tabs>

    <BookDetailsModal
      v-if="selectedBook"
      :book="selectedBook"
      :is-favorite="isFavorite(selectedBook.id)"
      @close="closeBookDetails"
      @toggle-favorite="toggleFavorite"
    />
  </div>
</template>
