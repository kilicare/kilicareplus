'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import { useUIStore } from '@/stores/ui.store'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { MoreGridProvider } from '@/components/navigation/MoreGridProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

function OfflineWatcher() {
  const { setOffline } = useUIStore()
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [setOffline])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 2,
            gcTime: 1000 * 60 * 10,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: 0 },
        },
      })
  )

  return (
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <MoreGridProvider>
            <OfflineWatcher />
            {children}
          </MoreGridProvider>
          <Toaster
            position="top-center"
            duration={3000}
            toastOptions={{
              style: {
                background: '#1A1A24',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#F0F0F5',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                borderRadius: '14px',
              },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}