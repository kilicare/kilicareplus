'use client'

import { motion } from 'framer-motion'
import { ChevronRight, Zap } from 'lucide-react'
import { useMoreGridStore } from '@/stores/moreGrid.store'
import { cn } from '@/lib/utils'

export function MoreFeaturesButton() {
  const openMoreGrid = useMoreGridStore((s) => s.openMoreGrid)

  return (
    <motion.button
      onClick={openMoreGrid}
      whileTap={{ scale: 0.97 }}
      whileHover={{ x: 4 }}
      className="w-full"
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl p-4',
          'border border-gold/30 bg-gold/5',
          'transition-all duration-300',
          'hover:bg-gold/10 hover:border-gold/40'
        )}
      >
        {/* CONTENT */}
        <div className="relative z-10 flex items-center justify-between">

          {/* LEFT SIDE */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gold/15">
              <Zap size={18} className="text-gold" strokeWidth={2.2} />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                More Features
              </p>
              <p className="text-[11px] text-text-muted">
                Tools, settings & shortcuts
              </p>
            </div>
          </div>

          {/* RIGHT ICON */}
          <ChevronRight
            size={18}
            className="text-gold/70 group-hover:text-gold transition"
          />
        </div>
      </div>
    </motion.button>
  )
}