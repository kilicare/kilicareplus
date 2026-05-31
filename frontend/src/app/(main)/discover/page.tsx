'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronRight } from 'lucide-react'
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
function ExperienceCard({ exp }: { exp: Experience }) {
  const img = exp.primary_image?.file_url

  return (
    <Link href={`/experiences/${exp.id}`}>
      <motion.div
        className="relative flex-shrink-0 w-52 rounded-3xl overflow-hidden cursor-pointer"
        style={{ aspectRatio: '3/4', background: '#1A1A24' }}
        whileTap={{ scale: 0.97 }}
      >
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
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-xl"
            style={{
              background: 'rgba(10,10,15,0.7)',
              backdropFilter: 'blur(8px)',
              color: '#F0F0F5',
            }}
          >
            {exp.category}
          </span>
        </div>

        {/* Today badge */}
        {exp.today_moment_active && (
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-bold px-2 py-1 rounded-xl bg-kili-green/90 text-white">
              ⚡ Leo!
            </span>
          </div>
        )}

        {/* Price */}
        {exp.price_range && (
          <div className="absolute bottom-16 right-3">
            <span className="text-[11px] font-bold text-gold">
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
function TipCard({ tip }: { tip: Tip }) {
  const CAT_COLORS: Record<string, string> = {
    SAFETY: '#FF2D2D',
    LIFESTYLE: '#F5A623',
    NAVIGATION: '#3B82F6',
    EXPERIENCE: '#10B981',
    ACCESSIBILITY: '#8B5CF6',
  }
  const color = CAT_COLORS[tip.category] || '#F5A623'

  return (
    <motion.div
      className="rounded-2xl p-4"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
      }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, color }}
        >
          {tip.category}
        </span>
        {tip.is_verified && (
          <span className="text-[10px] text-kili-green font-bold">✓</span>
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
        <span className="text-[10px] font-bold" style={{ color }}>
          👍 {tip.upvotes}
        </span>
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
      <div className="px-5 pt-6 pb-4">
        <motion.h1
          className="text-3xl font-black mb-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-gradient-gold">Gundua</span>
          <br />
          <span className="text-text-primary">Tanzania 🇹🇿</span>
        </motion.h1>
        <p className="text-text-muted text-sm mb-4">
          Safari, Chakula, Utamaduni, na zaidi
        </p>

        {/* Search */}
        <div className="glass rounded-2xl flex items-center gap-3 px-4 py-3">
          <Search size={16} className="text-text-muted flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tafuta uzoefu, tips..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none"
          />
        </div>

        {/* Quick filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
          {['🦁 Safari', '🏖️ Pwani', '🍛 Chakula', '🌙 Usiku'].map((f) => (
            <motion.button
              key={f}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary"
              style={{
                background: 'rgba(26,26,36,0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {f}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Section 2: Mini Map link ── */}
      <Link href="/map">
        <motion.div
          className="mx-5 mb-6 rounded-3xl overflow-hidden relative cursor-pointer"
          style={{ height: 120 }}
          whileTap={{ scale: 0.99 }}
        >
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, rgba(245,166,35,0.1), rgba(59,130,246,0.1))',
              border: '1px solid rgba(245,166,35,0.2)',
            }}
          >
            <div className="text-center">
              <span className="text-4xl block mb-2">🗺️</span>
              <p className="text-sm font-bold text-text-primary">
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

      {/* ── Section 3: Today's Experiences ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-5 mb-3">
          <h2 className="text-lg font-black text-text-primary">
            ⚡ Leo Karibu Nawe
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
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: 'rgba(26,26,36,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-text-muted text-sm">
                Hakuna uzoefu wa leo. Angalia kesho! 🌅
              </p>
            </div>
          </div>
        ) : (
          <div
            className="flex gap-4 px-5 overflow-x-auto no-scrollbar pb-2"
          >
            {todayExps.map((exp) => (
              <ExperienceCard key={exp.id} exp={exp} />
            ))}
          </div>
        )}
      </div>

      {/* ── Section 4: Trending Tips ── */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-text-primary">
            🔥 Vidokezo Vinavyoongoza
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
            : tips.slice(0, 4).map((tip) => (
                <TipCard key={tip.id} tip={tip} />
              ))}
        </div>
      </div>

      {/* ── Section 5: Trending Moments ── */}
      {trendingMoments.length > 0 && (
        <div className="px-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-text-primary">
              📸 Wakati wa Kilicare
            </h2>
            <Link href="/feed" className="text-xs text-gold flex items-center gap-1">
              Zote <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {trendingMoments.map((m) => (
              <Link key={m.id} href="/feed">
                <motion.div
                  className="aspect-square rounded-xl overflow-hidden relative bg-bg-elevated"
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
                    <span className="text-[9px] text-white font-bold">
                      👁 {formatCount(m.views)}
                    </span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 6: Category Tabs ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between px-5 mb-3">
          <h2 className="text-lg font-black text-text-primary">
            🌍 Kwa Aina
          </h2>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 px-5 overflow-x-auto no-scrollbar pb-2 mb-4">
          {EXP_CATEGORIES.map((cat) => (
            <motion.button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
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
              {cat.emoji} {cat.label}
            </motion.button>
          ))}
        </div>

        {/* Experiences grid */}
        <div className="flex gap-4 px-5 overflow-x-auto no-scrollbar pb-2">
          {allExps.slice(0, 6).map((exp) => (
            <ExperienceCard key={exp.id} exp={exp} />
          ))}
        </div>
      </div>

      <div className="h-8" />
    </div>
  )
}