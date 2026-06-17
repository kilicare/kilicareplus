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
  
  setUser: (user) => set({ user }),
  
  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  clearUser: () => set({ user: null, isAuthenticated: false, isLoading: false }),
}))