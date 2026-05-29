'use client'
import { motion } from 'framer-motion'
import { KiliButton } from './KiliButton'

interface Props {
  icon: string
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon, title, subtitle, actionLabel, onAction, className = '',
}: Props) {
  return (
    <motion.div
      className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.span
        className="text-6xl mb-5 block select-none"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {icon}
      </motion.span>
      <h3 className="text-lg font-bold text-text-primary mb-2">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-text-muted max-w-xs leading-relaxed mb-6">
          {subtitle}
        </p>
      )}
      {actionLabel && onAction && (
        <KiliButton onClick={onAction}>{actionLabel}</KiliButton>
      )}
    </motion.div>
  )
}