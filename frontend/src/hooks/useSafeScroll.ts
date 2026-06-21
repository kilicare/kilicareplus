'use client'

import { useRef } from 'react'
import { useScroll } from 'framer-motion'
import { useIsMounted } from './useIsMounted'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSafeScroll(offset?: any) {
  const ref = useRef<HTMLElement>(null)
  const mounted = useIsMounted()

  const scroll = useScroll(
    mounted
      ? {
          target: ref,
          offset: offset || ['start start', 'end start'],
        }
      : undefined
  )

  return { ref, scroll }
}
