import { useEffect, useRef, useCallback, useState } from 'react'

interface UseAudioOptions {
  /** URL of the audio file to play */
  audioUrl: string | null | undefined
  /** Whether to loop the audio */
  loop?: boolean
  /** Volume level (0-1) */
  volume?: number
  /** Called when audio starts playing */
  onPlay?: () => void
  /** Called when audio is paused */
  onPause?: () => void
  /** Called when audio ends */
  onEnded?: () => void
  /** Called on error */
  onError?: (error: Error) => void
}

interface UseAudioReturn {
  /** Start playing the audio (bypasses autoplay restrictions after user interaction) */
  play: () => Promise<void>
  /** Stop playing the audio */
  stop: () => void
  /** Pause the audio */
  pause: () => void
  /** Resume the audio */
  resume: () => void
  /** Whether audio is currently playing */
  isPlaying: boolean
  /** Preload audio into memory */
  preload: () => void
}

/**
 * Hook to manage audio playback for Moments with proper lifecycle
 * Handles:
 * - Audio creation and cleanup
 * - Preloading for performance
 * - Autoplay restrictions (only plays after user interaction)
 * - Proper event listener cleanup
 */
export const useAudio = (options: UseAudioOptions): UseAudioReturn => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const { audioUrl, loop = true, volume = 1, onPlay, onPause, onEnded, onError } = options

  // Create audio element
  useEffect(() => {
    if (!audioUrl) {
      return
    }

    try {
      const audio = new Audio(audioUrl)
      audio.loop = loop
      audio.volume = Math.max(0, Math.min(1, volume))

      // Event handlers
      const handlePlay = () => {
        setIsPlaying(true)
        onPlay?.()
      }

      const handlePause = () => {
        setIsPlaying(false)
        onPause?.()
      }

      const handleEnded = () => {
        setIsPlaying(false)
        onEnded?.()
      }

      const handleError = () => {
        setIsPlaying(false)
        const error = new Error(`Failed to load audio: ${audioUrl}`)
        onError?.(error)
      }

      audio.addEventListener('play', handlePlay)
      audio.addEventListener('pause', handlePause)
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('error', handleError)

      audioRef.current = audio

      // Cleanup
      return () => {
        audio.removeEventListener('play', handlePlay)
        audio.removeEventListener('pause', handlePause)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('error', handleError)
        audio.pause()
        audio.src = ''
      }
    } catch (error) {
      onError?.(error as Error)
    }
  }, [audioUrl, loop, volume, onPlay, onPause, onEnded, onError])

  // Preload audio
  const preload = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.load()
    }
  }, [])

  // Play audio (respects autoplay restrictions)
  const play = useCallback(async () => {
    if (!audioRef.current) return
    try {
      // Try to play - will fail if no user interaction yet
      await audioRef.current.play()
    } catch (error) {
      // Autoplay restriction - will need user interaction
      // Don't error, just silently fail
      if (error instanceof Error && !error.message.includes('NotAllowedError')) {
        onError?.(error)
      }
    }
  }, [onError])

  // Stop audio
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }, [])

  // Pause audio
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  // Resume audio
  const resume = useCallback(() => {
    if (audioRef.current) {
      play()
    }
  }, [play])

  return {
    play,
    stop,
    pause,
    resume,
    isPlaying,
    preload,
  }
}
