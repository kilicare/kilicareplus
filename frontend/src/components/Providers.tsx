'use client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import { OfflineIndicator } from './ui/OfflineIndicator'
import { PWAInstallBanner } from './ui/PWAInstallBanner'
import { ErrorBoundary } from './ui/ErrorState'
import { NetworkError } from './ui/NetworkError'
import { useUIStore } from '@/stores/ui.store'
import { useAuthStore } from '@/stores/auth.store'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { MoreGridProvider } from '@/components/navigation/MoreGridProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AuthSplashScreen } from '@/components/splash/AuthSplashScreen'
import { queryClient } from '@/lib/queryClient'

function OfflineWatcher() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const on  = () => setIsOffline(false)
    const off = () => setIsOffline(true)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return null
}

function NetworkErrorWatcher() {
  const [showNetworkError, setShowNetworkError] = useState(false)

  useEffect(() => {
    // Listen for network errors from axios interceptor
    const handleNetworkError = (event: CustomEvent) => {
      setShowNetworkError(true)
    }

    // Hide banner when network comes back
    const handleOnline = () => {
      setShowNetworkError(false)
    }

    window.addEventListener('network-error' as any, handleNetworkError as any)
    window.addEventListener('online', handleOnline)
    
    return () => {
      window.removeEventListener('network-error' as any, handleNetworkError as any)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return <NetworkError visible={showNetworkError} />
}

function ServiceWorkerRegistrar() {
  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV !== 'production'

    if (isDevelopment) {
      // DEVELOPMENT: Force unregister any existing service workers and clear caches
      if ('serviceWorker' in navigator) {
        console.log('[SW] Development mode detected - unregistering service workers...')
        
        // Unregister all existing service workers
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            console.log('[SW] Unregistering:', registration.scope)
            registration.unregister().then(() => {
              console.log('[SW] ✅ Unregistered successfully')
            }).catch((err) => {
              console.error('[SW] ❌ Unregister failed:', err)
            })
          })
        }).catch((err) => {
          console.error('[SW] ❌ Failed to get registrations:', err)
        })

        // Clear all caches
        if ('caches' in window) {
          caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
              console.log('[SW] Clearing cache:', cacheName)
              caches.delete(cacheName).then(() => {
                console.log('[SW] ✅ Cache cleared:', cacheName)
              }).catch((err) => {
                console.error('[SW] ❌ Cache clear failed:', cacheName, err)
              })
            })
          }).catch((err) => {
            console.error('[SW] ❌ Failed to get cache names:', err)
          })
        }
      }
    } else {
      // PRODUCTION: Register service worker normally
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
          console.error('[SW]', err)
        })
      }
    }
  }, [])
  return null
}

function SplashController({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuthStore()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    // Keep splash visible during initial auth boot
    // Fade out when isLoading becomes false (auth resolved)
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowSplash(false)
      }, 400) // Wait for fade out animation
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  return (
    <>
      <AuthSplashScreen visible={showSplash} />
      {children}
    </>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <OfflineWatcher />
          <NetworkErrorWatcher />
          <ServiceWorkerRegistrar />
          <OfflineIndicator />
          <PWAInstallBanner />
          <SplashController>
            <MoreGridProvider>
              {children}
            </MoreGridProvider>
          </SplashController>
        </AuthProvider>
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: '#1A1A24',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F0F0F5',
              borderRadius: '16px',
              fontFamily: 'system-ui',
            },
            duration: 3000,
          }}
        />
      </ErrorBoundary>
    </QueryClientProvider>
  )
}