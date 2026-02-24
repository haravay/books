<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BookOpen, Heart, Search, X } from 'lucide-vue-next'

import Button from '@/components/ui/button/Button.vue'
import Card from '@/components/ui/card/Card.vue'
import Input from '@/components/ui/input/Input.vue'
import Tabs from '@/components/ui/tabs/Tabs.vue'
import TabsContent from '@/components/ui/tabs/TabsContent.vue'
import TabsList from '@/components/ui/tabs/TabsList.vue'
import TabsTrigger from '@/components/ui/tabs/TabsTrigger.vue'

const STORAGE_KEY = 'books-favorites'
const THEME_STORAGE_KEY = 'books-theme'
const FALLBACK_COVER = 'https://placehold.co/400x600/f1f5f9/0f172a?text=No+Cover'
const PAGE_SIZE = 24
const MAX_RESULTS_WINDOW = 1000
const SEARCH_DEBOUNCE_MS = 700

const titleQuery = ref('')
const authorQuery = ref('')
const books = ref([])
const loading = ref(false)
const error = ref('')
const hasSearched = ref(false)
const tab = ref('catalog')
const favorites = ref({})
const activeQuery = ref('')
const currentPage = ref(1)
const totalItems = ref(0)
const selectedBook = ref(null)
const isDark = ref(false)
let removeThemeListener = null
let searchDebounceTimer = null
const booksCache = new Map()

function buildQuery() {
  const title = titleQuery.value.trim()
  const author = authorQuery.value.trim()
  const parts = []

  if (title) parts.push(`intitle:${title}`)
  if (author) parts.push(`inauthor:${author}`)

  return parts.length ? parts.join('+') : ''
}

function normalizeBook(item) {
  const info = item.volumeInfo ?? {}
  return {
    id: item.id,
    title: info.title || 'Без названия',
    authors: (info.authors || ['Автор не указан']).join(', '),
    description: info.description || 'Описание отсутствует',
    thumbnail: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || FALLBACK_COVER,
    publishedDate: info.publishedDate || 'Дата неизвестна',
    publisher: info.publisher || 'Не указан',
    pageCount: info.pageCount || 'Не указано',
    categories: (info.categories || ['Без категории']).join(', '),
    language: (info.language || 'n/a').toUpperCase(),
    previewLink: info.previewLink || '',
  }
}

async function fetchBooks(page = 1) {
  const query = activeQuery.value
  const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY?.trim()
  const apiKeysFromList = (import.meta.env.VITE_GOOGLE_BOOKS_API_KEYS || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
  const apiKeys = Array.from(new Set([apiKey, ...apiKeysFromList].filter(Boolean)))
  const requestKey = `${query}::${page}`
  error.value = ''

  if (!query) {
    books.value = []
    totalItems.value = 0
    hasSearched.value = false
    error.value = 'Введите название книги или автора для поиска.'
    return
  }

  if (booksCache.has(requestKey)) {
    const cached = booksCache.get(requestKey)
    books.value = cached.items
    totalItems.value = cached.totalItems
    currentPage.value = page
    hasSearched.value = true
    return
  }

  loading.value = true
  hasSearched.value = true

  try {
    const startIndex = (page - 1) * PAGE_SIZE
    const requestBooks = async (keyOverride) => {
      const url = new URL('https://www.googleapis.com/books/v1/volumes')
      url.searchParams.set('q', query)
      url.searchParams.set('startIndex', String(startIndex))
      url.searchParams.set('maxResults', String(PAGE_SIZE))
      url.searchParams.set('printType', 'books')
      if (keyOverride) {
        url.searchParams.set('key', keyOverride)
      }

      const response = await fetch(url.toString())
      let payload = null
      try {
        payload = await response.json()
      } catch {
        // Some error responses may not be JSON; handle below by status only.
      }
      return { response, payload }
    }

    const keysToTry = [...apiKeys, '']
    let response = null
    let payload = null
    let exhaustedAllQuotaAttempts = false

    for (const keyCandidate of keysToTry) {
      const attempt = await requestBooks(keyCandidate)
      response = attempt.response
      payload = attempt.payload

      if (response.ok) break
      if (response.status !== 429) break
      if (!keyCandidate) {
        exhaustedAllQuotaAttempts = true
        break
      }
    }

    if (!response) {
      throw new Error('Не удалось выполнить запрос к Google Books API.')
    }

    if (!response.ok) {
      const details = payload?.error?.message || payload?.message || ''
      const status = `HTTP ${response.status}`

      if (response.status === 429) {
        if (exhaustedAllQuotaAttempts && apiKeys.length > 0) {
          throw new Error('Превышен лимит всех заданных API-ключей Google Books. Добавьте другой ключ или подождите сброса квоты.')
        }
        throw new Error('Превышен лимит запросов Google Books API. Попробуйте позже или используйте другой API-ключ.')
      }

      const prefix = 'Не удалось загрузить каталог.'
      throw new Error(details ? `${prefix} ${status}: ${details}` : `${prefix} ${status}.`)
    }

    const data = payload || {}
    const normalizedBooks = (data.items || []).map(normalizeBook)
    books.value = normalizedBooks
    totalItems.value = data.totalItems || 0
    currentPage.value = page
    booksCache.set(requestKey, {
      items: normalizedBooks,
      totalItems: totalItems.value,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Ошибка загрузки'
    books.value = []
    totalItems.value = 0
  } finally {
    loading.value = false
  }
}

function runSearchNow() {
  if (loading.value) return
  const query = buildQuery()
  if (!query) {
    activeQuery.value = ''
    fetchBooks(1)
    return
  }

  const nextKey = `${query}::1`
  const currentKey = `${activeQuery.value}::${currentPage.value}`
  if (hasSearched.value && nextKey === currentKey) return

  activeQuery.value = query
  fetchBooks(1)
}

function submitSearch() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    runSearchNow()
  }, SEARCH_DEBOUNCE_MS)
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value || loading.value) return
  fetchBooks(page)
}

