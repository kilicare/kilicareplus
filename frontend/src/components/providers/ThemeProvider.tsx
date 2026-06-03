'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/stores/theme.store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initializeTheme = useThemeStore((state) => state.initializeTheme)
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    // Initialize theme from localStorage on mount
    initializeTheme()
  }, [initializeTheme])

  useEffect(() => {
    // Apply theme to document whenever it changes
    if (typeof window !== 'undefined') {
      const html = document.documentElement
      html.setAttribute('data-theme', theme)
      html.style.colorScheme = theme
      
      // Add smooth transition
      html.style.transition = 'background-color 0.3s ease, color 0.3s ease'
    }
  }, [theme])

  return <>{children}</>
}
