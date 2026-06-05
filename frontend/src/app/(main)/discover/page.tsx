'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronRight, MapPin, Sparkles, TrendingUp, Compass } from 'lucide-react'
import Link from 'next/link'
import { experiencesService, type Experience } from '@/services/experiences.service'
import { tipsService, type Tip } from '@/services/tips.service'
import { momentsService } from '@/services/moments.service'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { TrustScoreRing } from '@/components/ui/TrustScoreRing'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { mediaUrl, formatCount } from '@/lib/utils'
import Image from 'next/image'

const EXP_CATEGORIES = [
  { key: '', label: 'Zote', emoji: '✨' },
  { key: 'Safari', label: 'Safari', emoji: '🦁' },
  { key: 'Beach', label: 'Pwani', emoji: '🏖️' },
  { key: 'Food', label: 'Chakula', emoji: '🍛' },
  { key: 'Culture', label: 'Utamaduni', emoji: '🏛️' },
  { key: 'Nightlife', label: 'Usiku', emoji: '🌙' },
  { key: 'Adventure', label: 'Safari', emoji: '🏔️' },
]

// ── Experience Card ─────────────────────────────────
function ExperienceCard({ exp, index }: { exp: Experience; index: number }) {
  const img = exp.primary_image?.file_url

  return (
    <Link href={`/experiences/${exp.id}`}>
      <motion.div
        className="relative flex-shrink-0 w-52 rounded-3xl overflow-hidden cursor-pointer"
        style={{ aspectRatio: '3/4', background: '#1A1A24', perspective: '1000px' }}
        initial={{ opacity: 0, y: 20, rotateX: -10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ delay: index * 0.1, type: 'spring', stiffness: 300 }}
        whileHover={{ y: -8, rotateX: 5, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Glow effect on hover */}
        <motion.div
          className="absolute inset-0 blur-2xl"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{ background: 'radial-gradient(circle, rgba(245,166,35,0.3), rgba(245,166,35,0))' }}
        />

        {img && (
          <Image
            src={img}
            alt={exp.title}
            fill
            className="object-cover"
            unoptimized
          />
        )}
        {/* Gradient */}
        <div
          className="absolute inset-0"
          style={{ background: 'var(--gradient-card)' }}
        />

        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <motion.span
            className="text-[10px] font-bold px-2 py-1 rounded-xl backdrop-blur-xl"
            style={{
              background: 'rgba(10,10,15,0.7)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F0F0F5',
            }}
            whileHover={{ scale: 1.05 }}
          >
            {exp.category}
          </motion.span>
        </div>

        {/* Today badge */}
        {exp.today_moment_active && (
          <motion.div
            className="absolute top-3 right-3"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + (index * 0.1) }}
          >
            <span className="text-[10px] font-bold px-2 py-1 rounded-xl bg-gradient-to-r from-green-500/30 to-green-500/10 border border-green-400/50 text-green-300 shadow-lg shadow-green-500/20">
              ⚡ Leo!
            </span>
          </motion.div>
        )}

        {/* Price */}
        {exp.price_range && (
          <div className="absolute bottom-16 right-3">
            <span className="text-[11px] font-bold text-gold drop-shadow-lg">
              {exp.price_range}
            </span>
          </div>
        )}

        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white font-bold text-sm leading-tight mb-2">
            {exp.title}
          </p>
          <div className="flex items-center gap-2">
            <KiliAvatar
              src={exp.guide_avatar}
              name={exp.guide_username}
              size="xs"
            />
            <TrustScoreRing
              score={exp.guide_trust}
              size="xs"
              showNumber={false}
            />
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

