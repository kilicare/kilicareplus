'use client'

import { useSession } from '@/hooks/useSession'

interface SessionGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * SessionGuard - Universal guard pattern for all protected components
 * 
 * ENFORCEMENT RULES:
 * - Components MUST wrap protected content with SessionGuard
 * - SessionGuard enforces sessionValid check before rendering
 * - Provides consistent loading state across all protected components
 * 
 * Usage:
 * <SessionGuard>
 *   <YourProtectedComponent />
 * </SessionGuard>
 */
export function SessionGuard({ children, fallback }: SessionGuardProps) {
  const { sessionValid, isLoading } = useSession()
  
  // Show loading state while session is being validated
  // Splash screen handles boot UI, no spinner here
  if (isLoading) {
    return fallback || null
  }
  
  // Show fallback if session is not valid
  if (!sessionValid) {
    return fallback || null
  }
  
  // Render children only when session is valid
  return <>{children}</>
}
