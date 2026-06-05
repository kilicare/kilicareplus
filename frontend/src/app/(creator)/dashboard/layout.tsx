'use client'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    // MINIMAL ROLE GUARD: UI-level protection only
    // Redirect to /feed if user doesn't have required role
    // This is a UI guard, not a navigation redirect
    if (user && !['LOCAL_GUIDE', 'ADMIN'].includes(user.role)) {
      router.push('/feed')
    }
  }, [user, router])

  return <>{children}</>
}