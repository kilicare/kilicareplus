import { queryClient } from '@/lib/queryClient'
import { sessionManager } from './SessionManager'

/**
 * Complete logout flow
 * 
 * CRITICAL ARCHITECTURE CHANGE:
 * This function should ONLY be called for user-initiated logout.
 * For automatic logout due to auth failures, use sessionManager.markSessionInvalid()
 * 
 * ENFORCES SINGLE ENTRY POINT RULE:
 * All logout operations MUST go through SessionManager.logout()
 * No direct token clearing, no direct auth.store mutation
 * 
 * Clears all authentication layers:
 * 1. SessionManager (tokens + state + tab sync)
 * 2. React Query cache (SELECTIVE - only invalidate auth-related queries)
 * 
 * This should be called from components when user explicitly clicks logout.
 */
export const performLogout = async () => {
  console.log('[performLogout] User-initiated logout')
  
  // SINGLE ENTRY POINT: Use SessionManager.logout() for all logout operations
  await sessionManager.logout()
  
  // CRITICAL ARCHITECTURE CHANGE:
  // Do NOT clear entire React Query cache
  // Only invalidate auth-related queries selectively
  // Cache should persist across auth refresh cycles
  queryClient.invalidateQueries({ queryKey: ['user'] })
  queryClient.invalidateQueries({ queryKey: ['auth'] })
}

/**
 * Handle auth error from API
 * 
 * CRITICAL ARCHITECTURE CHANGE:
 * This function should be called when axios returns isAuthError.
 * It delegates to SessionManager to decide whether to logout.
 * 
 * This implements "FAIL SAFE + RECOVER" instead of "FAIL FAST".
 */
export const handleAuthError = async () => {
  console.log('[handleAuthError] Auth error detected, delegating to SessionManager')
  await sessionManager.markSessionInvalid()
}
