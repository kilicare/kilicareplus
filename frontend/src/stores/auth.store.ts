import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  setAuth: (user: User, access: string, refresh: string) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setAuth: (user, access, refresh) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('kili_access', access)
          localStorage.setItem('kili_refresh', refresh)
        }
        set({ user, isAuthenticated: true })
      },
      setUser: (user) => set({ user }),
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('kili_access')
          localStorage.removeItem('kili_refresh')
        }
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'kili-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)