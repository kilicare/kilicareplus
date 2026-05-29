'use client'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type H = '30' | '40' | '50' | '60' | '75' | '90' | 'full' | 'auto'

const HM: Record<H, string> = {
  '30': '30dvh', '40': '40dvh', '50': '50dvh',
  '60': '60dvh', '75': '75dvh', '90': '90dvh',
  'full': '100dvh', 'auto': 'auto',
}

interface Props {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  height?: H
  hideHandle?: boolean
  className?: string
}

export function KiliBottomSheet({
  isOpen, onClose, title, subtitle, children,
  height = '60', hideHandle = false, className,
}: Props) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'flex flex-col rounded-t-3xl overflow-hidden',
              'max-w-2xl mx-auto',
              className
            )}
            style={{
              height: HM[height],
              maxHeight: '95dvh',
              background: '#1A1A24',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.8 }}
          >
            {/* Gold line */}
            <div
              className="absolute top-0 left-0 right-0 h-px opacity-40"
              style={{ background: 'linear-gradient(90deg, transparent, #F5A623, transparent)' }}
            />
            {!hideHandle && (
              <div className="flex-shrink-0 flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
            )}
            {title && (
              <>
                <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-text-primary">{title}</h2>
                    {subtitle && (
                      <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
                    )}
                  </div>
                  <motion.button
                    onClick={onClose}
                    whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/8 transition-colors"
                  >
                    <X size={18} />
                  </motion.button>
                </div>
                <div className="flex-shrink-0 h-px mx-5 bg-border-subtle" />
              </>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}