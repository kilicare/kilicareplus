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
  TrendingUp,
  Shield,
  Users,
  Activity,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

// Color mapping for each feature
const FEATURE_COLORS: { [key: string]: { gradient: string; glow: string; text: string } } = {
  predictions: { gradient: 'from-blue-500/20 to-cyan-500/10', glow: 'rgba(59, 130, 246, 0.3)', text: 'text-blue-300' },
  bookings: { gradient: 'from-purple-500/20 to-pink-500/10', glow: 'rgba(168, 85, 247, 0.3)', text: 'text-purple-300' },
  'map-tips': { gradient: 'from-green-500/20 to-emerald-500/10', glow: 'rgba(34, 197, 94, 0.3)', text: 'text-green-300' },
  payments: { gradient: 'from-orange-500/20 to-red-500/10', glow: 'rgba(249, 115, 22, 0.3)', text: 'text-orange-300' },
  analytics: { gradient: 'from-red-500/20 to-pink-500/10', glow: 'rgba(239, 68, 68, 0.3)', text: 'text-red-300' },
  showcase: { gradient: 'from-yellow-500/20 to-amber-500/10', glow: 'rgba(234, 179, 8, 0.3)', text: 'text-yellow-300' },
  settings: { gradient: 'from-slate-500/20 to-gray-500/10', glow: 'rgba(100, 116, 139, 0.3)', text: 'text-slate-300' },
  // Admin-specific colors
  'admin-dashboard': { gradient: 'from-red-600/20 to-rose-500/10', glow: 'rgba(220, 38, 38, 0.3)', text: 'text-red-400' },
  'admin-users': { gradient: 'from-blue-600/20 to-indigo-500/10', glow: 'rgba(37, 99, 235, 0.3)', text: 'text-blue-400' },
  'admin-moderation': { gradient: 'from-purple-600/20 to-violet-500/10', glow: 'rgba(147, 51, 234, 0.3)', text: 'text-purple-400' },
  'admin-sos': { gradient: 'from-rose-600/20 to-pink-500/10', glow: 'rgba(225, 29, 72, 0.3)', text: 'text-rose-400' },
  'admin-b2b': { gradient: 'from-teal-600/20 to-cyan-500/10', glow: 'rgba(13, 148, 136, 0.3)', text: 'text-teal-400' },
}

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
    id: 'predictions',
    label: 'Predictions',
    description: 'Betting predictions',
    Icon: TrendingUp,
    href: '/predictions',
  },
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

// Admin-specific features
const ADMIN_FEATURES: MoreFeature[] = [
  {
    id: 'admin-dashboard',
    label: 'Admin Dashboard',
    description: 'System overview',
    Icon: Activity,
    href: '/admin/dashboard',
  },
  {
    id: 'admin-users',
    label: 'User Management',
    description: 'Manage users',
    Icon: Users,
    href: '/admin/users',
  },
  {
    id: 'admin-moderation',
    label: 'Moderation',
    description: 'Content moderation',
    Icon: Shield,
    href: '/admin/moderation',
  },
  {
    id: 'admin-sos',
    label: 'SOS Monitor',
    description: 'Emergency alerts',
    Icon: AlertTriangle,
    href: '/admin/sos-monitor',
  },
  {
    id: 'admin-b2b',
    label: 'B2B Portal',
    description: 'Business partners',
    Icon: Building2,
    href: '/admin/b2b',
  },
]

interface MoreGridProps {
  isOpen: boolean
  onClose: () => void
  features?: MoreFeature[]
}

export function MoreGrid({ isOpen, onClose, features = FEATURES }: MoreGridProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  // Combine features with admin features if user is admin
  const allFeatures = isAdmin ? [...FEATURES, ...ADMIN_FEATURES] : FEATURES

  const handleFeatureClick = (href: string) => {
    router.push(href)
    onClose()
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.1,
      },
    },
    exit: { opacity: 0 },
  }

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 350, damping: 35 },
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
                {allFeatures.map((feature) => {
                  const colors = FEATURE_COLORS[feature.id] || FEATURE_COLORS.settings
                  return (
                    <motion.button
                      key={feature.id}
                      variants={itemVariants}
                      onClick={() => handleFeatureClick(feature.href)}
                      disabled={feature.disabled}
                      whileHover={{ 
                        y: -8,
                        rotateX: -8,
                        rotateY: 2,
                      }}
                      whileTap={{ scale: 0.92 }}
                      className={cn(
                        'relative overflow-hidden rounded-2xl p-5 transition-all duration-300 group',
                        'border border-white/10 hover:border-white/30',
                        feature.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                      style={{
                        background: `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))`,
                        perspective: '1000px',
                      }}
                    >
                      {/* Glow background on hover */}
                      <motion.div
                        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl`}
                        style={{
                          background: `radial-gradient(circle, ${colors.glow}, transparent)`,
                          pointerEvents: 'none',
                        }}
                      />

                      {/* Gradient overlay */}
                      <div
                        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`}
                        style={{
                          background: `linear-gradient(135deg, ${colors.glow}, transparent)`,
                          pointerEvents: 'none',
                        }}
                      />

                      {/* Top accent line */}
                      <div
                        className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${colors.glow}, transparent)`,
                        }}
                      />

                      {/* Content */}
                      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                        {/* Icon container */}
                        <motion.div
                          whileHover={{ scale: 1.15, rotate: 5 }}
                          className="p-3 rounded-xl transition-all duration-300"
                          style={{
                            background: `linear-gradient(135deg, ${colors.glow}, transparent)`,
                            border: `1px solid ${colors.glow}`,
                          }}
                        >
                          <feature.Icon
                            size={32}
                            className={cn(
                              'transition-all duration-300',
                              colors.text,
                              feature.disabled && 'text-text-disabled'
                            )}
                          />
                        </motion.div>

                        {/* Badge */}
                        {feature.badge && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-kili-red to-red-600 text-[9px] font-bold text-white rounded-full shadow-lg"
                          >
                            {feature.badge}
                          </motion.span>
                        )}

                        {/* Text */}
                        <div className="flex flex-col gap-1 w-full">
                          <span className={cn(
                            'text-sm font-bold transition-colors duration-300',
                            colors.text
                          )}>
                            {feature.label}
                          </span>
                          {feature.description && (
                            <span className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors">
                              {feature.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </motion.div>

              {/* Footer tip */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 p-4 rounded-2xl border border-white/10 text-center group cursor-pointer hover:border-white/30 transition-colors"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))' }}
              >
                <p className="text-[12px] text-white/60 group-hover:text-white/80 transition-colors">
                  💡 <span className="font-semibold">Tip:</span> Swipe down to close
                </p>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
