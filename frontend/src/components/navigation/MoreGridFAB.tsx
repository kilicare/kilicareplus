'use client'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { useMoreGridStore } from '@/stores/moreGrid.store'
import { cn } from '@/lib/utils'

/**
 * Floating Action Button for More Grid
 * Mobile-only (hidden on desktop)
 * 
 * Positioned in bottom-right area above bottom nav
 * 
 * Usage:
 * <MoreGridFAB />
 */
export function MoreGridFAB() {
  const { openMoreGrid } = useMoreGridStore()

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      onClick={openMoreGrid}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
      className={cn(
        'fixed bottom-24 right-6 z-20 lg:hidden',
        'rounded-full p-3.5 shadow-lg',
        'flex items-center justify-center',
        'transition-all duration-200'
      )}
      style={{
        background: 'linear-gradient(135deg, #D4AF37, #F5A623)',
        boxShadow: '0 8px 24px rgba(212, 175, 55, 0.3)',
      }}
      title="More Features"
    >
      <Zap size={24} className="text-black" strokeWidth={2} />
    </motion.button>
  )
}
