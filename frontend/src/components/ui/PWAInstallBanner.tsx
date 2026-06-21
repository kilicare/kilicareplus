'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'
import { KiliButton } from './KiliButton'

export function PWAInstallBanner() {
  const { isInstallable, installApp } = usePWA()
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  if (!isInstallable || dismissed) return null

  const handleInstall = async () => {
    setInstalling(true)
    const accepted = await installApp()
    if (!accepted) {
      setInstalling(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-20 left-4 right-4 z-40 rounded-3xl p-4
          flex items-center gap-3"
        style={{
          background:
            'linear-gradient(135deg,rgba(26,26,36,0.98),rgba(10,10,15,0.98))',
          border: '1px solid rgba(245,166,35,0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(20px)',
        }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0, background: 'rgba(0,0,0,0)' }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      >
        {/* App icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center
            text-xl font-black text-black flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#F5A623,#E8892A)' }}
        >
          K
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-text-primary">
            Sakinisha Kilicare+
          </p>
          <p className="text-[11px] text-text-muted">
            Tumia bila browser — faster, offline ready
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <KiliButton
            size="xs"
            loading={installing}
            onClick={handleInstall}
            icon={<Download size={12} />}
          >
            Install
          </KiliButton>
          <motion.button
            onClick={() => setDismissed(true)}
            whileTap={{ scale: 0.9 }}
            className="w-7 h-7 rounded-xl flex items-center justify-center
              bg-white/8"
          >
            <X size={14} className="text-text-muted" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}