'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { resolvePostLoginRoute } from '@/lib/routing'

export default function RootPage() {
  const router = useRouter()
  const { isAuthenticated, user, isLoading } = useAuthStore()

  useEffect(() => {
    // Safe redirect with error handling
    const safeRedirect = () => {
      try {
        if (!isAuthenticated) {
          router.push('/login')
        } else {
          // SINGLE FEED ARCHITECTURE: All users go to /feed
          // Role-based UI branching happens inside /feed page
          const route = resolvePostLoginRoute(user)
          router.push(route)
        }
      } catch (error) {
        console.error('[RootPage] Redirect error:', error)
        // Ultimate fallback: always go to login on error
        router.push('/login')
      }
    }

    if (isLoading) return

    safeRedirect()
  }, [isAuthenticated, user, isLoading, router])

  // Show loading state while checking auth
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-4xl font-black text-black mx-auto mb-4 animate-pulse"
             style={{ background: 'var(--gradient-gold)' }}>
          <img src="/icon-192.png" alt="Kilicare+" className="w-full h-full rounded-3xl object-cover" />
        </div>
        <p className="text-text-muted">Inapakia...</p>
      </div>
    </div>
  )
}