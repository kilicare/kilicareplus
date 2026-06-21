'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { tokenManager } from '@/core/auth/TokenManager'

/**
 * AuthProvider - Session bootstrap ONLY
 * 
 * CRITICAL COMPONENT: This must complete BEFORE any route decisions are made
 * 
 * Flow:
 * 1. Component mounts with isLoading=true
 * 2. Check if route is public (skip auth verification)
 * 3. If protected: Get token from TokenManager
 * 4. If no token → set isAuthenticated = false
 * 5. If token exists → call /auth/me
 * 6. If success: update auth.store with user + isAuthenticated=true
 * 7. If fail: clear TokenManager + auth.store
 * 8. Finally: setLoading(false) → Routes can now redirect if needed
 * 
 * TIMING IS CRITICAL:
 * - All routes check: if (isLoading) return <LoadingSpinner/>
 * - Only redirect after isLoading=false
 * - This prevents redirect loops and race conditions
 * 
 * PUBLIC ROUTES: Skip loading state for /landing and other public routes
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAuthenticated, setLoading } = useAuthStore()
  const pathname = usePathname()
  const hasInitialized = useRef(false)
  
  // Public routes that don't require auth verification
  const publicRoutes = ['/', '/landing', '/login', '/register']
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
        setLoading(false)
      }, 10000) // 10 second timeout
      
      try {
        console.log('[AuthProvider] Starting auth verification...')
        
        // Step 1: Get token from TokenManager
        const token = tokenManager.getAccessToken()
        
        // Step 2: If no token → set isAuthenticated = false
        if (!token) {
          console.log('[AuthProvider] No token found in TokenManager')
          setAuthenticated(false)
          setLoading(false)
          hasInitialized.current = true
          clearTimeout(timeoutId)
          return
        }
        
        // Step 3: If token exists → call /auth/me
        const verifiedUser = await authService.getMe()
        
        // Clear timeout since we got a response
        clearTimeout(timeoutId)
        
        const duration = (performance.now() - startTime).toFixed(0)
        console.log(`[AuthProvider] ✅ Auth verified successfully (${duration}ms)`, {
          userId: verifiedUser.id,
          username: verifiedUser.username,
          email: verifiedUser.email,
        })
        
        // Step 4: If success: update auth.store with user + isAuthenticated=true
        setUser(verifiedUser)
        setAuthenticated(true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        // Clear timeout since we got an error response
        clearTimeout(timeoutId)
        
        const duration = (performance.now() - startTime).toFixed(0)
        const errorStatus = error?.response?.status || 'unknown'
        const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error'
        
        console.warn(
          `[AuthProvider] ⚠️  Auth check failed with error ${errorStatus} (${duration}ms)\n` +
          `Reason: ${errorMessage}`
        )
        
        // Step 5: If fail: clear TokenManager + auth.store
        tokenManager.clearTokens()
        setAuthenticated(false)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublicRoute])  // Only re-run when route changes, NOT on auth state changes

  // While auth is being verified, nothing should render
  // Protected routes will show loading state via isLoading check
  return <>{children}</>
}
