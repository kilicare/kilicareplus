/**
 * TeamAutocompleteDropdown Component
 * 
 * Displays autocomplete suggestions for team names
 * Shows confidence scores and allows selection
 */

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, HelpCircle } from 'lucide-react'

export interface TeamSuggestion {
  name: string
  confidence: number
  status: 'VALID' | 'AMBIGUOUS' | 'NOT_FOUND'
}

interface TeamAutocompleteDropdownProps {
  suggestions: TeamSuggestion[]
  isOpen: boolean
  isLoading: boolean
  selectedIndex: number
  onSelect: (suggestion: TeamSuggestion) => void
  position: 'home' | 'away'
}

export function TeamAutocompleteDropdown({
  suggestions,
  isOpen,
  isLoading,
  selectedIndex,
  onSelect,
  position,
}: TeamAutocompleteDropdownProps) {
  if (!isOpen || suggestions.length === 0) return null

  const positionColor = position === 'home' ? 'from-gold/20' : 'from-red-500/20'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-sm border-2 border-white/20 rounded-xl shadow-2xl overflow-hidden z-50"
      >
        {isLoading && (
          <div className="p-4 text-center text-white/60">
            <div className="inline-block animate-spin">⚙️</div>
            <p className="text-sm mt-2">Loading suggestions...</p>
          </div>
        )}

        {!isLoading && suggestions.length > 0 && (
          <div className="max-h-64 overflow-y-auto">
            {suggestions.map((suggestion, index) => {
              const isSelected = index === selectedIndex
              const isValid = suggestion.status === 'VALID'
              const isAmbiguous = suggestion.status === 'AMBIGUOUS'

              return (
                <motion.button
                  key={`${suggestion.name}-${index}`}
                  onClick={() => onSelect(suggestion)}
                  initial={false}
                  animate={{
                    backgroundColor: isSelected
                      ? 'rgba(255, 215, 0, 0.15)'
                      : 'transparent',
                  }}
                  className={`w-full px-4 py-3 text-left transition-colors border-b border-white/10 last:border-b-0 hover:bg-white/5 cursor-pointer flex items-center justify-between gap-3 group`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isValid && (
                        <CheckCircle2
                          size={16}
                          className="text-green-400 flex-shrink-0"
                        />
                      )}
                      {isAmbiguous && (
                        <HelpCircle
                          size={16}
                          className="text-amber-400 flex-shrink-0"
                        />
                      )}
                      <p className="text-white font-medium truncate">
                        {suggestion.name}
                      </p>
                    </div>
                    <p className="text-xs text-white/50">
                      {suggestion.status === 'VALID'
                        ? 'Exact match'
                        : 'Possible match'}
                    </p>
                  </div>

                  {/* Confidence score */}
                  <div
                    className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded transition-colors ${
                      isValid
                        ? 'bg-green-500/20 text-green-300'
                        : isAmbiguous
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {Math.round(suggestion.confidence)}%
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}

        {!isLoading && suggestions.length === 0 && (
          <div className="p-4 text-center text-white/60 text-sm">
            No matching teams found
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
