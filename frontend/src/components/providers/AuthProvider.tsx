'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'

/**
 * AuthProvider - Initializes authentication state on app load
 * 
 * CRITICAL COMPONENT: This must complete BEFORE any route decisions are made
 * 
 * Flow:
 * 1. Component mounts with isLoading=true
 * 2. Calls /auth/me/ to verify HTTP-only JWT cookie
 * 3. If valid: setAuthState(user, true)
 * 4. If invalid (401): setAuthState(null, false)
 * 5. Finally: setLoading(false) → Routes can now redirect if needed
 * 
 * TIMING IS CRITICAL:
 * - All routes check: if (isLoading) return <LoadingSpinner/>
 * - Only redirect after isLoading=false
 * - This prevents redirect loops and race conditions
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuthState, setLoading, isLoading } = useAuthStore()

  useEffect(() => {
    const initializeAuth = async () => {
      const startTime = performance.now()
      
      try {
        console.log('[AuthProvider] Starting auth verification...')
        
        // Call /auth/me/ to verify backend cookie authentication
        // Backend validates the HTTP-only JWT cookie from browser
        const user = await authService.getMe()
        
        const duration = (performance.now() - startTime).toFixed(0)
        console.log(`[AuthProvider] ✅ Auth verified successfully (${duration}ms)`, {
          userId: user.id,
          username: user.username,
          email: user.email,
        })
        
        // User is authenticated - set state
        setAuthState(user, true)
      } catch (error: any) {
        const duration = (performance.now() - startTime).toFixed(0)
        const errorStatus = error?.response?.status || 'unknown'
        const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error'
        
        if (errorStatus === 401) {
          console.log(
            `[AuthProvider] ℹ️  User not authenticated (401) (${duration}ms)\n` +
            `Reason: ${errorMessage}\n` +
            `This is normal for users who haven't logged in.`
          )
        } else {
          console.warn(
            `[AuthProvider] ⚠️  Auth check failed with error ${errorStatus} (${duration}ms)\n` +
            `Reason: ${errorMessage}`
          )
        }
        
        // Not authenticated - clear state
        setAuthState(null, false)
      } finally {
        // CRITICAL: Mark auth verification as complete
        // Only after this, routes are allowed to redirect
        console.log('[AuthProvider] 🎯 Auth verification complete. Setting isLoading=false')
        setLoading(false)
      }
    }

    // Only run auth check once on mount
    initializeAuth()
  }, [])  // ✅ Empty dependency array - run only once on mount

  // While auth is being verified, nothing should render
  // Protected routes will show loading state via isLoading check
  return <>{children}</>
}
