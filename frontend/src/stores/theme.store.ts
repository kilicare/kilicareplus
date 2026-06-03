import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  initializeTheme: () => void
}

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
          const stored = localStorage.getItem('app-theme') as Theme | null
          const theme = stored || 'dark'
          get().setTheme(theme)
        }
      },
    }),
    {
      name: 'app-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)
