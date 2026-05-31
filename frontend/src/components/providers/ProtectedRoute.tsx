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
    // Only check auth status after initial loading is complete
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading state while auth check is in progress
  if (isLoading) {
    return fallback || <LoadingSpinner />
  }

  // Not authenticated - will redirect, but show fallback until redirect completes
  if (!isAuthenticated) {
    return fallback || <LoadingSpinner />
  }

  // Authenticated - render protected content
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
