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
  const { sessionValid, isLoading } = useAuthStore()

  // ONLY ONE UI STATE (collapse only)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // LOADING STATE - Splash screen handles boot UI, no spinner here
  if (isLoading) {
    return null
  }

  // NOT AUTHENTICATED STATE - Redirect to login
  // ProtectedRoute handles the actual redirect - this is a fallback
  if (!sessionValid) {
    return null // Let ProtectedRoute handle redirect
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