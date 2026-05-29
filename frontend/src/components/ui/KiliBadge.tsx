import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'TOURIST' | 'LOCAL_GUIDE' | 'ADMIN' | 'B2B'
  | 'VERIFIED' | 'BASIC_CREATOR' | 'BUSINESS_CREATOR'
  | 'PRO_GUIDE' | 'PREMIUM' | 'EXPLORER' | 'ADVENTURER'
  | 'GUARDIAN' | 'LEGEND' | 'ACTIVE' | 'TRIAL' | 'EXPIRED'

const CONFIG: Record<
  BadgeVariant,
  { label: string; emoji: string; bg: string; color: string }
> = {
  TOURIST:          { label: 'Tourist',    emoji: '🧳', bg: 'rgba(59,130,246,0.12)',   color: '#3B82F6' },
  LOCAL_GUIDE:      { label: 'Local Guide',emoji: '⭐', bg: 'rgba(245,166,35,0.12)',   color: '#F5A623' },
  ADMIN:            { label: 'Admin',      emoji: '👑', bg: 'rgba(139,92,246,0.12)',   color: '#8B5CF6' },
  B2B:              { label: 'B2B',        emoji: '🏨', bg: 'rgba(16,185,129,0.12)',   color: '#10B981' },
  VERIFIED:         { label: 'Verified',   emoji: '✓',  bg: 'rgba(16,185,129,0.12)',   color: '#10B981' },
  BASIC_CREATOR:    { label: 'Basic',      emoji: '🥉', bg: 'rgba(180,83,9,0.12)',     color: '#B45309' },
  BUSINESS_CREATOR: { label: 'Business',   emoji: '🥈', bg: 'rgba(148,163,184,0.12)', color: '#94A3B8' },
  PRO_GUIDE:        { label: 'Pro Guide',  emoji: '🥇', bg: 'rgba(245,166,35,0.12)',  color: '#F5A623' },
  PREMIUM:          { label: 'Premium',    emoji: '💎', bg: 'rgba(139,92,246,0.12)',   color: '#8B5CF6' },
  EXPLORER:         { label: 'Explorer',   emoji: '🧭', bg: 'rgba(148,163,184,0.12)', color: '#94A3B8' },
  ADVENTURER:       { label: 'Adventurer', emoji: '⚡', bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6' },
  GUARDIAN:         { label: 'Guardian',   emoji: '🛡️', bg: 'rgba(245,166,35,0.12)', color: '#F5A623' },
  LEGEND:           { label: 'Legend',     emoji: '👑', bg: 'rgba(139,92,246,0.12)',  color: '#8B5CF6' },
  ACTIVE:           { label: 'Active',     emoji: '●',  bg: 'rgba(16,185,129,0.12)',  color: '#10B981' },
  TRIAL:            { label: 'Trial',      emoji: '⏱',  bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  EXPIRED:          { label: 'Expired',    emoji: '✗',  bg: 'rgba(255,45,45,0.12)',   color: '#FF2D2D' },
}

const PADS = {
  xs: 'px-2 py-0.5 text-[10px] gap-1',
  sm: 'px-2.5 py-1 text-xs gap-1',
  md: 'px-3.5 py-1.5 text-sm gap-1.5',
}

interface Props {
  variant: BadgeVariant
  size?: 'xs' | 'sm' | 'md'
  showEmoji?: boolean
  className?: string
}

export function KiliBadge({
  variant, size = 'sm', showEmoji = true, className,
}: Props) {
  const c = CONFIG[variant]
  if (!c) return null
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full border whitespace-nowrap',
        PADS[size], className
      )}
      style={{
        background: c.bg,
        color: c.color,
        borderColor: `${c.color}25`,
      }}
    >
      {showEmoji && <span>{c.emoji}</span>}
      {c.label}
    </span>
  )
}