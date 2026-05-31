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
  setAuthState: (user: User | null, authenticated: boolean) => void
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
}

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
      
      setAuthState: (user, authenticated) => {
        set({ user, isAuthenticated: authenticated })
      },
      
      setAuth: (user, accessToken, refreshToken) => {
        // Store tokens in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('kili_access_token', accessToken)
          localStorage.setItem('kili_refresh_token', refreshToken)
        }
        // Update auth state
        set({ user, isAuthenticated: true })
      },
    }),
    {
      name: 'kili-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        // Do NOT persist isLoading - always start as loading on mount
      }),
    }
  )
)