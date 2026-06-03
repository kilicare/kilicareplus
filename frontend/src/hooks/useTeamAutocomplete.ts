/**
 * useTeamAutocomplete Hook
 * 
 * Handles team name autocomplete with fuzzy matching
 * Returns suggestions based on user input
 */

import { useState, useCallback, useEffect } from 'react'
import { getTeamSuggestions } from '@/services/predictions.service'

export interface AutocompleteSuggestion {
  name: string
  confidence: number
  status: 'VALID' | 'AMBIGUOUS' | 'NOT_FOUND'
  isExactMatch: boolean
}

interface UseTeamAutocompleteProps {
  league: string
  debounceMs?: number
}

export function useTeamAutocomplete({ league, debounceMs = 300 }: UseTeamAutocompleteProps) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Debounced fetch
  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      
      // TODO: Call backend to get team suggestions
      // For now, this is a placeholder
      // In production, implement actual fuzzy matching API call
      
      setIsLoading(false)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [input, league, debounceMs])

  const selectSuggestion = useCallback((suggestion: AutocompleteSuggestion) => {
    setInput(suggestion.name)
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }, [showSuggestions, suggestions, selectedIndex, selectSuggestion])

  return {
    input,
    setInput,
    suggestions,
    isLoading,
    showSuggestions,
    setShowSuggestions,
    selectedIndex,
    selectSuggestion,
    handleKeyDown,
  }
}
