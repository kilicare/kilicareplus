'use client'
// Force dynamic rendering to prevent static pre-rendering during build
// This ensures auth state is evaluated at runtime, not build time
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { toast } from 'sonner'

type Tab = 'badges' | 'stats' | 'history' | 'leaderboard'

const LEVEL_META: Record<string, {
  emoji: string; color: string; bg: string; label: string
}> = {
  EXPLORER:   { emoji: '🧭', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', label: 'Explorer' },
  ADVENTURER: { emoji: '⚡', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  label: 'Adventurer' },
  GUARDIAN:   { emoji: '🛡️', color: '#F5A623', bg: 'rgba(245,166,35,0.1)',  label: 'Guardian' },
  LEGEND:     { emoji: '👑', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  label: 'Legend' },
}

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'badges',      label: 'Beji',     emoji: '🏅' },
  { key: 'stats',       label: 'Takwimu',  emoji: '📊' },
  { key: 'history',     label: 'Historia', emoji: '📜' },
  { key: 'leaderboard', label: 'Orodha',   emoji: '🏆' },
]

// ── Animated counter ─────────────────────────────────────
function AnimCounter({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {formatCount(value)}
    </motion.span>
  )
}

// ── Badge unlock celebration ─────────────────────────────
function BadgeUnlockCelebration({
  badge,
  onClose,
}: {
  badge: { icon: string; name: string; description: string }
  onClose: () => void
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <ConfettiBlast trigger={true} />
      <motion.div
        className="text-center px-8"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="text-8xl mb-5"
          animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8 }}
        >
          {badge.icon}
        </motion.div>
        <p className="text-sm font-bold text-gold uppercase tracking-widest mb-2">
          Beji Mpya!
        </p>
        <h2 className="text-3xl font-black text-white mb-2">{badge.name}</h2>
        <p className="text-text-muted text-sm mb-8">{badge.description}</p>
        <motion.button
          onClick={onClose}
          whileTap={{ scale: 0.9 }}
          className="px-8 py-3 rounded-2xl font-bold text-black"
          style={{ background: 'var(--gradient-gold)' }}
        >
          Asome! 🎉
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

