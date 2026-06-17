'use client'

import { useEffect, useState } from 'react'
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
  const { isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()

  // ONLY ONE UI STATE (collapse only)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log(
        '[MainLayout] Auth complete. User not authenticated → redirecting'
      )
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <p className="text-sm text-text-muted">
            Verifying authentication...
          </p>
        </div>
      </div>
    )
  }

  // NOT AUTHENTICATED STATE
  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <p className="text-sm text-text-muted">
            Redirecting to login...
          </p>
        </div>
      </div>
    )
  }

  // MAIN APP LAYOUT
  return (
    <div className="flex h-dvh overflow-hidden bg-bg-base">
      {/* DESKTOP SIDEBAR (COLLAPSIBLE ONLY) */}
      <Sidebar
        className="hidden lg:flex flex-shrink-0"
        collapsed={sidebarCollapsed}
        toggleCollapsed={() =>
          setSidebarCollapsed((prev) => !prev)
        }
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <OfflineIndicator />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <BottomNav className="lg:hidden" />
    </div>
  )
}