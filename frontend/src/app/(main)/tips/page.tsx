'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, MapPin, ThumbsUp, Shield, Navigation, Star, Accessibility } from 'lucide-react'
import { tipsService, type Tip } from '@/services/tips.service'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { TrustScoreRing } from '@/components/ui/TrustScoreRing'
import { KiliButton } from '@/components/ui/KiliButton'
import { KiliBottomSheet } from '@/components/ui/KiliBottomSheet'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/stores/auth.store'
import { timeAgo, parseApiError, vibrate } from '@/lib/utils'

const CATEGORIES = [
  { key: '',              label: 'Zote',         Icon: Star,          color: '#F5A623' },
  { key: 'SAFETY',        label: 'Usalama',      Icon: Shield,        color: '#FF2D2D' },
  { key: 'LIFESTYLE',     label: 'Maisha',       Icon: Star,          color: '#F5A623' },
  { key: 'NAVIGATION',    label: 'Njia',         Icon: Navigation,    color: '#3B82F6' },
  { key: 'EXPERIENCE',    label: 'Uzoefu',       Icon: Star,          color: '#10B981' },
  { key: 'ACCESSIBILITY', label: 'Upatikanaji',  Icon: Accessibility, color: '#8B5CF6' },
]

const CAT_COLORS: Record<string, string> = {
  SAFETY: '#FF2D2D', LIFESTYLE: '#F5A623',
  NAVIGATION: '#3B82F6', EXPERIENCE: '#10B981',
  ACCESSIBILITY: '#8B5CF6',
}

