/**
 * ValidationConfidenceDisplay Component
 * 
 * Shows validation confidence scores for team names
 * Visual indicators for VALID, AMBIGUOUS, and NOT_FOUND statuses
 */

import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react'

export interface ValidationStatus {
  status: 'VALID' | 'AMBIGUOUS' | 'NOT_FOUND'
  confidence: number
  input: string
  canonical: string
}

interface ValidationConfidenceDisplayProps {
  validation: ValidationStatus | null
  position: 'home' | 'away'
  showLabel?: boolean
}

export function ValidationConfidenceDisplay({
  validation,
  position,
  showLabel = true,
}: ValidationConfidenceDisplayProps) {
  if (!validation) return null

  const isHome = position === 'home'
  const borderColor =
    validation.status === 'VALID'
      ? 'border-green-500/50'
      : validation.status === 'AMBIGUOUS'
        ? 'border-amber-500/50'
        : 'border-red-500/50'

  const bgColor =
    validation.status === 'VALID'
      ? 'bg-green-500/10'
      : validation.status === 'AMBIGUOUS'
        ? 'bg-amber-500/10'
        : 'bg-red-500/10'

  const textColor =
    validation.status === 'VALID'
      ? 'text-green-400'
      : validation.status === 'AMBIGUOUS'
        ? 'text-amber-400'
        : 'text-red-400'

  const Icon =
    validation.status === 'VALID'
      ? CheckCircle2
      : validation.status === 'AMBIGUOUS'
        ? HelpCircle
        : AlertCircle

  const statusLabel =
    validation.status === 'VALID'
      ? 'Valid'
      : validation.status === 'AMBIGUOUS'
        ? 'Ambiguous'
        : 'Not Found'

  const confidencePercentage = Math.round(validation.confidence)

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className={`mt-2 p-3 rounded-lg border-2 ${borderColor} ${bgColor}`}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} className={`${textColor} flex-shrink-0 mt-0.5`} />

        <div className="flex-1 min-w-0">
          {showLabel && (
            <div className={`text-xs font-bold ${textColor} uppercase tracking-wider mb-1`}>
              {statusLabel} • {confidencePercentage}% confidence
            </div>
          )}

          {/* Show corrected name if different from input */}
          {validation.status === 'VALID' && validation.canonical !== validation.input && (
            <div className="text-xs text-green-300 mb-1">
              Corrected: <span className="font-semibold">{validation.canonical}</span>
            </div>
          )}

          {/* Ambiguous suggestion */}
          {validation.status === 'AMBIGUOUS' && validation.canonical && (
            <div className="text-xs text-amber-300 mb-1">
              Did you mean: <span className="font-semibold">{validation.canonical}</span>?
            </div>
          )}

          {/* Not found message */}
          {validation.status === 'NOT_FOUND' && (
            <div className="text-xs text-red-300">
              Team "{validation.input}" not found. Check the spelling.
            </div>
          )}

          {/* Confidence bar */}
          <div className="mt-2">
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidencePercentage}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`h-full ${
                  validation.status === 'VALID'
                    ? 'bg-green-500'
                    : validation.status === 'AMBIGUOUS'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
