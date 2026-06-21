'use client'
import { motion } from 'framer-motion'
import { KiliButton } from './KiliButton'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: string
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({
  icon = '📭',
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizes = {
    sm: { icon: 'text-4xl', title: 'text-base', sub: 'text-xs', py: 'py-8' },
    md: { icon: 'text-5xl', title: 'text-lg',   sub: 'text-sm', py: 'py-12' },
    lg: { icon: 'text-7xl', title: 'text-xl',   sub: 'text-sm', py: 'py-16' },
  }

  const s = sizes[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6',
        s.py,
        className
      )}
    >
      <motion.div
        className={cn('mb-4', s.icon)}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        {icon}
      </motion.div>

      <motion.p
        className={cn('font-black text-text-primary mb-1', s.title)}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {title}
      </motion.p>

      {subtitle && (
        <motion.p
          className={cn('text-text-muted leading-relaxed mb-5', s.sub)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {subtitle}
        </motion.p>
      )}

      {actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <KiliButton size="sm" onClick={onAction}>
            {actionLabel}
          </KiliButton>
        </motion.div>
      )}
    </div>
  )
}

// ── Pre-built empty states ────────────────────────────────

export function EmptyFeed({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon="📸"
      title="Hakuna Moments Bado"
      subtitle="Kuwa wa kwanza kushiriki Tanzania yako!"
      actionLabel="Chapisha Moment"
      onAction={onCreate}
    />
  )
}

export function EmptyChat() {
  return (
    <EmptyState
      icon="💬"
      title="Hakuna Mazungumzo"
      subtitle="Anza mazungumzo na guide au tourist"
    />
  )
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon="🔔"
      title="Hakuna Arifa Bado"
      subtitle="Arifa zitaonekana hapa ukifanya shughuli kwenye Kilicare+"
    />
  )
}

export function EmptyBookings({ isGuide }: { isGuide?: boolean }) {
  return (
    <EmptyState
      icon="📅"
      title={isGuide ? "Hakuna Bookings za Wateja" : "Hakuna Bookings Zako"}
      subtitle={
        isGuide
          ? "Wateja wataanza booking uzoefu wako"
          : "Weka booking ya uzoefu wako wa kwanza!"
      }
    />
  )
}

export function EmptyPredictions() {
  return (
    <EmptyState
      icon="⚽"
      title="Hakuna Mechi Leo"
      subtitle="Predictions zitaonekana baada ya sync. Run: python manage.py sync_predictions"
    />
  )
}

export function EmptyShowcase() {
  return (
    <EmptyState
      icon="🛍️"
      title="Hakuna Bidhaa Bado"
      subtitle="Ongeza bidhaa zako za kwanza!"
    />
  )
}

export function EmptySOS() {
  return (
    <EmptyState
      icon="✅"
      title="Tanzania Iko Salama"
      subtitle="Hakuna dharura sasa hivi"
    />
  )
}