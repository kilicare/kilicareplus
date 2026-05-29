'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { BottomNav } from '@/components/layout/BottomNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { OfflineIndicator } from '@/components/ui/OfflineIndicator'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg-base">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-bg-base">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex flex-shrink-0" />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <OfflineIndicator />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav className="lg:hidden" />
    </div>
  )
}