'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  X,
  Calendar,
  MessageSquare,
  MapPin,
  AlertTriangle,
  CreditCard,
  BarChart3,
  Star,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MoreFeature {
  id: string
  label: string
  description?: string
  Icon: React.ComponentType<{ size?: number; className?: string }>
  href: string
  badge?: string
  disabled?: boolean
}

const FEATURES: MoreFeature[] = [
  {
    id: 'bookings',
    label: 'Bookings',
    description: 'Manage reservations',
    Icon: Calendar,
    href: '/bookings',
  },
  {
    id: 'map-tips',
    label: 'Map Tips',
    description: 'Location guides',
    Icon: MapPin,
    href: '/tips',
  },
  {
    id: 'payments',
    label: 'Payments',
    description: 'Payment history',
    Icon: CreditCard,
    href: '/payments',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Usage insights',
    Icon: BarChart3,
    href: '/analytics',
  },
  {
    id: 'showcase',
    label: 'Showcase',
    description: 'Portfolio view',
    Icon: Star,
    href: '/showcase',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'App preferences',
    Icon: Settings,
    href: '/settings',
  },
]

interface MoreGridProps {
  isOpen: boolean
  onClose: () => void
  features?: MoreFeature[]
}

export function MoreGrid({ isOpen, onClose, features = FEATURES }: MoreGridProps) {
  const router = useRouter()

  const handleFeatureClick = (href: string) => {
    router.push(href)
    onClose()
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
    exit: { opacity: 0 },
  }

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
    },
  }

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Sheet */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 40 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
            style={{
              background: 'rgba(10,10,15,0.98)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              maxHeight: '85vh',
              overflowY: 'auto',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Header */}
            <div className="sticky top-0 z-50 border-b border-white/5 px-6 py-4 flex items-center justify-between"
              style={{
                background: 'rgba(10,10,15,0.95)',
                backdropFilter: 'blur(24px)',
              }}
            >
              <div>
                <h2 className="text-lg font-bold text-white">More Features</h2>
                <p className="text-xs text-text-muted mt-0.5">Access all tools</p>
              </div>
              <motion.button
                onClick={onClose}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={20} className="text-text-muted" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 gap-4"
              >
                {features.map((feature) => (
                  <motion.button
                    key={feature.id}
                    variants={itemVariants}
                    onClick={() => handleFeatureClick(feature.href)}
                    disabled={feature.disabled}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'relative overflow-hidden rounded-2xl p-4 transition-all duration-300 group',
                      'border border-white/10 hover:border-gold/50',
                      'hover:bg-white/5 active:bg-white/10',
                      feature.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:border-white/10'
                    )}
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                    }}
                  >
                    {/* Gradient background on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.03))',
                        pointerEvents: 'none',
                      }}
                    />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                      <div className="relative">
                        <feature.Icon
                          size={28}
                          className={cn(
                            'transition-all duration-300 group-hover:text-gold',
                            feature.disabled ? 'text-text-disabled' : 'text-text-muted'
                          )}
                        />
                        {feature.badge && (
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-kili-red text-[9px] font-bold text-white rounded-full">
                            {feature.badge}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-white group-hover:text-gold transition-colors">
                          {feature.label}
                        </span>
                        {feature.description && (
                          <span className="text-[11px] text-text-disabled group-hover:text-text-muted transition-colors">
                            {feature.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>

              {/* Footer tip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8 p-4 rounded-xl border border-white/5 text-center"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <p className="text-[12px] text-text-muted">
                  💡 Tip: Swipe down to close this menu
                </p>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
