'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import api from '@/core/api/axios'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliBadge } from '@/components/ui/KiliBadge'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { ConfettiBlast } from '@/components/ui/ConfettiBlast'
import { useAuthStore } from '@/stores/auth.store'
import { formatCount, timeAgo } from '@/lib/utils'

type Tab = 'badges' | 'stats' | 'history' | 'leaderboard'

const LEVEL_DATA = {
  EXPLORER:   { emoji: '🧭', color: '#94A3B8', next: 'ADVENTURER', threshold: 500 },
  ADVENTURER: { emoji: '⚡', color: '#3B82F6', next: 'GUARDIAN',   threshold: 2000 },
  GUARDIAN:   { emoji: '🛡️', color: '#F5A623', next: 'LEGEND',     threshold: 5000 },
  LEGEND:     { emoji: '👑', color: '#8B5CF6', next: null,          threshold: null },
}

export default function PassportPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('badges')
  const [isFlipped, setIsFlipped] = useState(false)
  const [confetti, setConfetti] = useState(false)

  const { data: passport } = useQuery({
    queryKey: ['passport'],
    queryFn: async () => {
      const { data } = await api.get('/api/passport/my-passport/')
      return data
    },
    staleTime: 1000 * 60 * 2,
  })

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const { data } = await api.get('/api/passport/badges/')
      return data
    },
    staleTime: 1000 * 60 * 5,
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data } = await api.get('/api/passport/transactions/')
      return data
    },
    staleTime: 1000 * 60 * 3,
  })

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data } = await api.get('/api/passport/leaderboard/')
      return data
    },
    staleTime: 1000 * 60 * 5,
  })

  const { data: stats } = useQuery({
    queryKey: ['passport-stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/passport/stats/')
      return data
    },
    staleTime: 1000 * 60 * 5,
  })

  if (!user || !passport) {
    return (
      <div className="min-h-dvh bg-bg-base flex items-center justify-center">
        <SkeletonCard className="w-72 h-44 mx-auto" rounded="xl" />
      </div>
    )
  }

  const levelInfo = LEVEL_DATA[passport.level as keyof typeof LEVEL_DATA]
  const unlockedBadges = badges.filter((b: { is_unlocked: boolean }) => b.is_unlocked)

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: 'badges',      label: 'Beji',     emoji: '🏅' },
    { key: 'stats',       label: 'Takwimu',  emoji: '📊' },
    { key: 'history',     label: 'Historia', emoji: '📜' },
    { key: 'leaderboard', label: 'Orodha',   emoji: '🏆' },
  ]

  return (
    <div className="min-h-dvh bg-bg-base overflow-y-auto no-scrollbar pb-safe">
      <ConfettiBlast trigger={confetti} />

      {/* Header */}
      <div className="px-5 pt-safe pt-6 pb-4">
        <h1 className="text-2xl font-black text-text-primary mb-0.5">
          🛂 Passport Yangu
        </h1>
        <p className="text-text-muted text-sm">
          Hati yako ya KilicareGO+
        </p>
      </div>

      {/* ── 3D Passport Card ── */}
      <div className="px-5 mb-6">
        <motion.div
          className="relative cursor-pointer"
          style={{ perspective: 1000 }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
            style={{ transformStyle: 'preserve-3d', position: 'relative' }}
          >
            {/* FRONT */}
            <div
              className="rounded-3xl p-6 overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, #0D2B0D 0%, #1A3A1A 50%, #0D2B0D 100%)',
                border: '2px solid rgba(245,166,35,0.3)',
                boxShadow: '0 0 40px rgba(245,166,35,0.15)',
                backfaceVisibility: 'hidden',
              }}
            >
              {/* Gold texture overlay */}
              <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #F5A623 0px, transparent 1px, transparent 10px)',
                }}
              />

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-gold/70">
                    UNITED REPUBLIC OF
                  </p>
                  <p className="text-sm font-black text-gold tracking-wider">
                    KILICARE
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-black"
                  style={{ background: 'var(--gradient-gold)' }}
                >
                  K
                </div>
              </div>

              {/* User info */}
              <div className="flex items-center gap-4 mb-5">
                <KiliAvatar
                  src={user.profile?.avatar_url}
                  name={`${user.first_name} ${user.last_name}`}
                  role={user.role}
                  isVerified={user.is_verified}
                  size="lg"
                />
                <div>
                  <p className="text-lg font-black text-white">
                    {user.first_name?.toUpperCase()} {user.last_name?.toUpperCase()}
                  </p>
                  <p className="text-gold text-sm font-mono">
                    @{user.username}
                  </p>
                  <KiliBadge variant={user.role} size="xs" />
                </div>
              </div>

              {/* Passport number */}
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="text-white/40 text-[9px] uppercase tracking-wider">
                    Kibali Namba
                  </p>
                  <p className="text-gold font-mono font-bold">
                    KGO-{String(user.id).padStart(6, '0')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-[9px] uppercase tracking-wider">
                    Tarehe
                  </p>
                  <p className="text-gold/70 font-mono text-xs">
                    {new Date(user.date_joined).toLocaleDateString('sw-TZ', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-[9px] uppercase tracking-wider">
                    Pointi
                  </p>
                  <p className="text-gold font-mono font-black">
                    {formatCount(passport.points)}
                  </p>
                </div>
              </div>

              {/* Tap hint */}
              <p className="text-center text-white/30 text-[10px] mt-4">
                Gusa kubadilisha →
              </p>
            </div>

            {/* BACK */}
            <div
              className="absolute inset-0 rounded-3xl p-6 flex flex-col items-center justify-center"
              style={{
                background:
                  'linear-gradient(135deg, #1A0A2A 0%, #2A1A3A 50%, #1A0A2A 100%)',
                border: '2px solid rgba(245,166,35,0.3)',
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="text-7xl mb-3">{levelInfo.emoji}</div>
              <p className="text-[11px] text-white/50 uppercase tracking-widest mb-1">
                Kiwango
              </p>
              <p className="text-2xl font-black text-gold mb-4">
                {passport.level}
              </p>
              <div className="flex gap-4 mb-4">
                {unlockedBadges.slice(0, 6).map(
                  (b: { id: number; icon: string; name: string }) => (
                    <div key={b.id} className="text-2xl" title={b.name}>
                      {b.icon}
                    </div>
                  )
                )}
              </div>
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center border-2"
                style={{ borderColor: 'rgba(245,166,35,0.3)' }}
              >
                <p className="text-3xl font-black text-gold/50">QR</p>
              </div>
              <p className="text-white/30 text-[10px] mt-3">
                ← Gusa kurudi
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Level Progress */}
      <div className="px-5 mb-5">
        <div
          className="rounded-2xl p-4"
          style={{
            background: `${levelInfo.color}10`,
            border: `1px solid ${levelInfo.color}25`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold" style={{ color: levelInfo.color }}>
              {levelInfo.emoji} {passport.level}
            </span>
            {levelInfo.next && (
              <span className="text-xs text-text-muted">
                Pointi {formatCount(passport.points_to_next)} hadi {levelInfo.next}
              </span>
            )}
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: levelInfo.color }}
              initial={{ width: 0 }}
              animate={{ width: `${passport.progress_percent}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[10px] text-text-muted text-right mt-1">
            {passport.progress_percent}%
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 px-5 mb-5">
        {[
          { label: 'Pointi', value: formatCount(passport.points), color: '#F5A623' },
          { label: 'Imani', value: Math.round(passport.trust_score), color: '#10B981' },
          { label: 'Beji', value: unlockedBadges.length, color: '#8B5CF6' },
          { label: 'Moments', value: stats?.moments_posted ?? 0, color: '#3B82F6' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-3 text-center"
            style={{
              background: `${s.color}08`,
              border: `1px solid ${s.color}20`,
            }}
          >
            <p className="text-lg font-black" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-[10px] text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle px-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 text-center py-3 text-xs font-medium transition-colors"
            style={{
              color: activeTab === tab.key ? 'var(--gold)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.key
                ? '2px solid var(--gold)'
                : '2px solid transparent',
            }}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-5 py-4 pb-8">
        <AnimatePresence mode="wait">
          {/* ── BADGES ── */}
          {activeTab === 'badges' && (
            <motion.div
              key="badges"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-3 gap-3"
            >
              {badges.map((badge: {
                id: number
                icon: string
                name: string
                description: string
                criteria_points: number
                is_unlocked: boolean
                user_progress: number
              }) => (
                <motion.div
                  key={badge.id}
                  className="rounded-2xl p-3 text-center relative overflow-hidden"
                  style={{
                    background: badge.is_unlocked
                      ? 'rgba(245,166,35,0.08)'
                      : 'rgba(26,26,36,0.6)',
                    border: badge.is_unlocked
                      ? '1px solid rgba(245,166,35,0.3)'
                      : '1px solid rgba(255,255,255,0.06)',
                    filter: badge.is_unlocked ? 'none' : 'grayscale(0.8)',
                    opacity: badge.is_unlocked ? 1 : 0.6,
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  {badge.is_unlocked && (
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        background:
                          'radial-gradient(ellipse at center, rgba(245,166,35,0.3), transparent)',
                      }}
                    />
                  )}
                  <div className="text-3xl mb-1 relative z-10">{badge.icon}</div>
                  <p
                    className="text-[10px] font-bold relative z-10"
                    style={{
                      color: badge.is_unlocked ? '#F5A623' : '#8B8BA7',
                    }}
                  >
                    {badge.name}
                  </p>
                  {!badge.is_unlocked && (
                    <div className="h-1 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gold/50"
                        style={{ width: `${badge.user_progress}%` }}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── STATS ── */}
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Contribution chart */}
              {transactions.length > 0 && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: 'rgba(26,26,36,0.8)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <p className="text-sm font-bold text-text-primary mb-3">
                    📈 Pointi (Hivi karibuni)
                  </p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart
                      data={transactions.slice(0, 7).reverse().map(
                        (t: { description: string; points_change: number }, i: number) => ({
                          day: `#${i + 1}`,
                          pts: Math.abs(t.points_change),
                        })
                      )}
                    >
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 9, fill: '#8B8BA7' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          background: '#1A1A24',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 10,
                          fontSize: 11,
                          color: '#F0F0F5',
                        }}
                      />
                      <Bar
                        dataKey="pts"
                        fill="#F5A623"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Moments', value: stats?.moments_posted ?? 0, emoji: '📸' },
                  { label: 'Tips',    value: stats?.tips_created ?? 0,   emoji: '💡' },
                  { label: 'Pointi Zote', value: formatCount(stats?.total_points_earned ?? 0), emoji: '⭐' },
                  { label: 'Kiwango', value: passport.level, emoji: '🏆' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl p-4"
                    style={{
                      background: 'rgba(26,26,36,0.8)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <div className="text-2xl mb-1">{s.emoji}</div>
                    <p className="text-lg font-black text-gold">{s.value}</p>
                    <p className="text-xs text-text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── HISTORY ── */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              {transactions.length === 0 ? (
                <p className="text-center text-text-muted py-8 text-sm">
                  Hakuna historia bado
                </p>
              ) : (
                transactions.map((txn: {
                  id: number
                  description: string
                  points_change: number
                  balance_after: number
                  created_at: string
                }) => (
                  <div
                    key={txn.id}
                    className="flex items-center gap-3 py-3 border-b border-border-subtle"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{
                        background:
                          txn.points_change > 0
                            ? 'rgba(16,185,129,0.1)'
                            : 'rgba(255,45,45,0.1)',
                      }}
                    >
                      {txn.points_change > 0 ? '⬆️' : '⬇️'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {txn.description}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {timeAgo(txn.created_at)} · Salio: {txn.balance_after}
                      </p>
                    </div>
                    <span
                      className="font-black text-sm"
                      style={{
                        color:
                          txn.points_change > 0 ? '#10B981' : '#FF2D2D',
                      }}
                    >
                      {txn.points_change > 0 ? '+' : ''}
                      {txn.points_change}
                    </span>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* ── LEADERBOARD ── */}
          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Podium top 3 */}
              {leaderboard.length >= 3 && (
                <div className="flex items-end justify-center gap-3 mb-6 pt-4">
                  {[
                    { entry: leaderboard[1], height: 80, emoji: '🥈', place: 2 },
                    { entry: leaderboard[0], height: 110, emoji: '🥇', place: 1 },
                    { entry: leaderboard[2], height: 60,  emoji: '🥉', place: 3 },
                  ].map(({ entry, height, emoji, place }) => (
                    <div
                      key={place}
                      className="flex flex-col items-center gap-2"
                    >
                      <span className="text-2xl">{emoji}</span>
                      <KiliAvatar
                        src={entry.avatar}
                        name={entry.username}
                        size={place === 1 ? 'md' : 'sm'}
                      />
                      <p className="text-xs font-bold text-text-primary truncate max-w-[60px] text-center">
                        {entry.first_name || entry.username}
                      </p>
                      <div
                        className="rounded-t-xl w-16 flex items-start justify-center pt-2"
                        style={{
                          height,
                          background:
                            place === 1
                              ? 'rgba(245,166,35,0.2)'
                              : place === 2
                              ? 'rgba(148,163,184,0.15)'
                              : 'rgba(180,83,9,0.15)',
                        }}
                      >
                        <span className="text-xs font-black text-text-muted">
                          {formatCount(entry.points)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Full list */}
              <div className="space-y-2">
                {leaderboard.map((entry: {
                  rank: number
                  user_id: number
                  username: string
                  first_name: string
                  avatar: string | null
                  role: string
                  points: number
                  level: string
                  is_me: boolean
                }) => (
                  <motion.div
                    key={entry.rank}
                    className="flex items-center gap-3 py-3 px-3 rounded-2xl"
                    style={{
                      background: entry.is_me
                        ? 'rgba(245,166,35,0.08)'
                        : 'transparent',
                      border: entry.is_me
                        ? '1px solid rgba(245,166,35,0.25)'
                        : '1px solid transparent',
                    }}
                  >
                    <span
                      className="w-8 text-center font-mono font-bold text-sm"
                      style={{
                        color:
                          entry.rank <= 3 ? '#F5A623' : '#8B8BA7',
                      }}
                    >
                      #{entry.rank}
                    </span>
                    <KiliAvatar
                      src={entry.avatar}
                      name={entry.username}
                      role={entry.role}
                      size="sm"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-text-primary">
                        {entry.first_name || entry.username}
                        {entry.is_me && (
                          <span className="ml-2 text-[10px] text-gold font-bold">
                            (Wewe)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-muted">{entry.level}</p>
                    </div>
                    <span className="font-black text-sm text-gold">
                      {formatCount(entry.points)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}