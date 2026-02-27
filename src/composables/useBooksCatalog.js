import { computed, onBeforeUnmount, ref } from 'vue'

const FALLBACK_COVER = import.meta.env.VITE_FALLBACK_COVER || 'https://placehold.co/400x600/f1f5f9/0f172a?text=No+Cover'
const PAGE_SIZE = Number.parseInt(import.meta.env.VITE_PAGE_SIZE || '24', 10)
const MAX_RESULTS_WINDOW = Number.parseInt(import.meta.env.VITE_MAX_RESULTS_WINDOW || '1000', 10)
const SEARCH_DEBOUNCE_MS = Number.parseInt(import.meta.env.VITE_SEARCH_DEBOUNCE_MS || '700', 10)

export function useBooksCatalog() {
  const titleQuery = ref('')
  const authorQuery = ref('')
  const books = ref([])
  const loading = ref(false)
  const error = ref('')
  const hasSearched = ref(false)
  const activeQuery = ref('')
  const currentPage = ref(1)
  const totalItems = ref(0)

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

  const cappedTotalItems = computed(() => Math.min(totalItems.value, MAX_RESULTS_WINDOW))
  const totalPages = computed(() => Math.max(1, Math.ceil(cappedTotalItems.value / PAGE_SIZE)))
  const pageNumbers = computed(() => {
    const from = Math.max(1, currentPage.value - 2)
    const to = Math.min(totalPages.value, currentPage.value + 2)
    return Array.from({ length: to - from + 1 }, (_, index) => from + index)
  })
  const displayTotalPages = computed(() => {
    if (totalItems.value > MAX_RESULTS_WINDOW) return `${totalPages.value}`
    return String(totalPages.value)
  })
  const displayTotalItems = computed(() => {
    if (totalItems.value > MAX_RESULTS_WINDOW) return `${MAX_RESULTS_WINDOW}+`
    return String(totalItems.value)
  })
  const catalogCounter = computed(() => (hasSearched.value ? displayTotalItems.value : '0'))

  function goToPage(page) {
    if (page < 1 || page > totalPages.value || loading.value) return
    fetchBooks(page)
  }

  function resetCatalog() {
    titleQuery.value = ''
    authorQuery.value = ''
    activeQuery.value = ''
    books.value = []
    totalItems.value = 0
    currentPage.value = 1
    hasSearched.value = false
    error.value = ''
  }

  onBeforeUnmount(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }
  })

  return {
    titleQuery,
    authorQuery,
    books,
    loading,
    error,
    hasSearched,
    currentPage,
    totalPages,
    pageNumbers,
    totalItems,
    displayTotalPages,
    displayTotalItems,
    catalogCounter,
    submitSearch,
    goToPage,
    resetCatalog,
  }
}
