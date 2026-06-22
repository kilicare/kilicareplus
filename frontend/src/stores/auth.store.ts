import { create } from 'zustand'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  setUser: (user: User) => void
  setAuthenticated: (authenticated: boolean) => void
  setLoading: (loading: boolean) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  setUser: (user) => {
    console.log('[auth.store] setUser called:', { user: user?.username, hasUser: !!user })
    set({ user })
  },
  
  setAuthenticated: (authenticated) => {
    console.log('[auth.store] setAuthenticated called:', { authenticated })
    set({ isAuthenticated: authenticated })
  },
  
  setLoading: (loading) => {
    console.log('[auth.store] setLoading called:', { loading })
    set({ isLoading: loading })
  },
  
  clearUser: () => {
    console.log('[auth.store] clearUser called')
    set({ user: null, isAuthenticated: false, isLoading: false })
  },
}))