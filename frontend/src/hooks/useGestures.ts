'use client'
import { useRef, useState } from 'react'
import { useMoreGridStore } from '@/stores/moreGrid.store'

/**
 * Hook for detecting long press gestures
 * Useful for opening MoreGrid on long press of bottom nav items
 * 
 * Usage:
 * const { onPointerDown, onPointerUp } = useLongPress(() => {
 *   useMoreGridStore.getState().openMoreGrid()
 * })
 */
interface UseLongPressOptions {
  duration?: number
  onLongPress: () => void
}

export function useLongPress({
  duration = 500,
  onLongPress,
}: UseLongPressOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)

  const handlePointerDown = () => {
    startPosRef.current = null
    timeoutRef.current = setTimeout(() => {
      onLongPress()
    }, duration)
  }

  const handlePointerUp = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    // If movement is too large, cancel long press
    if (!startPosRef.current) {
      startPosRef.current = { x: e.clientX, y: e.clientY }
      return
    }

    const dx = Math.abs(e.clientX - startPosRef.current.x)
    const dy = Math.abs(e.clientY - startPosRef.current.y)
    const threshold = 10

    if (dx > threshold || dy > threshold) {
      handlePointerUp()
    }
  }

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerMove: handlePointerMove,
  }
}

/**
 * Hook for detecting swipe up gestures
 * Useful for opening MoreGrid when user swipes up on the bottom nav area
 */
interface UseSwipeUpOptions {
  threshold?: number
  onSwipeUp: () => void
}

export function useSwipeUp({ threshold = 50, onSwipeUp }: UseSwipeUpOptions) {
  const startYRef = useRef<number>(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endY = e.changedTouches[0].clientY
    const diffY = startYRef.current - endY

    if (diffY > threshold) {
      onSwipeUp()
    }
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  }
}