function openBookDetails(book) {
  selectedBook.value = book
}

function closeBookDetails() {
  selectedBook.value = null
}

function resetToHome() {
  titleQuery.value = ''
  authorQuery.value = ''
  activeQuery.value = ''
  books.value = []
  totalItems.value = 0
  currentPage.value = 1
  hasSearched.value = false
  error.value = ''
  tab.value = 'catalog'
  closeBookDetails()
}

function applyTheme(darkEnabled) {
  const root = document.documentElement

  root.classList.toggle('dark', darkEnabled)
  root.setAttribute('data-theme', darkEnabled ? 'dark' : 'light')
  root.style.colorScheme = darkEnabled ? 'dark' : 'light'
}

function persistTheme(darkEnabled) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, darkEnabled ? 'dark' : 'light')
  } catch {
    // Ignore storage issues (private mode/quota) and keep runtime theme state.
  }
}

function toggleTheme() {
  isDark.value = !isDark.value
  applyTheme(isDark.value)
  persistTheme(isDark.value)
}

function loadTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme === 'light' || savedTheme === 'dark') {
      isDark.value = savedTheme === 'dark'
      applyTheme(isDark.value)
      return
    }
  } catch {
    // Fall back to system preference when localStorage is unavailable.
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = prefersDark
  applyTheme(isDark.value)
}

function loadFavorites() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    favorites.value = JSON.parse(raw)
  } catch {
    favorites.value = {}
  }
}

function saveFavorites() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites.value))
}

function isFavorite(bookId) {
  return Boolean(favorites.value[bookId])
}

function toggleFavorite(book) {
  if (favorites.value[book.id]) {
    delete favorites.value[book.id]
  } else {
    favorites.value[book.id] = book
  }
  saveFavorites()
}

const favoriteBooks = computed(() => Object.values(favorites.value))
const cappedTotalItems = computed(() => Math.min(totalItems.value, MAX_RESULTS_WINDOW))
const totalPages = computed(() => Math.max(1, Math.ceil(cappedTotalItems.value / PAGE_SIZE)))
const displayTotalPages = computed(() => {
  if (totalItems.value > MAX_RESULTS_WINDOW) return `${totalPages.value}`
  return String(totalPages.value)
})
const pageNumbers = computed(() => {
  const from = Math.max(1, currentPage.value - 2)
  const to = Math.min(totalPages.value, currentPage.value + 2)
  return Array.from({ length: to - from + 1 }, (_, index) => from + index)
})
const displayTotalItems = computed(() => {
  if (totalItems.value > MAX_RESULTS_WINDOW) return `${MAX_RESULTS_WINDOW}+`
  return String(totalItems.value)
})
const catalogCounter = computed(() => (hasSearched.value ? displayTotalItems.value : '0'))

onMounted(() => {
  loadTheme()
  loadFavorites()

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleSystemThemeChange = (event) => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
      if (savedTheme === 'light' || savedTheme === 'dark') return
    } catch {
      // If storage is unavailable, still follow system theme.
    }

    isDark.value = event.matches
  }

  mediaQuery.addEventListener('change', handleSystemThemeChange)
  removeThemeListener = () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
})

