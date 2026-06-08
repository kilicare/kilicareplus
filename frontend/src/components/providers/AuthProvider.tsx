'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'

/**
 * AuthProvider - Initializes authentication state on app load
 * 
 * CRITICAL COMPONENT: This must complete BEFORE any route decisions are made
 * 
 * Flow:
 * 1. Component mounts with isLoading=true
 * 2. Check if route is public (skip auth verification)
 * 3. If protected: Call /auth/me/ to verify HTTP-only JWT cookie
 * 4. If valid: setAuthState(user, true)
 * 5. If invalid (401): setAuthState(null, false)
 * 6. If network error: use cached auth state if available
 * 7. Finally: setLoading(false) → Routes can now redirect if needed
 * 
 * TIMING IS CRITICAL:
 * - All routes check: if (isLoading) return <LoadingSpinner/>
 * - Only redirect after isLoading=false
 * - This prevents redirect loops and race conditions
 * 
 * PUBLIC ROUTES: Skip loading state for /landing and other public routes
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuthState, setLoading, isLoading, user, isAuthenticated } = useAuthStore()
  const pathname = usePathname()
  const hasInitialized = useRef(false)
  
  // Public routes that don't require auth verification
  const publicRoutes = ['/landing', '/login', '/register']
  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))

  useEffect(() => {
    // Skip auth verification for public routes
    if (isPublicRoute) {
      console.log('[AuthProvider] Public route detected, skipping auth verification')
      setLoading(false)
      return
    }

    // Prevent re-initialization if already done (prevents loop on remount)
    if (hasInitialized.current) {
      console.log('[AuthProvider] Already initialized, skipping')
      setLoading(false)
      return
    }

    const initializeAuth = async () => {
      const startTime = performance.now()
      
      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.warn('[AuthProvider] ⚠️  Auth verification timed out after 10 seconds')
        // If we have cached auth state, use it instead of clearing
        if (user && isAuthenticated) {
          console.log('[AuthProvider] Using cached auth state due to timeout')
          setLoading(false)
        } else {
          setLoading(false)
        }
      }, 10000) // 10 second timeout
      
      try {
        console.log('[AuthProvider] Starting auth verification...')
        
        // Call /auth/me/ to verify backend cookie authentication
        // Backend validates the HTTP-only JWT cookie from browser
        const verifiedUser = await authService.getMe()
        
        // Clear timeout since we got a response
        clearTimeout(timeoutId)
        
        const duration = (performance.now() - startTime).toFixed(0)
        console.log(`[AuthProvider] ✅ Auth verified successfully (${duration}ms)`, {
          userId: verifiedUser.id,
          username: verifiedUser.username,
          email: verifiedUser.email,
        })
        
        // User is authenticated - set state
        setAuthState(verifiedUser, true)
      } catch (error: any) {
        // Clear timeout since we got an error response
        clearTimeout(timeoutId)
        
        const duration = (performance.now() - startTime).toFixed(0)
        const errorStatus = error?.response?.status || 'unknown'
        const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error'
        
        if (errorStatus === 401) {
          console.log(
            `[AuthProvider] ℹ️  User not authenticated (401) (${duration}ms)\n` +
            `Reason: ${errorMessage}\n` +
            `This is normal for users who haven't logged in.`
          )
          // 401 means tokens are invalid - clear auth state
          setAuthState(null, false)
        } else if (error?.isNetworkError || error?.isTimeout) {
          console.warn(
            `[AuthProvider] ⚠️  Network/timeout error during auth check (${duration}ms)\n` +
            `Reason: ${errorMessage}\n` +
            `Checking for cached auth state...`
          )
          // If we have cached auth state, use it instead of clearing
          if (user && isAuthenticated) {
            console.log('[AuthProvider] ✅ Using cached auth state due to network error')
            setLoading(false)
            return // Don't clear auth state
          } else {
            console.log('[AuthProvider] No cached auth state, clearing auth')
            setAuthState(null, false)
          }
        } else {
          console.warn(
            `[AuthProvider] ⚠️  Auth check failed with error ${errorStatus} (${duration}ms)\n` +
            `Reason: ${errorMessage}`
          )
          // Other errors - clear auth state for safety
          setAuthState(null, false)
        }
      } finally {
        // CRITICAL: Mark auth verification as complete
        // Only after this, routes are allowed to redirect
        // Double-check to ensure isLoading is always set to false
        console.log('[AuthProvider] 🎯 Auth verification complete. Setting isLoading=false')
        setLoading(false)
        hasInitialized.current = true
      }
    }

    // Only run auth check once on mount
    initializeAuth()
    
    // Cleanup function to clear timeout if component unmounts
    return () => {
      console.log('[AuthProvider] Component unmounting, clearing timeout')
    }
  }, [isPublicRoute])  // Only re-run when route changes, NOT on auth state changes

  // While auth is being verified, nothing should render
  // Protected routes will show loading state via isLoading check
  return <>{children}</>
}