// ── Create Tip Sheet ─────────────────────────────────
function CreateTipSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'LIFESTYLE',
    location_address: '',
  })

  const mut = useMutation({
    mutationFn: () => tipsService.create(form),
    onSuccess: () => {
      toast.success('Tip imechapishwa! 💡 +10 pointi')
      qc.invalidateQueries({ queryKey: ['tips'] })
      setForm({ title: '', description: '', category: 'LIFESTYLE', location_address: '' })
      onClose()
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  return (
    <KiliBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="💡 Chapisha Tip"
      height="90"
    >
      <div className="p-5 space-y-4">
        {/* Category */}
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-2">
            Aina ya Tip
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.filter((c) => c.key).map((cat) => (
              <motion.button
                key={cat.key}
                onClick={() => setForm((f) => ({ ...f, category: cat.key }))}
                whileTap={{ scale: 0.95 }}
                className="py-2.5 rounded-2xl text-xs font-bold transition-all"
                style={{
                  background:
                    form.category === cat.key
                      ? `${cat.color}20`
                      : 'rgba(26,26,36,0.6)',
                  border: `1px solid ${
                    form.category === cat.key
                      ? `${cat.color}50`
                      : 'rgba(255,255,255,0.08)'
                  }`,
                  color:
                    form.category === cat.key
                      ? cat.color
                      : '#8B8BA7',
                }}
              >
                {cat.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-2">
            Kichwa cha Habari
          </label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Mf. Usiku wa Kariakoo — kuwa makini!"
            className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-2">
            Maelezo
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Toa maelezo ya kina..."
            rows={4}
            className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold resize-none"
          />
        </div>

        {/* Location */}
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-2">
            Eneo (optional)
          </label>
          <div className="flex items-center gap-2 bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3">
            <MapPin size={16} className="text-gold flex-shrink-0" />
            <input
              value={form.location_address}
              onChange={(e) =>
                setForm((f) => ({ ...f, location_address: e.target.value }))
              }
              placeholder="Mf. Dar es Salaam CBD"
              className="flex-1 bg-transparent text-sm text-text-primary outline-none"
            />
          </div>
        </div>

        <KiliButton
          fullWidth size="lg"
          loading={mut.isPending}
          disabled={!form.title || !form.description}
          onClick={() => mut.mutate()}
        >
          Chapisha Tip 💡
        </KiliButton>
      </div>
    </KiliBottomSheet>
  )
}

// ── Tip Card ──────────────────────────────────────────
function TipCard({ tip, onUpvote }: { tip: Tip; onUpvote: (id: number) => void }) {
  const color = CAT_COLORS[tip.category] || '#F5A623'

  return (
    <motion.div
      className="rounded-3xl overflow-hidden"
      style={{
        background: 'rgba(26,26,36,0.9)',
        border: `1px solid rgba(255,255,255,0.07)`,
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      {/* Top color bar */}
      <div className="h-1" style={{ background: color }} />

      <div className="p-4">
        {/* Category + Verified */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: `${color}18`, color }}
          >
            {CATEGORIES.find((c) => c.key === tip.category)?.label || tip.category}
          </span>
          {tip.is_verified && (
            <span className="text-[10px] text-kili-green font-bold">
              ✓ Imethibitishwa
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-text-primary text-sm leading-snug mb-1">
          {tip.title}
        </h3>

        {/* Description */}
        <p className="text-text-muted text-xs leading-relaxed mb-3 line-clamp-3">
          {tip.description}
        </p>

        {/* Location */}
        {tip.location_address && (
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted mb-3">
            <MapPin size={10} />
            {tip.location_address}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KiliAvatar
              src={tip.creator_avatar}
              name={tip.creator_username}
              role={tip.creator_role}
              size="xs"
            />
            <div>
              <p className="text-[10px] font-bold text-text-primary">
                @{tip.creator_username}
              </p>
              <p className="text-[9px] text-text-muted">
                {timeAgo(tip.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <TrustScoreRing
              score={tip.trust_score}
              size="xs"
              showNumber={false}
            />
            <motion.button
              onClick={() => {
                vibrate(10)
                onUpvote(tip.id)
              }}
              whileTap={{ scale: 0.85 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{
                background: tip.is_upvoted
                  ? `${color}20`
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${
                  tip.is_upvoted
                    ? `${color}40`
                    : 'rgba(255,255,255,0.08)'
                }`,
              }}
            >
              <ThumbsUp
                size={12}
                fill={tip.is_upvoted ? color : 'none'}
                style={{ color }}
              />
              <span
                className="text-xs font-bold"
                style={{ color: tip.is_upvoted ? color : 'var(--text-muted)' }}
              >
                {tip.upvotes}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Tips Page ────────────────────────────────────
export default function TipsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [activeCategory, setActiveCategory] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const isGuide = user?.role === 'LOCAL_GUIDE' || user?.role === 'ADMIN'

  const { data: tips = [], isLoading } = useQuery({
    queryKey: ['tips', activeCategory],
    queryFn: () => tipsService.getAll(activeCategory || undefined),
    staleTime: 1000 * 60 * 3,
  })

  const upvoteMut = useMutation({
    mutationFn: (id: number) => tipsService.upvote(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['tips'] })
      const prev = qc.getQueryData<Tip[]>(['tips', activeCategory])
      qc.setQueryData<Tip[]>(['tips', activeCategory], (old) =>
        old?.map((t) =>
          t.id === id
            ? {
                ...t,
                is_upvoted: !t.is_upvoted,
                upvotes: t.is_upvoted ? t.upvotes - 1 : t.upvotes + 1,
              }
            : t
        )
      )
      return { prev }
    },
    onError: (_, __, ctx) => {
      qc.setQueryData(['tips', activeCategory], ctx?.prev)
    },
    onSuccess: (data) => {
      if (data.upvoted) toast.success('+2 pointi kwa mchapishaji! 💡')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tips'] })
    },
  })

  return (
    <div className="min-h-dvh bg-bg-base overflow-y-auto no-scrollbar">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-5 pb-3 border-b"
        style={{
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--border)',
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-text-primary">
              💡 Vidokezo
            </h1>
            <p className="text-text-muted text-xs mt-0.5">
              Tips za Tanzania — kutoka kwa wazawa
            </p>
          </div>
          {isGuide && (
            <KiliButton
              size="sm"
              onClick={() => setShowCreate(true)}
              icon={<Plus size={14} />}
            >
              Ongeza
            </KiliButton>
          )}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{
                background:
                  activeCategory === cat.key
                    ? `${cat.color}18`
                    : 'rgba(26,26,36,0.6)',
                border: `1px solid ${
                  activeCategory === cat.key
                    ? `${cat.color}40`
                    : 'rgba(255,255,255,0.07)'
                }`,
                color:
                  activeCategory === cat.key
                    ? cat.color
                    : '#8B8BA7',
              }}
            >
              {cat.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tips list */}
      <div className="px-4 py-4 space-y-4 pb-safe">
        {isLoading ? (
          [0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} className="h-48" rounded="xl" />
          ))
        ) : tips.length === 0 ? (
          <EmptyState
            icon="💡"
            title="Hakuna tips bado"
            subtitle={
              isGuide
                ? 'Kuwa wa kwanza kushiriki tip ya Tanzania!'
                : 'Tips za Tanzania zitaonekana hapa'
            }
            actionLabel={isGuide ? 'Chapisha Tip' : undefined}
            onAction={isGuide ? () => setShowCreate(true) : undefined}
          />
        ) : (
          <AnimatePresence>
            {tips.map((tip) => (
              <TipCard
                key={tip.id}
                tip={tip}
                onUpvote={(id) => upvoteMut.mutate(id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Create sheet */}
      <CreateTipSheet
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />

      {/* FAB for guides on mobile */}
      {isGuide && (
        <motion.button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-2xl flex items-center justify-center shadow-gold"
          style={{ background: 'var(--gradient-gold)' }}
          whileTap={{ scale: 0.9 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <Plus size={24} className="text-black" strokeWidth={2.5} />
        </motion.button>
      )}
    </div>
  )
}