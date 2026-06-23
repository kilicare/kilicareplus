'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AuthSplashScreenProps {
  visible: boolean
}

/**
 * Premium Auth Splash Screen
 * 
 * Displays a full-screen branded splash during authentication boot.
 * Uses the app logo with subtle gold glow animation.
 * No text, no spinners - just premium brand experience.
 * 
 * Architecture:
 * - Visual layer only - does NOT block auth logic
 * - SessionManager.rehydrate() runs in background
 * - Fades out when auth state is resolved
 */
export function AuthSplashScreen({ visible }: AuthSplashScreenProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-base"
        >
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-bg-base via-bg-surface to-bg-base opacity-50" />
          
          {/* Logo container with premium animation */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ 
              scale: [0.95, 1.05, 1],
              opacity: [0, 1, 1]
            }}
            transition={{ 
              duration: 1.5,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: 0.5
            }}
            className="relative z-10"
          >
            {/* Gold glow effect */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(245,166,35,0.3)',
                  '0 0 40px rgba(245,166,35,0.5)',
                  '0 0 20px rgba(245,166,35,0.3)',
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="rounded-full"
            >
              {/* Logo */}
              <motion.img
                src="/logo.png"
                alt="KiliCare"
                className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain rounded-full"
                animate={{
                  rotate: [0, 2, -2, 0]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            </motion.div>
          </motion.div>

          {/* Bouncing dots loader (below logo) */}
          <motion.div
            className="absolute bottom-32 flex gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full bg-gold"
                animate={{
                  y: [0, -12, 0],
                  scale: [1, 1.2, 1],
                  opacity: [0.6, 1, 0.6]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