// ── Tip Card ────────────────────────────────────────
function TipCard({ tip, index }: { tip: Tip; index: number }) {
  const CAT_COLORS: Record<string, { color: string; bg: string; glow: string }> = {
    SAFETY: { color: '#FF2D2D', bg: 'rgba(255,45,45,0.12)', glow: 'rgba(255,45,45,0.3)' },
    LIFESTYLE: { color: '#F5A623', bg: 'rgba(245,166,35,0.12)', glow: 'rgba(245,166,35,0.3)' },
    NAVIGATION: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', glow: 'rgba(59,130,246,0.3)' },
    EXPERIENCE: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', glow: 'rgba(16,185,129,0.3)' },
    ACCESSIBILITY: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', glow: 'rgba(139,92,246,0.3)' },
  }
  const theme = CAT_COLORS[tip.category] || CAT_COLORS.LIFESTYLE

  return (
    <motion.div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{ background: theme.bg, border: `1px solid ${theme.color}30` }}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 300 }}
      whileHover={{ y: -4, scale: 1.02, borderColor: theme.color }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${theme.color}, rgba(${parseInt(theme.color.slice(1,3),16)},${parseInt(theme.color.slice(3,5),16)},${parseInt(theme.color.slice(5,7),16)},0))` }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${theme.color}25`, color: theme.color }}
          >
            {tip.category}
          </span>
          {tip.is_verified && (
            <span className="text-[10px] text-green-400 font-bold">✓</span>
          )}
        </div>
        <h3 className="font-bold text-text-primary text-sm mb-1 line-clamp-2">
          {tip.title}
        </h3>
        <p className="text-text-muted text-xs line-clamp-2">
          {tip.description}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-text-muted">
            @{tip.creator_username}
          </span>
          <span className="text-[10px] font-bold" style={{ color: theme.color }}>
            👍 {tip.upvotes}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Discover Page ──────────────────────────────
