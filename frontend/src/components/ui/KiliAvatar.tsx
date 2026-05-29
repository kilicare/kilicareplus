'use client'
import Image from 'next/image'
import { mediaUrl, getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ROLE_COLORS: Record<string, string> = {
  TOURIST: '#3B82F6',
  LOCAL_GUIDE: '#F5A623',
  ADMIN: '#8B5CF6',
  B2B: '#10B981',
}

const SIZES = {
  xs: { px: 28, fs: 10, ring: 1.5 },
  sm: { px: 36, fs: 12, ring: 2 },
  md: { px: 44, fs: 15, ring: 2 },
  lg: { px: 64, fs: 20, ring: 2.5 },
  xl: { px: 88, fs: 28, ring: 3 },
}

interface Props {
  src?: string | null
  name?: string
  role?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isVerified?: boolean
  className?: string
  onClick?: () => void
}

export function KiliAvatar({
  src, name = '', role = 'TOURIST', size = 'md',
  isVerified, className, onClick,
}: Props) {
  const { px, fs, ring } = SIZES[size]
  const initials = getInitials(name) || '?'
  const roleColor = ROLE_COLORS[role] || '#8B8BA7'
  const ringColor = isVerified ? '#F5A623' : roleColor
  const imgUrl = src ? mediaUrl(src) : null

  return (
    <div
      className={cn(
        'relative flex-shrink-0',
        onClick && 'cursor-pointer',
        className
      )}
      style={{ width: px, height: px }}
      onClick={onClick}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          padding: ring,
          background: `linear-gradient(135deg, ${ringColor}, ${ringColor}66)`,
        }}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-bg-elevated">
          {imgUrl ? (
            <Image
              src={imgUrl}
              alt={name || 'avatar'}
              width={px}
              height={px}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-bold text-text-primary"
              style={{ fontSize: fs }}
            >
              {initials}
            </div>
          )}
        </div>
      </div>
      {isVerified && (
        <div
          className="absolute bottom-0 right-0 rounded-full flex items-center justify-center text-black font-bold"
          style={{
            width: px * 0.32,
            height: px * 0.32,
            background: '#F5A623',
            fontSize: px * 0.14,
            border: `${ring}px solid #0A0A0F`,
          }}
        >
          ✓
        </div>
      )}
    </div>
  )
}