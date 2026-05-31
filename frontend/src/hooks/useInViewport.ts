'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface UseInViewportOptions {
  /** Callback when element enters viewport */
  onEnter?: () => void
  /** Callback when element leaves viewport */
  onLeave?: () => void
  /** Margin around viewport (default: '0px') */
  rootMargin?: string
  /** Intersection threshold */
  threshold?: number | number[]
}

/**
 * Hook to detect when an element enters/leaves viewport using Intersection Observer
 */
export const useInViewport = (options: UseInViewportOptions = {}) => {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const { onEnter, onLeave, rootMargin = '0px', threshold = 0.5 } = options

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            onEnter?.()
          } else {
            setIsVisible(false)
            onLeave?.()
          }
        })
      },
      { rootMargin, threshold }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [onEnter, onLeave, rootMargin, threshold])

  return { elementRef, isVisible }
}
