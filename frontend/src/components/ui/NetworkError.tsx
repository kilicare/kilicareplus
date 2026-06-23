'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, RefreshCw } from 'lucide-react'

interface NetworkErrorProps {
  visible: boolean
  onRetry?: () => void
}

/**
 * NetworkError UI - Global network error display
 * 
 * Shows when there's no network connection or network errors occur
 * Similar to login page error handling but global
 */
export function NetworkError({ visible, onRetry }: NetworkErrorProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-[9998] bg-red-500/10 backdrop-blur-md border-b border-red-500/30"
        >
          <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <WifiOff size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-300">
                  Hakuna mtandao / No network connection
                </p>
                <p className="text-xs text-red-400/70">
                  Tafuta mtandao uunganisho ili kuendelea
                </p>
              </div>
            </div>
            
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm transition-colors"
              >
                <RefreshCw size={14} />
                <span>Jaribu tena</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
