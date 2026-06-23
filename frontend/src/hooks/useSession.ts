import { useAuthStore } from '@/stores/auth.store'

interface SessionState {
  sessionValid: boolean  // ONLY trusted flag for session validation
  user: any | null      // User data (only safe when sessionValid === true)
  isReady: boolean      // Convenience: sessionValid && !isLoading
  isLoading: boolean    // Loading state for UI purposes
}

/**
 * useSession - SINGLE ENTRY POINT for auth state access
 * 
 * ENFORCEMENT RULES:
 * - Components MUST use this hook instead of useAuthStore directly
 * - Components MUST check sessionValid before accessing user
 * - Components MUST NOT use isAuthenticated or user alone
 * 
 * @returns SessionState with sessionValid as the ONLY trusted flag
 */
export function useSession(): SessionState {
  const { sessionValid, user, isLoading } = useAuthStore()
  
  return {
    sessionValid,  // ONLY trusted flag for session validation
    user,          // User data (only safe when sessionValid === true)
    isReady: sessionValid && !isLoading,  // Convenience flag
    isLoading,     // Loading state for UI purposes
  }
}
