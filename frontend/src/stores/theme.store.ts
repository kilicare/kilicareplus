import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  initializeTheme: () => void
}

// Safe storage handler with quota error handling
const createSafeStorage = (): PersistStorage<{ theme: Theme }> => ({
  getItem: (name: string) => {
    try {
      if (typeof window === 'undefined') return null
      const item = localStorage.getItem(name)
      return item ? JSON.parse(item) : null
    } catch (e) {
      console.warn('Failed to read from localStorage:', e)
      return null
    }
  },
  setItem: (name: string, value: any) => {
    try {
      if (typeof window === 'undefined') return
      localStorage.setItem(name, JSON.stringify(value))
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
        console.warn('localStorage quota exceeded, clearing old data...')
        // Try to clear some space by removing old data
        try {
          localStorage.clear()
          localStorage.setItem(name, JSON.stringify(value))
        } catch (e2) {
          console.warn('Failed to save to localStorage even after clearing:', e2)
        }
      } else {
        console.warn('Failed to write to localStorage:', e)
      }
    }
  },
  removeItem: (name: string) => {
    try {
      if (typeof window === 'undefined') return
      localStorage.removeItem(name)
    } catch (e) {
      console.warn('Failed to remove from localStorage:', e)
    }
  },
})

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      
      setTheme: (theme: Theme) => {
        set({ theme })
        // Apply theme to document
        if (typeof window !== 'undefined') {
          const html = document.documentElement
          html.setAttribute('data-theme', theme)
          html.style.colorScheme = theme
        }
      },
      
      toggleTheme: () => {
        const current = get().theme
        const newTheme = current === 'dark' ? 'light' : 'dark'
        get().setTheme(newTheme)
      },
      
      initializeTheme: () => {
        if (typeof window !== 'undefined') {
          try {
            const stored = localStorage.getItem('app-theme') as Theme | null
            const theme = stored || 'dark'
            get().setTheme(theme)
          } catch (e) {
            console.warn('Failed to initialize theme:', e)
            get().setTheme('dark')
          }
        }
      },
    }),
    {
      name: 'app-theme',
      storage: createSafeStorage(),
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)
