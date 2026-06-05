'use client'

import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * PageTransition Component
 * 
 * Simple pass-through wrapper for page transitions.
 * Can be enhanced with framer-motion animations in the future.
 */
export function PageTransition({ children }: PageTransitionProps) {
  return <>{children}</>
}