export default function DiscoverPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('')

  const { data: todayExps = [], isLoading: expsLoading } = useQuery({
    queryKey: ['experiences-today'],
    queryFn: experiencesService.getToday,
    staleTime: 1000 * 60 * 5,
  })

  const { data: allExps = [] } = useQuery({
    queryKey: ['experiences', activeCategory],
    queryFn: () => experiencesService.getAll(activeCategory || undefined),
    staleTime: 1000 * 60 * 5,
  })

  const { data: tips = [], isLoading: tipsLoading } = useQuery({
    queryKey: ['tips-trending'],
    queryFn: tipsService.getTrending,
    staleTime: 1000 * 60 * 5,
  })

  const { data: feedData } = useQuery({
    queryKey: ['feed', 1],
    queryFn: () => momentsService.getFeed(1),
    staleTime: 1000 * 60 * 2,
  })

  const trendingMoments = feedData?.results?.slice(0, 9) ?? []

  return (
    <div className="min-h-dvh bg-bg-base pt-safe pb-safe overflow-y-auto no-scrollbar">
      {/* ── Section 1: Hero Search ── */}
      <motion.div
        className="px-5 pt-6 pb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <motion.h1
          className="text-3xl font-black mb-1"
        >
          <span className="bg-gradient-to-r from-gold via-orange-400 to-gold bg-clip-text text-transparent">Gundua</span>
          <br />
          <span className="text-text-primary">Tanzania 🇹🇿</span>
        </motion.h1>
        <motion.p
          className="text-text-muted text-sm mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Safari, Chakula, Utamaduni, na zaidi
        </motion.p>

        {/* Search */}
        <motion.div
          className="rounded-2xl flex items-center gap-3 px-4 py-3 relative overflow-hidden"
          style={{ background: 'rgba(26,26,36,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
          whileFocus-within={{ borderColor: 'rgba(245,166,35,0.3)', boxShadow: '0 0 20px rgba(245,166,35,0.1)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-10"
            style={{ background: 'radial-gradient(circle, #F5A623, rgba(245,166,35,0))' }}
          />
          <Search size={16} className="text-text-muted flex-shrink-0 relative z-10" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tafuta uzoefu, tips..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none relative z-10"
          />
        </motion.div>

        {/* Quick filters */}
        <motion.div
          className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {['🦁 Safari', '🏖️ Pwani', '🍛 Chakula', '🌙 Usiku'].map((f, i) => (
            <motion.button
              key={f}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + (i * 0.05) }}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary relative overflow-hidden"
              style={{
                background: 'rgba(26,26,36,0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {f}
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Section 2: Mini Map link ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mx-5 mb-6"
      >
        <Link href="/map">
          <motion.div
            className="rounded-3xl overflow-hidden relative cursor-pointer"
            style={{ height: 120, background: 'linear-gradient(135deg, rgba(245,166,35,0.1), rgba(59,130,246,0.1))', border: '1px solid rgba(245,166,35,0.2)' }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20"
              style={{ background: 'radial-gradient(circle, #F5A623, rgba(245,166,35,0))' }}
            />
            <div className="w-full h-full flex items-center justify-center relative z-10">
              <div className="text-center">
                <motion.span
                  className="text-4xl block mb-2"
                  whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  🗺️
                </motion.span>
                <p className="text-sm font-bold text-text-primary flex items-center gap-2 justify-center">
                  <MapPin size={16} className="text-gold" />
                  Angalia Ramani Kamili
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  Tips {tips.length} + Uzoefu {allExps.length}
                </p>
              </div>
            </div>
            <div className="absolute top-3 right-3">
              <ChevronRight size={16} className="text-gold" />
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* ── Section 3: Today's Experiences ── */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between px-5 mb-3">
          <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
            <Sparkles size={20} className="text-gold" />
            Leo Karibu Nawe
          </h2>
          <Link href="/experiences" className="text-xs text-gold flex items-center gap-1">
            Zote <ChevronRight size={14} />
          </Link>
        </div>

        {expsLoading ? (
          <div className="flex gap-4 px-5 overflow-x-auto no-scrollbar pb-2">
            {[0, 1, 2].map((i) => (
              <SkeletonCard
                key={i}
                className="w-52 flex-shrink-0"
                rounded="xl"
                style={{ aspectRatio: '3/4' } as React.CSSProperties}
              />
            ))}
          </div>
        ) : todayExps.length === 0 ? (
          <div className="px-5">
            <motion.div
              className="rounded-2xl p-6 text-center relative overflow-hidden"
              style={{ background: 'rgba(26,26,36,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className="text-text-muted text-sm">
                Hakuna uzoefu wa leo. Angalia kesho! 🌅
              </p>
            </motion.div>
          </div>
        ) : (
          <div className="flex gap-4 px-5 overflow-x-auto no-scrollbar pb-2">
            {todayExps.map((exp, i) => (
              <ExperienceCard key={exp.id} exp={exp} index={i} />
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Section 4: Trending Tips ── */}
      <motion.div
        className="px-5 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
            <TrendingUp size={20} className="text-orange-400" />
            Vidokezo Vinavyoongoza
          </h2>
          <Link href="/tips" className="text-xs text-gold flex items-center gap-1">
            Zote <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {tipsLoading
            ? [0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i} className="h-32" rounded="xl" />
              ))
            : tips.slice(0, 4).map((tip, i) => (
                <TipCard key={tip.id} tip={tip} index={i} />
              ))}
        </div>
      </motion.div>

      {/* ── Section 5: Trending Moments ── */}
      {trendingMoments.length > 0 && (
        <motion.div
          className="px-5 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
              📸 Wakati wa Kilicare
            </h2>
            <Link href="/feed" className="text-xs text-gold flex items-center gap-1">
              Zote <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {trendingMoments.map((m, i) => (
              <Link key={m.id} href="/feed">
                <motion.div
                  className="aspect-square rounded-xl overflow-hidden relative bg-bg-elevated"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + (i * 0.05) }}
                  whileHover={{ scale: 1.05, zIndex: 10 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {m.media_url && (
                    <Image
                      src={m.media_url}
                      alt={m.caption || ''}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}
                  <div className="absolute bottom-1 left-1">
                    <span className="text-[9px] text-white font-bold drop-shadow-lg">
                      👁 {formatCount(m.views)}
                    </span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Section 6: Category Tabs ── */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="flex items-center justify-between px-5 mb-3">
          <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
            <Compass size={20} className="text-blue-400" />
            Kwa Aina
          </h2>
        </div>

        {/* Category tabs */}
        <motion.div
          className="flex gap-2 px-5 overflow-x-auto no-scrollbar pb-2 mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
        >
          {EXP_CATEGORIES.map((cat, i) => (
            <motion.button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.85 + (i * 0.05) }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold relative overflow-hidden"
              style={{
                background:
                  activeCategory === cat.key
                    ? 'rgba(245,166,35,0.15)'
                    : 'rgba(26,26,36,0.6)',
                border: `1px solid ${
                  activeCategory === cat.key
                    ? 'rgba(245,166,35,0.4)'
                    : 'rgba(255,255,255,0.07)'
                }`,
                color:
                  activeCategory === cat.key
                    ? '#F5A623'
                    : '#8B8BA7',
              }}
            >
              {activeCategory === cat.key && (
                <div className="absolute inset-0 opacity-20"
                  style={{ background: 'radial-gradient(circle, #F5A623, rgba(245,166,35,0))' }}
                />
              )}
              <span className="relative z-10">{cat.emoji} {cat.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Experiences grid */}
        <div className="flex gap-4 px-5 overflow-x-auto no-scrollbar pb-2">
          {allExps.slice(0, 6).map((exp, i) => (
            <ExperienceCard key={exp.id} exp={exp} index={i} />
          ))}
        </div>
      </motion.div>

      <div className="h-8" />
    </div>
  )
}