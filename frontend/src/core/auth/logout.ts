import { tokenManager } from './TokenManager'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Complete logout flow
 * 
 * Clears all authentication layers:
 * 1. TokenManager (tokens)
 * 2. auth.store (user state)
 * 3. React Query cache
 * 
 * This should be called from components to perform a complete logout.
 */
export const performLogout = () => {
  // Clear tokens from TokenManager
  tokenManager.clearTokens()
  
  // Clear user state from auth.store
  const { clearUser } = useAuthStore.getState()
  clearUser()
  
  // Clear React Query cache
  queryClient.clear()
}
