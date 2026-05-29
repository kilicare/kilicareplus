'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'

export function OfflineIndicator() {
  const { isOffline } = useUIStore()
  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2.5 text-sm font-semibold"
          style={{ background: 'rgba(255,45,45,0.95)', backdropFilter: 'blur(10px)' }}
          initial={{ y: -48 }}
          animate={{ y: 0 }}
          exit={{ y: -48 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <WifiOff size={15} className="text-white" />
          <span className="text-white">
            Hakuna mtandao — Offline mode
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}