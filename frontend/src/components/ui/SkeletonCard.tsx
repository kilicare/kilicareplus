import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

interface SkeletonCardProps {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  style?: CSSProperties
}

export function SkeletonCard({
  className,
  rounded = 'xl',
  style,
}: SkeletonCardProps) {
  const r = {
    sm: 'rounded-lg', md: 'rounded-xl',
    lg: 'rounded-2xl', xl: 'rounded-3xl', full: 'rounded-full',
  }
  return (
    <div
      className={cn('skeleton', r[rounded], className)}
      style={style}
      aria-hidden="true"
    />
  )
}

export function SkeletonText({
  lines = 3, className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 skeleton rounded-lg"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      className="skeleton rounded-full flex-shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}