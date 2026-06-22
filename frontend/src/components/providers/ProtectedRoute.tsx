'use client'

import { ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * ProtectedRoute - Wraps routes that require authentication
 * 
 * Features:
 * - Waits for initial auth check to complete (loading state)
 * - Shows fallback/spinner while auth is being verified
 * - Redirects to login if user is not authenticated
 * - No race conditions - always waits for /auth/me/ response
 * 
 * Usage:
 * <ProtectedRoute>
 *   <YourProtectedComponent />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()

  useEffect(() => {
    console.log('[ProtectedRoute] 🚀 PROTECTED ROUTE MOUNT')
    console.log('[ProtectedRoute] STEP 0: Auth state check', { isAuthenticated, isLoading })
    
    // Only check auth status after initial loading is complete
    if (!isLoading && !isAuthenticated) {
      console.log('[ProtectedRoute] 🚨 REDIRECT TRIGGERED - !isLoading && !isAuthenticated')
      console.log('[ProtectedRoute] Redirecting to /login')
      router.push('/login')
    } else {
      console.log('[ProtectedRoute] No redirect - conditions:', {
        isLoading,
        isAuthenticated,
        reason: isLoading ? 'Still loading' : 'User is authenticated'
      })
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading state while auth check is in progress
  if (isLoading) {
    console.log('[ProtectedRoute] Showing loading spinner (isLoading=true)')
    return fallback || <LoadingSpinner />
  }

  // Not authenticated - will redirect, but show fallback until redirect completes
  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Showing loading spinner (!isAuthenticated=true)')
    return fallback || <LoadingSpinner />
  }

  // Authenticated - render protected content
  console.log('[ProtectedRoute] Rendering protected content (authenticated=true)')
  return <>{children}</>
}

/**
 * Default loading spinner
 */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Verifying authentication...</p>
      </div>
    </div>
  )
}
