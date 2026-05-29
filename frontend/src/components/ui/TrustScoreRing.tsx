'use client'

interface Props {
  score: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showNumber?: boolean
}

const SIZES = {
  xs: { px: 32, sw: 2.5, fs: 9 },
  sm: { px: 40, sw: 3, fs: 11 },
  md: { px: 52, sw: 3.5, fs: 13 },
  lg: { px: 68, sw: 4, fs: 17 },
}

function getColor(s: number) {
  if (s >= 85) return '#10B981'
  if (s >= 65) return '#F5A623'
  if (s >= 45) return '#3B82F6'
  return '#FF2D2D'
}

export function TrustScoreRing({
  score, size = 'sm', showNumber = true,
}: Props) {
  const { px, sw, fs } = SIZES[size]
  const r = (px - sw * 2) / 2
  const circ = 2 * Math.PI * r
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circ
  const color = getColor(score)

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: px, height: px }}
    >
      <svg
        width={px}
        height={px}
        style={{ transform: 'rotate(-90deg)', position: 'absolute' }}
      >
        <circle
          cx={px / 2} cy={px / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.08)"
          strokeWidth={sw}
        />
        <circle
          cx={px / 2} cy={px / 2} r={r}
          fill="none" stroke={color}
          strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - filled}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      {showNumber && (
        <span
          className="relative z-10 font-bold font-mono"
          style={{ fontSize: fs, color }}
        >
          {score}
        </span>
      )}
    </div>
  )
}