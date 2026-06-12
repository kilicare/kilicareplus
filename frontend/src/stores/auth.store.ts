import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types'
import { QueryClient } from '@tanstack/react-query'
import { tokenManager } from '@/core/auth/TokenManager'

// Global query client instance for cache invalidation
let queryClient: QueryClient | null = null

export const setQueryClient = (client: QueryClient) => {
  queryClient = client
}

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
        // CRITICAL: Set isLoading to false to prevent loading loop after logout
        set({ user: null, isAuthenticated: false, isLoading: false })

        // Clear tokens from localStorage via TokenManager
        tokenManager.clearTokens()

        // CRITICAL: Invalidate React Query cache on logout to prevent stale data
        if (queryClient) {
          queryClient.clear()
        }
      },
      
      clearAuth: () => {
        // Clear both localStorage and zustand state via TokenManager
        tokenManager.clearTokens()

        // CRITICAL: Set isLoading to false to prevent loading loop after clear
        set({ user: null, isAuthenticated: false, isLoading: false })

        // CRITICAL: Invalidate React Query cache on auth clear to prevent stale data
        if (queryClient) {
          queryClient.clear()
        }
      },
      
      setAuthState: (user, authenticated) => {
        // CRITICAL: Set isLoading to false when auth state is set
        set({ user, isAuthenticated: authenticated, isLoading: false })
      },
      
      setAuth: (user, accessToken, refreshToken) => {
        // Store tokens in localStorage via TokenManager
        tokenManager.setTokens(accessToken, refreshToken)

        // Update auth state
        // CRITICAL: Set isLoading to false to prevent infinite loading loop
        set({ user, isAuthenticated: true, isLoading: false })
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