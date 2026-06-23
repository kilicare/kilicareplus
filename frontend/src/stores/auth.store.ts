import { create } from 'zustand'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  sessionValid: boolean // NEW: Only true when authenticated AND user is present
  
  setUser: (user: User) => void
  setAuthenticated: (authenticated: boolean) => void
  setLoading: (loading: boolean) => void
  setSessionValid: (valid: boolean) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  sessionValid: false,
  
  setUser: (user) => {
    console.log('[auth.store] setUser called:', { user: user?.username, hasUser: !!user })
    set({ user })
  },
  
  setAuthenticated: (authenticated) => {
    console.log('[auth.store] setAuthenticated called:', { authorized: authenticated })
    set({ isAuthenticated: authenticated })
  },
  
  setLoading: (loading) => {
    console.log('[auth.store] setLoading called:', { loading })
    set({ isLoading: loading })
  },
  
  setSessionValid: (valid) => {
    console.log('[auth.store] setSessionValid called:', { valid })
    set({ sessionValid: valid })
  },
  
  clearUser: () => {
    console.log('[auth.store] clearUser called')
    set({ user: null, isAuthenticated: false, isLoading: false, sessionValid: false })
  },
}))