import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  setUser: (user: User) => void
  setAuthenticated: (authenticated: boolean) => void
  setLoading: (loading: boolean) => void
  logout: () => void
  clearAuth: () => void
  setAuthState: (user: User | null, authenticated: boolean) => void
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
}

// Safe JSON storage with quota error handling
const createSafeJSONStorage = () => ({
  getItem: (name: string) => {
    try {
      if (typeof window === 'undefined') return null
      const item = localStorage.getItem(name)
      return item ? JSON.parse(item) : null
    } catch (e) {
      console.warn('Failed to read auth from localStorage:', e)
      return null
    }
  },
  setItem: (name: string, value: string) => {
    try {
      if (typeof window === 'undefined') return
      localStorage.setItem(name, value)
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
        console.warn('localStorage quota exceeded, clearing old data...')
        try {
          // Try to clear other stores to make space
          const keysToRemove = [
            'app-theme',
            'kili-auth', // Will re-save minimal data
            ...Object.keys(localStorage).filter(k => k.startsWith('query-'))
          ]
          keysToRemove.forEach(k => {
            try {
              localStorage.removeItem(k)
            } catch (e2) {
              // Ignore individual failures
            }
          })
          // Try to save again with minimal data
          localStorage.setItem(name, value)
        } catch (e2) {
          console.warn('Failed to save auth even after clearing:', e2)
        }
      } else {
        console.warn('Failed to write auth to localStorage:', e)
      }
    }
  },
  removeItem: (name: string) => {
    try {
      if (typeof window === 'undefined') return
      localStorage.removeItem(name)
    } catch (e) {
      console.warn('Failed to remove auth from localStorage:', e)
    }
  },
})

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true, // Start as loading until /auth/me/ is called
      
      setUser: (user) => set({ user }),
      
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      logout: () => {
        set({ user: null, isAuthenticated: false })
      },
      
      clearAuth: () => {
        // Clear both localStorage and zustand state
        if (typeof window !== 'undefined') {
          localStorage.removeItem('kili_access_token')
          localStorage.removeItem('kili_refresh_token')
        }
        set({ user: null, isAuthenticated: false })
      },
      
      setAuthState: (user, authenticated) => {
        set({ user, isAuthenticated: authenticated })
      },
      
      setAuth: (user, accessToken, refreshToken) => {
        // Store tokens in localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('kili_access_token', accessToken)
            localStorage.setItem('kili_refresh_token', refreshToken)
          } catch (e) {
            console.warn('Failed to store auth tokens:', e)
          }
        }
        // Update auth state
        set({ user, isAuthenticated: true })
      },
    }),
    {
      name: 'kili-auth',
      storage: createJSONStorage(createSafeJSONStorage),
      partialize: (s) => ({
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        // Do NOT persist isLoading - always start as loading on mount
      }),
    }
  )
)