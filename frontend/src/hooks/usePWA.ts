'use client'
import { useState, useEffect, useCallback } from 'react'
import { offlineQueue, QueuedAction } from '@/lib/offlineQueue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

export function usePWA() {
  const [isOnline,       setIsOnline]       = useState(true)
  const [isInstallable,  setIsInstallable]  = useState(false)
  const [isInstalled,    setIsInstalled]    = useState(false)
  const [swRegistered,   setSwRegistered]   = useState(false)
  const [queueSize,      setQueueSize]      = useState(0)

  const updateQueueSize = useCallback(() => {
    setQueueSize(offlineQueue.getQueueSize())
  }, [])

  useEffect(() => {
    // Initialize offline queue
    offlineQueue.init()

    // Online/offline detection
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine)
    const handleOnline  = async () => {
      setIsOnline(true)
      await offlineQueue.process()
      updateQueueSize()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // PWA install prompt
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e as BeforeInstallPromptEvent
      setIsInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setIsInstallable(false)
      deferredPrompt = null
    })

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          setSwRegistered(true)
          console.log('[PWA] SW registered:', reg.scope)

          // Handle SW messages
          navigator.serviceWorker.addEventListener('message', (e) => {
            if (e.data?.type === 'SYNC_MESSAGES') {
              offlineQueue.process()
              updateQueueSize()
            }
          })
        })
        .catch((err) => console.error('[PWA] SW registration failed:', err))
    }

    // Update queue size periodically
    const interval = setInterval(updateQueueSize, 5000)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      clearInterval(interval)
    }
  }, [updateQueueSize])

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    setIsInstallable(false)
    return outcome === 'accepted'
  }, [])

  const queueAction = useCallback(async (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) => {
    await offlineQueue.enqueue(action)
    updateQueueSize()
  }, [updateQueueSize])

  const flushQueue = useCallback(async () => {
    await offlineQueue.process()
    updateQueueSize()
  }, [updateQueueSize])

  const clearQueue = useCallback(async () => {
    await offlineQueue.clear()
    updateQueueSize()
  }, [updateQueueSize])

  return {
    isOnline,
    isInstallable,
    isInstalled,
    swRegistered,
    installApp,
    queueAction,
    flushQueue,
    clearQueue,
    queueSize,
  }
}