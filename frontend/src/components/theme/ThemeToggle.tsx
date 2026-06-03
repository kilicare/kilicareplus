'use client'

import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/stores/theme.store'

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-16 h-8 rounded-full border border-border transition-colors duration-300"
      style={{
        background:
          theme === 'dark'
            ? 'rgba(20, 20, 30, 0.6)'
            : 'rgba(240, 240, 245, 0.6)',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Sliding background */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            theme === 'dark'
              ? 'linear-gradient(135deg, rgba(80,80,100,0.3), rgba(100,100,120,0.2))'
              : 'linear-gradient(135deg, rgba(245,166,35,0.2), rgba(212,175,55,0.1))',
        }}
        animate={{
          x: theme === 'dark' ? 0 : 32,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />

      {/* Icons container */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5">
        {/* Moon icon (dark mode) */}
        <motion.div
          animate={{
            scale: theme === 'dark' ? 1 : 0.5,
            opacity: theme === 'dark' ? 1 : 0.3,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <Moon className="w-5 h-5 text-purple-400" strokeWidth={2} />
        </motion.div>

        {/* Sun icon (light mode) */}
        <motion.div
          animate={{
            scale: theme === 'light' ? 1 : 0.5,
            opacity: theme === 'light' ? 1 : 0.3,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <Sun className="w-5 h-5 text-gold" strokeWidth={2} />
        </motion.div>
      </div>
    </motion.button>
  )
}
