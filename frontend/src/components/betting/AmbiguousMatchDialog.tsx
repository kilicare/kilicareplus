/**
 * AmbiguousMatchDialog Component
 * 
 * Dialog shown when team name validation returns AMBIGUOUS status
 * Allows user to confirm the suggested team or try another name
 */

import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import { KiliButton } from '@/components/ui/KiliButton'

interface AmbiguousMatchDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (suggestedName: string) => void
  teamInput: string
  suggestedName: string
  confidence: number
  position: 'home' | 'away'
}

export function AmbiguousMatchDialog({
  isOpen,
  onClose,
  onConfirm,
  teamInput,
  suggestedName,
  confidence,
  position,
}: AmbiguousMatchDialogProps) {
  const positionLabel = position === 'home' ? 'Home' : 'Away'
  const positionEmoji = position === 'home' ? '🏠' : '✈️'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-500/30 p-4 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertCircle size={24} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-bold text-amber-400">
                      Ambiguous Team Name
                    </h3>
                    <p className="text-sm text-white/60 mt-1">
                      {positionEmoji} {positionLabel} Team
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Input and suggestion */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-2">
                      You entered
                    </p>
                    <div className="p-3 bg-slate-800/50 border border-white/20 rounded-lg">
                      <p className="text-white font-semibold">"{teamInput}"</p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="text-center">
                    <div className="text-white/40 text-xl">↓</div>
                  </div>

                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-2">
                      Did you mean?
                    </p>
                    <div className="p-3 bg-amber-500/10 border-2 border-amber-500/50 rounded-lg">
                      <p className="text-amber-300 font-semibold text-lg mb-1">
                        "{suggestedName}"
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${confidence}%` }}
                            transition={{ duration: 0.6 }}
                            className="h-full bg-amber-500"
                          />
                        </div>
                        <p className="text-xs text-amber-300 font-semibold whitespace-nowrap">
                          {Math.round(confidence)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-sm text-blue-200">
                    We found a possible match. Would you like to use the suggestion or continue with your original input?
                  </p>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <KiliButton
                    variant="secondary"
                    fullWidth
                    onClick={onClose}
                    className="text-sm"
                  >
                    Keep original
                  </KiliButton>
                  <KiliButton
                    fullWidth
                    onClick={() => {
                      onConfirm(suggestedName)
                      onClose()
                    }}
                    className="text-sm"
                  >
                    Use suggestion
                  </KiliButton>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
