'use client'
// Force dynamic rendering to prevent static pre-rendering during build
// This ensures auth state is evaluated at runtime, not build time
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Search, ShoppingBag } from 'lucide-react'
import { showcaseService, type VirtualShowcase } from '@/services/showcase.service'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { TrustScoreRing } from '@/components/ui/TrustScoreRing'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCount } from '@/lib/utils'

const CATEGORIES = [
  { key: '', label: 'Zote', emoji: '🛍️' },
  { key: 'Art', label: 'Sanaa', emoji: '🎨' },
  { key: 'Food', label: 'Chakula', emoji: '🍛' },
  { key: 'Craft', label: 'Ufundi', emoji: '🪣' },
  { key: 'Fashion', label: 'Mavazi', emoji: '👗' },
  { key: 'Jewelry', label: 'Vito', emoji: '💍' },
]

function ShowcaseCard({ showcase }: { showcase: VirtualShowcase }) {
  return (
    <Link href={`/showcase/${showcase.owner_username}`}>
      <motion.div
        className="rounded-3xl overflow-hidden cursor-pointer"
        style={{
          background: 'rgba(26,26,36,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        {/* Banner */}
        <div
          className="h-28 relative"
          style={{
            background: showcase.banner_url
              ? undefined
              : `linear-gradient(135deg, ${showcase.theme_color}30, rgba(10,10,15,0.8))`,
          }}
        >
          {showcase.banner_url && (
            <img
              src={showcase.banner_url}
              alt={showcase.title}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg-base/70" />

          {/* View count */}
          <div className="absolute top-3 right-3 glass rounded-xl px-2 py-1 text-[10px] text-text-muted flex items-center gap-1">
            👁️ {formatCount(showcase.total_views)}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 -mt-6 relative">
          {/* Avatar */}
          <div className="flex items-end justify-between mb-3">
            <KiliAvatar
              src={showcase.owner_avatar}
              name={showcase.owner_username}
              isVerified={showcase.owner_verified}
              size="lg"
            />
            <TrustScoreRing score={showcase.owner_trust} size="sm" />
          </div>

          <h3 className="font-black text-text-primary text-base leading-tight mb-0.5">
            {showcase.title}
          </h3>
          <p className="text-xs text-text-muted mb-2">
            @{showcase.owner_username}
          </p>

          <div className="flex items-center gap-2">
            <ShoppingBag size={12} className="text-gold" />
            <span className="text-xs text-text-muted">
              {showcase.item_count} bidhaa
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

export default function ShowcaseLandingPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const { data: showcases = [], isLoading } = useQuery({
    queryKey: ['showcases'],
    queryFn: showcaseService.getAll,
    staleTime: 1000 * 60 * 5,
  })

  const filtered = showcases.filter((s) =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.owner_username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-dvh bg-bg-base pt-safe pb-safe overflow-y-auto no-scrollbar">
      {/* Hero */}
      <div className="px-5 pt-8 pb-5">
        <motion.h1
          className="text-3xl font-black text-text-primary mb-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          🛍️ <span className="text-gradient-gold">Virtual</span>
          <br />
          Showcase
        </motion.h1>
        <p className="text-text-muted text-sm">
          Bidhaa za kipekee za Tanzania — moja kwa moja kwa mkono wa mtengenezaji
        </p>
      </div>

      {/* Search */}
      <div className="px-5 mb-4">
        <div className="glass rounded-2xl flex items-center gap-3 px-4 py-3">
          <Search size={16} className="text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tafuta showcase au bidhaa..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none"
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 px-5 mb-5 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((c) => (
          <motion.button
            key={c.key}
            onClick={() => setCategory(c.key)}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{
              background:
                category === c.key
                  ? 'rgba(245,166,35,0.15)'
                  : 'rgba(26,26,36,0.6)',
              border: `1px solid ${
                category === c.key
                  ? 'rgba(245,166,35,0.4)'
                  : 'rgba(255,255,255,0.07)'
              }`,
              color: category === c.key ? '#F5A623' : '#8B8BA7',
            }}
          >
            {c.emoji} {c.label}
          </motion.button>
        ))}
      </div>

      {/* Grid */}
      <div className="px-5 pb-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} className="h-64" rounded="xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🛍️"
            title="Hakuna showcase bado"
            subtitle="Kuwa wa kwanza kuunda showcase yako!"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((s) => (
              <ShowcaseCard key={s.id} showcase={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}