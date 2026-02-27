import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const STORAGE_KEY = import.meta.env.VITE_STORAGE_KEY || 'books-favorites'
const THEME_STORAGE_KEY = import.meta.env.VITE_THEME_STORAGE_KEY || 'books-theme'

export function useThemeAndFavorites() {
  const isDark = ref(false)
  const favorites = ref({})
  let removeThemeListener = null

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
  const favoriteBookIds = computed(() => new Set(Object.keys(favorites.value)))

  onMounted(() => {
    loadTheme()
    loadFavorites()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (event) => {
      try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
        if (savedTheme === 'light' || savedTheme === 'dark') return
      } catch {
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
    if (removeThemeListener) {
      removeThemeListener()
    }
  })

  return {
    isDark,
    favoriteBooks,
    favoriteBookIds,
    toggleTheme,
    isFavorite,
    toggleFavorite,
  }
}
