'use client'
import { useEffect } from 'react'

interface Props {
  trigger?: boolean
  origin?: { x: number; y: number }
}

export function ConfettiBlast({
  trigger = true,
  origin = { x: 0.5, y: 0.5 },
}: Props) {
  useEffect(() => {
    if (!trigger) return
    import('canvas-confetti').then((mod) => {
      const confetti = mod.default
      confetti({
        particleCount: 80,
        spread: 70,
        origin,
        colors: ['#F5A623', '#FFD700', '#FFFFFF', '#10B981', '#3B82F6'],
        disableForReducedMotion: true,
      })
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 90,
          origin: { x: origin.x - 0.1, y: origin.y },
          colors: ['#F5A623', '#FFD700', '#E8892A'],
          disableForReducedMotion: true,
        })
      }, 150)
    })
  }, [trigger, origin])
  return null
}