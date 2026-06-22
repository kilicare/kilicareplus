'use client'
import { useState, useRef, useCallback } from 'react'

/**
 * Hook to manage audio and video playback across feed moments
 * Ensures only one audio/video plays at a time
 */
export const useFeedAudio = () => {
  const [activeMomentId, setActiveMomentId] = useState<number | null>(null)
  const audioInstancesRef = useRef<Map<number, HTMLAudioElement>>(new Map())
  const videoInstancesRef = useRef<Map<number, HTMLVideoElement>>(new Map())

  // Stop any currently playing audio
  const stopAll = useCallback(() => {
    audioInstancesRef.current.forEach((audio) => {
      audio.pause()
      audio.currentTime = 0
    })
    videoInstancesRef.current.forEach((video) => {
      video.pause()
      video.currentTime = 0
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

  // Register video instance for a moment
  const registerVideo = useCallback(
    (momentId: number, videoElement: HTMLVideoElement | null) => {
      if (videoElement) {
        videoInstancesRef.current.set(momentId, videoElement)
      } else {
        videoInstancesRef.current.delete(momentId)
      }
    },
    []
  )

  // Play audio for a specific moment (stops others)
  const playMoment = useCallback(
    async (momentId: number) => {
      // Stop others
      if (activeMomentId !== null && activeMomentId !== momentId) {
        const otherAudio = audioInstancesRef.current.get(activeMomentId)
        if (otherAudio) {
          otherAudio.pause()
          otherAudio.currentTime = 0
        }
        const otherVideo = videoInstancesRef.current.get(activeMomentId)
        if (otherVideo) {
          otherVideo.pause()
          otherVideo.currentTime = 0
        }
      }

      // Play this one's audio
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

      // Play this one's video (if not muted)
      const video = videoInstancesRef.current.get(momentId)
      if (video && !video.muted) {
        try {
          await video.play()
          setActiveMomentId(momentId)
        } catch {
          // Autoplay restriction
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
    const video = videoInstancesRef.current.get(momentId)
    if (video) {
      video.pause()
      video.currentTime = 0
    }
    if (activeMomentId === momentId) {
      setActiveMomentId(null)
    }
  }, [activeMomentId])

  return {
    activeMomentId,
    registerAudio,
    registerVideo,
    playMoment,
    stopMoment,
    stopAll,
  }
}
