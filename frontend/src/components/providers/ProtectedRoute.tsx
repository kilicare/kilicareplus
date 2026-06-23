'use client'

import { ReactNode } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * ProtectedRoute - Wraps routes that require authentication
 * 
 * Phase 3: Uses sessionValid as the SINGLE source of truth for rendering
 * 
 * Features:
 * - Waits for sessionValid (backend-confirmed session with user)
 * - Shows fallback/spinner while auth is being validated
 * - Redirects to login if session validation fails
 * - No race conditions - always waits for /auth/me/ response
 * 
 * Usage:
 * <ProtectedRoute>
 *   <YourProtectedComponent />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const router = useRouter()
  const { sessionValid, isLoading } = useSession()

  useEffect(() => {
    console.log('[ProtectedRoute] 🚀 PROTECTED ROUTE MOUNT')
    console.log('[ProtectedRoute] STEP 0: Auth state check', { sessionValid, isLoading })
    
    // Only check auth status after initial loading is complete
    if (!isLoading && !sessionValid) {
      console.log('[ProtectedRoute] 🚨 REDIRECT TRIGGERED - !isLoading && !sessionValid')
      console.log('[ProtectedRoute] Redirecting to /login')
      router.push('/login')
    } else {
      console.log('[ProtectedRoute] No redirect - conditions:', {
        isLoading,
        sessionValid,
        reason: isLoading ? 'Still loading' : 'Session is ready'
      })
    }
  }, [sessionValid, isLoading, router])

  // Show loading state while auth check is in progress
  // Splash screen handles boot UI, no spinner here
  if (isLoading) {
    console.log('[ProtectedRoute] Loading (splash screen visible)')
    return fallback || null
  }

  // Not authenticated - will redirect, but show fallback until redirect completes
  if (!sessionValid) {
    console.log('[ProtectedRoute] Not authenticated, redirecting...')
    return fallback || null
  }

  // Authenticated - render protected content
  console.log('[ProtectedRoute] Rendering protected content (sessionValid=true)')
  return <>{children}</>
}
