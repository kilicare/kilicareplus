'use client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import { OfflineIndicator } from './ui/OfflineIndicator'
import { PWAInstallBanner } from './ui/PWAInstallBanner'
import { ErrorBoundary } from './ui/ErrorState'
import { useUIStore } from '@/stores/ui.store'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { MoreGridProvider } from '@/components/navigation/MoreGridProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
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

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('[SW]', err)
      })
    }
  }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <OfflineWatcher />
          <ServiceWorkerRegistrar />
          <OfflineIndicator />
          <PWAInstallBanner />
          <MoreGridProvider>
            {children}
          </MoreGridProvider>
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