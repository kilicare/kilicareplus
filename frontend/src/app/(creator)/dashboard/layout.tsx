'use client'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { sessionValid, user } = useSession()
  const router = useRouter()

  useEffect(() => {
    // ENFORCEMENT RULE: Check sessionValid BEFORE role check
    // This ensures session is validated before role-based decisions
    if (sessionValid && user && !['LOCAL_GUIDE', 'ADMIN'].includes(user.role)) {
      router.push('/feed')
    }
  }, [sessionValid, user, router])

  // ENFORCEMENT RULE: Return null if session is not valid
  // This prevents rendering without proper session validation
  if (!sessionValid) {
    return null
  }

  return <>{children}</>
}