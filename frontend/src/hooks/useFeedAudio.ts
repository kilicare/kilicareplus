'use client'
import { useState, useRef, useCallback } from 'react'

/**
 * Hook to manage audio playback across feed moments
 * Ensures only one audio plays at a time
 */
export const useFeedAudio = () => {
  const [activeMomentId, setActiveMomentId] = useState<number | null>(null)
  const audioInstancesRef = useRef<Map<number, HTMLAudioElement>>(new Map())

  // Stop any currently playing audio
  const stopAll = useCallback(() => {
    audioInstancesRef.current.forEach((audio) => {
      audio.pause()
      audio.currentTime = 0
    })
    setActiveMomentId(null)
  }, [])

  // Register audio instance for a moment
  const registerAudio = useCallback(
    (momentId: number, audioElement: HTMLAudioElement | null) => {
      if (audioElement) {
        audioInstancesRef.current.set(momentId, audioElement)
      } else {
        audioInstancesRef.current.delete(momentId)
      }
    },
    []
  )

  // Play audio for a specific moment (stops others)
  const playMoment = useCallback(
    async (momentId: number) => {
      // Stop others
      if (activeMomentId !== null && activeMomentId !== momentId) {
        const other = audioInstancesRef.current.get(activeMomentId)
        if (other) {
          other.pause()
          other.currentTime = 0
        }
      }

      // Play this one
      const audio = audioInstancesRef.current.get(momentId)
      if (audio) {
        try {
          await audio.play()
          setActiveMomentId(momentId)
        } catch {
          // Autoplay restriction - will need user interaction
          // Don't error, just track it
        }
      }
    },
    [activeMomentId]
  )

  // Stop audio for a specific moment
  const stopMoment = useCallback((momentId: number) => {
    const audio = audioInstancesRef.current.get(momentId)
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    if (activeMomentId === momentId) {
      setActiveMomentId(null)
    }
  }, [activeMomentId])

  return {
    activeMomentId,
    registerAudio,
    playMoment,
    stopMoment,
    stopAll,
  }
}