watch(isDark, (darkEnabled) => {
  applyTheme(darkEnabled)
})

onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  if (removeThemeListener) {
    removeThemeListener()
  }
})
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

          <div v-else class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card
              v-for="book in books"
              :key="book.id"
              class="flex cursor-pointer flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lg"
              @click="openBookDetails(book)"
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
                  <p class="mt-1 text-xs font-medium uppercase tracking-wide text-[hsl(var(--foreground)/0.72)] dark:text-[hsl(210_40%_88%)]">
                    {{ book.publishedDate }}
                  </p>
                </div>

                <p
                  class="overflow-hidden text-sm [display:-webkit-box] [-webkit-box-orient:vertical] text-[hsl(var(--foreground)/0.9)] dark:text-[hsl(210_40%_94%)]"
                  style="-webkit-line-clamp: 3; line-clamp: 3;"
                >
                  {{ book.description }}
                </p>

                <Button
                  :variant="isFavorite(book.id) ? 'default' : 'outline'"
                  class="mt-auto w-full gap-2 dark:border-[hsl(217_24%_34%)] dark:bg-[hsl(221_34%_18%)] dark:text-[hsl(210_40%_98%)]"
                  @click.stop="toggleFavorite(book)"
                >
                  <Heart class="h-4 w-4" :class="isFavorite(book.id) ? 'fill-current' : ''" />
                  {{ isFavorite(book.id) ? 'Убрать из избранного' : 'В избранное' }}
                </Button>
              </div>
            </Card>
          </div>

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

          <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card
              v-for="book in favoriteBooks"
              :key="book.id"
              class="flex cursor-pointer flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lg"
              @click="openBookDetails(book)"
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
                </div>

                <Button
                  variant="outline"
                  class="mt-auto w-full gap-2 dark:border-[hsl(217_24%_34%)] dark:bg-[hsl(221_34%_18%)] dark:text-[hsl(210_40%_98%)]"
                  @click.stop="toggleFavorite(book)"
                >
                  <Heart class="h-4 w-4 fill-current" />
                  Удалить из избранного
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </TabsContent>
    </Tabs>

    <div
      v-if="selectedBook"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      @click.self="closeBookDetails"
    >
      <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6 text-foreground shadow-2xl dark:border-[hsl(217_24%_34%)] dark:bg-[hsl(221_39%_14%)] dark:text-[hsl(210_40%_98%)]">
        <div class="flex items-start justify-between gap-4">
          <h2 class="text-2xl font-bold">{{ selectedBook.title }}</h2>
          <Button variant="ghost" size="icon" @click="closeBookDetails">
            <X class="h-5 w-5" />
          </Button>
        </div>

        <div class="mt-5 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <img :src="selectedBook.thumbnail" :alt="selectedBook.title" class="w-full rounded-lg object-cover" />
          <div class="space-y-3 text-foreground dark:text-[hsl(210_40%_98%)]">
            <p><span class="font-semibold">Автор:</span> {{ selectedBook.authors || 'Не указан' }}</p>
            <p><span class="font-semibold">Дата:</span> {{ selectedBook.publishedDate || 'Не указана' }}</p>
            <p><span class="font-semibold">Издатель:</span> {{ selectedBook.publisher || 'Не указан' }}</p>
            <p><span class="font-semibold">Страниц:</span> {{ selectedBook.pageCount || 'Не указано' }}</p>
            <p><span class="font-semibold">Категории:</span> {{ selectedBook.categories || 'Не указаны' }}</p>
            <p><span class="font-semibold">Язык:</span> {{ selectedBook.language || 'Не указан' }}</p>
            <p class="whitespace-pre-line text-[hsl(var(--foreground)/0.88)] dark:text-[hsl(210_40%_96%)]">
              {{ selectedBook.description || 'Описание отсутствует' }}
            </p>

            <div class="flex flex-wrap gap-2 pt-2">
              <Button
                :variant="isFavorite(selectedBook.id) ? 'default' : 'outline'"
                class="gap-2"
                @click="toggleFavorite(selectedBook)"
              >
                <Heart class="h-4 w-4" :class="isFavorite(selectedBook.id) ? 'fill-current' : ''" />
                {{ isFavorite(selectedBook.id) ? 'Убрать из избранного' : 'В избранное' }}
              </Button>
              <a v-if="selectedBook.previewLink" :href="selectedBook.previewLink" target="_blank" rel="noopener noreferrer">
                <Button variant="outline">Открыть в Google Books</Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