export default function PassportPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('badges')
  const [isFlipped, setIsFlipped] = useState(false)
  const [celebration, setCelebration] = useState<null | {
    icon: string; name: string; description: string
  }>(null)

  const { data: passport } = useQuery({
    queryKey: ['passport'],
    queryFn: async () => {
      const { data } = await api.get('/api/passport/my-passport/')
      return data
    },
    staleTime: 1000 * 60,
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
    staleTime: 1000 * 60 * 2,
  })

  const { data: leaderData } = useQuery({
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

  const checkBadgesMut = useMutation({
    mutationFn: () => api.post('/api/passport/check-badges/'),
    onSuccess: (res) => {
      const newly = res.data.newly_unlocked || []
      if (newly.length > 0) {
        setCelebration(newly[0])
        qc.invalidateQueries({ queryKey: ['badges'] })
        qc.invalidateQueries({ queryKey: ['passport'] })
      } else {
        toast.info('Bado hakuna beji mpya leo')
      }
    },
  })

  if (!user || !passport) {
    return (
      <div className="min-h-dvh bg-bg-base flex items-center justify-center">
        <SkeletonCard className="w-72 h-48 mx-auto" rounded="xl" />
      </div>
    )
  }

  const levelMeta = LEVEL_META[passport.level] || LEVEL_META['EXPLORER']
  const unlockedBadges = badges.filter(
    (b: { is_unlocked: boolean }) => b.is_unlocked
  )
  const leaderboard  = leaderData?.leaderboard || []

  const chartData = transactions.slice(0, 8).reverse().map(
    (t: { description: string; points_change: number }, i: number) => ({
      day: `#${i + 1}`,
      pts: Math.abs(t.points_change),
      color: t.points_change > 0 ? '#F5A623' : '#FF2D2D',
    })
  )

  return (
    <div className="min-h-dvh bg-bg-base overflow-y-auto no-scrollbar pb-safe">
      {/* Badge unlock celebration */}
      <AnimatePresence>
        {celebration && (
          <BadgeUnlockCelebration
            badge={celebration}
            onClose={() => setCelebration(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-5 pt-safe pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">
            🛂 Passport Yangu
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            Hati yako ya Kilicare+
          </p>
        </div>
        <motion.button
          onClick={() => checkBadgesMut.mutate()}
          whileTap={{ scale: 0.9 }}
          className="px-3 py-2 rounded-xl text-xs font-bold"
          style={{
            background: 'rgba(245,166,35,0.1)',
            border: '1px solid rgba(245,166,35,0.25)',
            color: '#F5A623',
          }}
        >
          🏅 Angalia Beji
        </motion.button>
      </div>

      {/* ── 3D Passport Card ── */}
      <div className="px-5 mb-5">
        <div style={{ perspective: 1000 }}>
          <motion.div
            onClick={() => setIsFlipped(!isFlipped)}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
            style={{
              transformStyle: 'preserve-3d',
              position: 'relative',
              height: 200,
              cursor: 'pointer',
            }}
          >
            {/* FRONT */}
            <div
              className="absolute inset-0 rounded-3xl overflow-hidden p-5"
              style={{
                background:
                  'linear-gradient(135deg, #0D2B0D 0%, #1A3A1A 50%, #0D2B0D 100%)',
                border: '2px solid rgba(245,166,35,0.35)',
                boxShadow: '0 0 40px rgba(245,166,35,0.12)',
                backfaceVisibility: 'hidden',
              }}
            >
              {/* Texture */}
              <div
                className="absolute inset-0 opacity-4 pointer-events-none"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg,#F5A623 0px,transparent 1px,transparent 10px)',
                }}
              />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[9px] font-bold tracking-widest text-gold/60">
                    UNITED REPUBLIC OF
                  </p>
                  <p className="text-sm font-black text-gold tracking-widest">
                    KILICARE
                  </p>
                </div>
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black text-black"
                  style={{ background: 'var(--gradient-gold)' }}
                >
                  K
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <KiliAvatar
                  src={user.profile?.avatar_url}
                  name={`${user.first_name} ${user.last_name}`}
                  role={user.role}
                  isVerified={user.is_verified}
                  size="md"
                />
                <div>
                  <p className="text-base font-black text-white">
                    {(user.first_name || '').toUpperCase()}{' '}
                    {(user.last_name || '').toUpperCase()}
                  </p>
                  <p className="text-gold text-xs font-mono">
                    @{user.username}
                  </p>
                  <KiliBadge variant={user.role} size="xs" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="text-white/40 text-[9px] uppercase tracking-wider">
                    Kibali
                  </p>
                  <p className="text-gold font-mono font-bold">
                    KGO-{String(user.id).padStart(6, '0')}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white/40 text-[9px] uppercase tracking-wider">
                    Pointi
                  </p>
                  <p className="text-gold font-black">
                    {formatCount(passport.points)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-[9px] uppercase tracking-wider">
                    Kiwango
                  </p>
                  <p className="text-gold font-bold text-xs">
                    {passport.level}
                  </p>
                </div>
              </div>
              <p className="text-center text-white/25 text-[9px] mt-3">
                Gusa kubadilisha →
              </p>
            </div>

            {/* BACK */}
            <div
              className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center p-5"
              style={{
                background:
                  'linear-gradient(135deg, #1A0A2A 0%, #2A1A3A 100%)',
                border: '2px solid rgba(245,166,35,0.3)',
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="text-6xl mb-2">{levelMeta.emoji}</div>
              <p className="text-[10px] text-white/50 uppercase tracking-widest mb-0.5">
                Kiwango
              </p>
              <p className="text-xl font-black text-gold mb-3">
                {passport.level}
              </p>
              <div className="flex gap-3 mb-3">
                {unlockedBadges.slice(0, 5).map(
                  (b: { id: number; icon: string; name: string }) => (
                    <span key={b.id} className="text-xl" title={b.name}>
                      {b.icon}
                    </span>
                  )
                )}
              </div>
              <p className="text-white/25 text-[9px]">← Gusa kurudi</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Level progress */}
      <div className="px-5 mb-4">
        <div
          className="rounded-2xl p-4"
          style={{
            background: levelMeta.bg,
            border: `1px solid ${levelMeta.color}30`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold" style={{ color: levelMeta.color }}>
              {levelMeta.emoji} {passport.level}
            </span>
            {passport.next_level && (
              <span className="text-xs text-text-muted">
                {formatCount(passport.points_to_next)} hadi {passport.next_level}
              </span>
            )}
          </div>
          <div className="h-2.5 rounded-full bg-white/8 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: levelMeta.color }}
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

      {/* Stats row — animated */}
      <div className="grid grid-cols-4 gap-2 px-5 mb-5">
        {[
          { label: 'Pointi', value: passport.points, color: '#F5A623' },
          { label: 'Imani',  value: Math.round(passport.trust_score), color: '#10B981' },
          { label: 'Beji',   value: unlockedBadges.length, color: '#8B5CF6' },
          {
            label: 'Moments',
            value: stats?.moments_posted ?? 0,
            color: '#3B82F6',
          },
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
              <AnimCounter value={s.value} />
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
                  className="rounded-2xl p-3 text-center relative overflow-hidden cursor-pointer"
                  style={{
                    background: badge.is_unlocked
                      ? 'rgba(245,166,35,0.08)'
                      : 'rgba(26,26,36,0.6)',
                    border: badge.is_unlocked
                      ? '1px solid rgba(245,166,35,0.3)'
                      : '1px solid rgba(255,255,255,0.06)',
                    opacity: badge.is_unlocked ? 1 : 0.6,
                    filter: badge.is_unlocked ? 'none' : 'grayscale(0.6)',
                  }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (badge.is_unlocked) {
                      toast.success(
                        `${badge.icon} ${badge.name}: ${badge.description}`
                      )
                    }
                  }}
                >
                  {badge.is_unlocked && (
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(ellipse at center,rgba(245,166,35,0.4),transparent)',
                      }}
                    />
                  )}
                  <div className="text-3xl mb-1 relative z-10">
                    {badge.icon}
                  </div>
                  <p
                    className="text-[10px] font-bold relative z-10"
                    style={{
                      color: badge.is_unlocked ? '#F5A623' : '#8B8BA7',
                    }}
                  >
                    {badge.name}
                  </p>
                  {!badge.is_unlocked && badge.criteria_points > 0 && (
                    <div className="h-1 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gold/50"
                        style={{ width: `${badge.user_progress}%` }}
                      />
                    </div>
                  )}
                  {badge.is_unlocked && (
                    <div className="absolute top-1 right-1">
                      <span className="text-[8px]">✓</span>
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
              {chartData.length > 0 && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: 'rgba(26,26,36,0.8)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <p className="text-sm font-bold text-text-primary mb-3">
                    📈 Pointi za Hivi Karibuni
                  </p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={chartData}>
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
                        maxBarSize={32}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Moments', value: stats?.moments_posted ?? 0, emoji: '📸' },
                  { label: 'Tips', value: stats?.tips_created ?? 0, emoji: '💡' },
                  { label: 'Bookings', value: stats?.bookings_completed ?? 0, emoji: '📅' },
                  {
                    label: 'Pointi Zote',
                    value: formatCount(stats?.total_points_earned ?? 0),
                    emoji: '⭐',
                  },
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
                        color: txn.points_change > 0 ? '#10B981' : '#FF2D2D',
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
              {/* My rank banner */}
              {leaderData?.my_rank && (
                <div
                  className="rounded-2xl p-3 mb-4 flex items-center justify-between"
                  style={{
                    background: 'rgba(245,166,35,0.08)',
                    border: '1px solid rgba(245,166,35,0.22)',
                  }}
                >
                  <p className="text-sm text-text-muted">Nafasi yako:</p>
                  <p className="text-xl font-black text-gold">
                    #{leaderData.my_rank}
                  </p>
                  <p className="text-sm text-text-muted">
                    Pointi: <span className="text-gold font-bold">
                      {formatCount(leaderData.my_points)}
                    </span>
                  </p>
                </div>
              )}

              {/* Podium top 3 */}
              {leaderboard.length >= 3 && (
                <div className="flex items-end justify-center gap-3 mb-6 pt-4">
                  {[
                    { entry: leaderboard[1], h: 80,  emoji: '🥈', place: 2 },
                    { entry: leaderboard[0], h: 110, emoji: '🥇', place: 1 },
                    { entry: leaderboard[2], h: 60,  emoji: '🥉', place: 3 },
                  ].map(({ entry, h, emoji, place }) => (
                    <div key={place} className="flex flex-col items-center gap-1">
                      <span className="text-2xl">{emoji}</span>
                      <KiliAvatar
                        src={entry.avatar}
                        name={entry.username}
                        size={place === 1 ? 'md' : 'sm'}
                      />
                      <p className="text-[10px] font-bold text-text-primary truncate max-w-[60px] text-center">
                        {entry.first_name || entry.username}
                      </p>
                      <div
                        className="rounded-t-xl w-16 flex items-start justify-center pt-1.5"
                        style={{
                          height: h,
                          background:
                            place === 1
                              ? 'rgba(245,166,35,0.2)'
                              : place === 2
                              ? 'rgba(148,163,184,0.15)'
                              : 'rgba(180,83,9,0.15)',
                        }}
                      >
                        <span className="text-[10px] font-black text-text-muted">
                          {formatCount(entry.points)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Full list */}
              <div className="space-y-1.5">
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
                    className="flex items-center gap-3 py-2.5 px-3 rounded-2xl"
                    style={{
                      background: entry.is_me
                        ? 'rgba(245,166,35,0.08)'
                        : 'transparent',
                      border: entry.is_me
                        ? '1px solid rgba(245,166,35,0.22)'
                        : '1px solid transparent',
                    }}
                  >
                    <span
                      className="w-7 text-center font-mono font-bold text-sm flex-shrink-0"
                      style={{
                        color: entry.rank <= 3 ? '#F5A623' : '#8B8BA7',
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
                      <p className="text-[10px] text-text-muted">
                        {entry.level}
                      </p>
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