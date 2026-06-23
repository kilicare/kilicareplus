'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { sessionManager } from '@/core/auth/SessionManager'

/**
 * AuthProvider - UI-ONLY Layer (SaaS-Grade Architecture)
 * 
 * CRITICAL: This component MUST NOT contain business logic
 * 
 * Responsibilities:
 * - Subscribe to SessionManager state
 * - Sync SessionManager state to useAuthStore
 * - Skip auth verification for public routes
 * - Trigger session rehydration on protected routes
 * 
 * AUTHENTICATION DECISIONS are made by SessionManager ONLY
 * 
 * TIMING IS CRITICAL:
 * - All routes check: if (isLoading) return <LoadingSpinner/>
 * - Only redirect after isLoading=false
 * - This prevents redirect loops and race conditions
 * 
 * PUBLIC ROUTES: Skip loading state for /landing and other public routes
 * 
 * Phase 3: Hard boot on protected routes - NO SKIPPING
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAuthenticated, setLoading, setSessionValid } = useAuthStore()
  const pathname = usePathname()
  
  // Public routes that don't require auth verification
  // CRITICAL FIX: '/' must only match exactly '/', not as prefix for all routes
  const publicRoutes = ['/landing', '/login', '/register']
  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route)) || pathname === '/'

  useEffect(() => {
    console.log('[AuthProvider] 🚀 AUTH PROVIDER MOUNT')
    console.log('[AuthProvider] STEP 0: Route check', { pathname, isPublicRoute })
    console.log('[AuthProvider] Current auth.store state:', useAuthStore.getState())
    
    // Skip auth verification for public routes
    if (isPublicRoute) {
      console.log('[AuthProvider] Public route detected, skipping auth verification')
      setLoading(false)
      setSessionValid(false)
      return
    }

    const initializeAuth = async () => {
      console.log('[AuthProvider] 🚀 Initializing auth via SessionManager.rehydrate()...')
      
      // Subscribe FIRST to ensure immediate state sync
      // SessionManager.subscribe() immediately calls listener with current state
      const unsubscribe = sessionManager.subscribe((sessionState) => {
        console.log('[AuthProvider] AUTH STATE CHANGE:', {
          isAuthenticated: sessionState.isAuthenticated,
          isLoading: sessionState.isLoading,
          hasUser: !!sessionState.user,
          sessionValid: sessionState.sessionValid,
        })
        
        // Sync SessionManager state to useAuthStore
        setAuthenticated(sessionState.isAuthenticated)
        setLoading(sessionState.isLoading)
        setUser(sessionState.user)
        
        // CRITICAL FIX: Use sessionValid from SessionManager instead of deriving it
        // sessionValid is only true when authenticated AND user is present
        // This prevents feed from triggering when user is null
        setSessionValid(sessionState.sessionValid)
      })
      
      // Phase 3: HARD BOOT - NO SKIPPING under ANY condition
      // Always call rehydrate() on protected routes
      console.log('[AuthProvider] Calling SessionManager.rehydrate() (HARD BOOT - NO SKIP)...')
      const rehydrated = await sessionManager.rehydrate()
      console.log('[AuthProvider] SessionManager.rehydrate() completed:', rehydrated)
      
      // Cleanup on unmount
      return () => {
        console.log('[AuthProvider] Unsubscribing from SessionManager')
        unsubscribe()
      }
    }

    // Run auth check on every mount (allows re-initialization after login)
    initializeAuth()
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublicRoute])

  // While auth is being verified, nothing should render
  // Protected routes will show loading state via isLoading check
  return <>{children}</>
}
