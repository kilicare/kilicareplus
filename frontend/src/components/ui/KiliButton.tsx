'use client'
import { motion, HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'danger' | 'outline' | 'success'
type Size = 'xs' | 'sm' | 'md' | 'lg'

interface Props
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
  children?: React.ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-gold text-black font-bold hover:opacity-90 shadow-gold',
  ghost:
    'bg-white/5 text-text-primary border border-border-subtle hover:bg-white/8',
  danger:
    'bg-kili-red/10 text-kili-red border border-kili-red/25 hover:bg-kili-red/20',
  outline:
    'bg-transparent text-gold border border-border-gold hover:bg-gold-muted',
  success:
    'bg-kili-green/10 text-kili-green border border-kili-green/25 hover:bg-kili-green/20',
}

const SIZES: Record<Size, string> = {
  xs: 'h-8 px-3 text-xs rounded-xl gap-1.5',
  sm: 'h-9 px-4 text-sm rounded-xl gap-2',
  md: 'h-11 px-5 text-sm rounded-2xl gap-2',
  lg: 'h-13 px-6 text-base rounded-2xl gap-2.5',
}

export function KiliButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  disabled,
  className,
  ...props
}: Props) {
  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.96 }}
      transition={{ duration: 0.1 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold',
        'tracking-tight transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-gold/50',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'select-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin flex-shrink-0" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="flex-shrink-0">{iconRight}</span>
      )}
    </motion.button>
  )
}