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
    if (user && !['LOCAL_GUIDE', 'ADMIN'].includes(user.role)) {
      router.push('/feed')
    }
  }, [user, router])

  return <>{children}</>
}