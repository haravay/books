import { ref } from 'vue'

import { useBooksCatalog } from '@/composables/useBooksCatalog'
import { useThemeAndFavorites } from '@/composables/useThemeAndFavorites'

export function useBooksApp() {
  const tab = ref('catalog')
  const selectedBook = ref(null)

  const catalog = useBooksCatalog()
  const themeAndFavorites = useThemeAndFavorites()

  function openBookDetails(book) {
    selectedBook.value = book
  }

  function closeBookDetails() {
    selectedBook.value = null
  }

  function resetToHome() {
    catalog.resetCatalog()
    tab.value = 'catalog'
    closeBookDetails()
  }

  return {
    ...catalog,
    ...themeAndFavorites,
    tab,
    selectedBook,
    openBookDetails,
    closeBookDetails,
    resetToHome,
  }
}
