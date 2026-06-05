'use client'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  rounded?: 'sm' | 'md' | 'xl' | 'full'
  style?: React.CSSProperties
  rows?: number
  animated?: boolean
}

const ROUNDED = {
  sm:   'rounded-sm',
  md:   'rounded-xl',
  xl:   'rounded-2xl',
  full: 'rounded-full',
}

function SkeletonBase({
  className,
  rounded = 'md',
  style,
  animated = true,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-white/6',
        animated && 'animate-pulse',
        ROUNDED[rounded],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard({
  className,
  rounded = 'md',
  style,
}: SkeletonProps) {
  return (
    <SkeletonBase
      className={cn('w-full h-full', className)}
      rounded={rounded}
      style={style}
    />
  )
}

export function SkeletonText({ width = 'full' }: { width?: string }) {
  return (
    <SkeletonBase
      className={`h-4 rounded-lg w-${width} mb-2`}
    />
  )
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8', md: 'w-11 h-11', lg: 'w-16 h-16' }
  return <SkeletonBase className={sizes[size]} rounded="full" />
}

// ── Specific skeletons for each page ─────────────────────

export function SkeletonMomentCard() {
  return (
    <div
      className="flex-shrink-0 relative"
      style={{ height: '100dvh', width: '100%' }}
      aria-hidden="true"
    >
      <SkeletonBase className="w-full h-full" rounded="sm" animated={false} />
      <div className="absolute bottom-32 left-4 space-y-2">
        <div className="flex items-center gap-2">
          <SkeletonAvatar size="md" />
          <SkeletonBase className="h-4 w-28 rounded-lg" />
        </div>
        <SkeletonBase className="h-4 w-56 rounded-lg" />
        <SkeletonBase className="h-4 w-44 rounded-lg" />
      </div>
      <div className="absolute right-4 bottom-40 space-y-4">
        {[0,1,2,3].map((i) => (
          <SkeletonBase key={i} className="w-10 h-10" rounded="full" />
        ))}
      </div>
    </div>
  )
}

export function SkeletonBookingCard() {
  return (
    <div
      className="rounded-3xl p-4 animate-pulse"
      style={{ background:'rgba(26,26,36,0.9)' }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 mb-3">
        <SkeletonAvatar size="sm" />
        <div className="flex-1 space-y-1">
          <SkeletonBase className="h-4 w-32 rounded-lg" />
          <SkeletonBase className="h-3 w-20 rounded-lg" />
        </div>
        <SkeletonBase className="h-6 w-20 rounded-lg" />
      </div>
      <SkeletonBase className="h-20 w-full rounded-2xl mb-3" />
      <div className="flex gap-2">
        <SkeletonBase className="h-8 flex-1 rounded-xl" />
        <SkeletonBase className="h-8 flex-1 rounded-xl" />
      </div>
    </div>
  )
}

export function SkeletonNotificationCard() {
  return (
    <div
      className="flex items-start gap-4 px-5 py-4 animate-pulse"
      aria-hidden="true"
    >
      <SkeletonAvatar size="md" />
      <div className="flex-1 space-y-1.5">
        <SkeletonBase className="h-4 w-48 rounded-lg" />
        <SkeletonBase className="h-3 w-64 rounded-lg" />
        <SkeletonBase className="h-3 w-20 rounded-lg" />
      </div>
    </div>
  )
}

export function SkeletonExperienceCard() {
  return (
    <div
      className="flex-shrink-0 w-52 rounded-3xl overflow-hidden animate-pulse"
      style={{ aspectRatio:'3/4', background:'rgba(26,26,36,0.8)' }}
      aria-hidden="true"
    >
      <SkeletonBase className="w-full h-3/4" rounded="sm" />
      <div className="p-3 space-y-2">
        <SkeletonBase className="h-3 w-16 rounded-lg" />
        <SkeletonBase className="h-4 w-full rounded-lg" />
        <SkeletonBase className="h-3 w-24 rounded-lg" />
      </div>
    </div>
  )
}

export function SkeletonPassportCard() {
  return (
    <div
      className="rounded-3xl p-6 animate-pulse mx-5"
      style={{
        height: 200,
        background: 'rgba(26,26,36,0.8)',
        border: '2px solid rgba(255,255,255,0.06)',
      }}
      aria-hidden="true"
    >
      <div className="flex justify-between mb-5">
        <div className="space-y-1">
          <SkeletonBase className="h-2 w-28 rounded" />
          <SkeletonBase className="h-4 w-20 rounded" />
        </div>
        <SkeletonBase className="w-11 h-11 rounded-xl" />
      </div>
      <div className="flex gap-3 mb-4">
        <SkeletonAvatar size="lg" />
        <div className="space-y-2">
          <SkeletonBase className="h-5 w-36 rounded" />
          <SkeletonBase className="h-3 w-24 rounded" />
          <SkeletonBase className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  )
}