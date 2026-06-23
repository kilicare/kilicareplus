'use client'
// Force dynamic rendering to prevent static pre-rendering during build
// This ensures auth state is evaluated at runtime, not build time
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Clock, Star, MapPin } from 'lucide-react'
import { bookingsService, type Booking } from '@/services/bookings.service'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliButton } from '@/components/ui/KiliButton'
import { KiliBottomSheet } from '@/components/ui/KiliBottomSheet'
import { TrustScoreRing } from '@/components/ui/TrustScoreRing'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { parseApiError } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; emoji: string }
> = {
  PENDING:    { label: 'Inasubiri',  color: '#F5A623', bg: 'rgba(245,166,35,0.1)',   emoji: '⏳' },
  CONFIRMED:  { label: 'Imethibitishwa', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',   emoji: '✅' },
  ESCROW_HELD:{ label: 'Malipo Yamehifadhiwa', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', emoji: '🔒' },
  IN_PROGRESS:{ label: 'Inaendelea', color: '#10B981', bg: 'rgba(16,185,129,0.1)',   emoji: '🏃' },
  COMPLETED:  { label: 'Imekamilika',color: '#10B981', bg: 'rgba(16,185,129,0.1)',   emoji: '🎉' },
  CANCELLED:  { label: 'Imefutwa',   color: '#FF2D2D', bg: 'rgba(255,45,45,0.1)',    emoji: '❌' },
  DISPUTED:   { label: 'Tatizo',     color: '#FF7700', bg: 'rgba(255,119,0,0.1)',    emoji: '⚠️' },
}

// ── Review Modal ────────────────────────────────────
function ReviewModal({
  bookingId,
  isOpen,
  onClose,
}: {
  bookingId: number
  isOpen: boolean
  onClose: () => void
}) {
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: () =>
      bookingsService.addReview(bookingId, rating, review),
    onSuccess: () => {
      toast.success('Asante kwa ukaguzi wako! ⭐')
      qc.invalidateQueries({ queryKey: ['my-bookings'] })
      onClose()
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  return (
    <KiliBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="⭐ Kadiria Uzoefu"
      height="60"
    >
      <div className="p-5 space-y-5">
        {/* Stars */}
        <div>
          <p className="text-sm text-text-muted mb-3">
            Rating (1–5 nyota):
          </p>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4, 5].map((s) => (
              <motion.button
                key={s}
                onClick={() => setRating(s)}
                whileTap={{ scale: 0.8 }}
                className="text-4xl"
                animate={{
                  scale: s <= rating ? 1.1 : 0.9,
                  opacity: s <= rating ? 1 : 0.4,
                }}
              >
                ⭐
              </motion.button>
            ))}
          </div>
        </div>

        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Simulia uzoefu wako..."
          rows={3}
          className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold resize-none"
        />

        <KiliButton
          fullWidth size="lg"
          loading={mut.isPending}
          disabled={!review.trim()}
          onClick={() => mut.mutate()}
        >
          Tuma Ukaguzi ⭐
        </KiliButton>
      </div>
    </KiliBottomSheet>
  )
}

// ── Booking Card ────────────────────────────────────
function BookingCard({
  booking,
  isGuide,
  onAction,
  onReview,
}: {
  booking: Booking
  isGuide: boolean
  onAction: (id: number, action: string) => void
  onReview: (id: number) => void
}) {
  const stCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG['PENDING']
  const other = isGuide ? {
    username: booking.tourist_username,
    avatar: booking.tourist_avatar,
  } : {
    username: booking.guide_username,
    avatar: booking.guide_avatar,
  }

  return (
    <motion.div
      className="rounded-3xl overflow-hidden"
      style={{
        background: 'rgba(26,26,36,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      {/* Status bar */}
      <div className="h-1.5" style={{ background: stCfg.color }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <KiliAvatar
              src={other.avatar}
              name={other.username}
              size="sm"
            />
            <div>
              <p className="text-sm font-bold text-text-primary">
                @{other.username}
              </p>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: stCfg.bg, color: stCfg.color }}
              >
                {stCfg.emoji} {stCfg.label}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-gold">
              {formatCurrency(booking.amount)}
            </p>
            <p className="text-[10px] text-text-muted">
              TZS {booking.guide_payout.toLocaleString()} kwa guide
            </p>
          </div>
        </div>

        {/* Booking details */}
        <div
          className="rounded-2xl p-3 mb-3 space-y-1.5"
          style={{ background: 'rgba(10,10,15,0.5)' }}
        >
          <p className="text-sm font-bold text-text-primary">{booking.title}</p>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Clock size={12} />
            {new Date(booking.scheduled_date).toLocaleDateString('sw-TZ', {
              day: 'numeric', month: 'long', year: 'numeric',
            })} — {booking.scheduled_time}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <MapPin size={12} />
            {booking.location}
          </div>
          <div className="text-xs text-text-muted">
            👥 Washiriki: {booking.participants} |
            ⏱️ Muda: {booking.duration_hours}h
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {/* Guide actions */}
          {isGuide && booking.status === 'PENDING' && (
            <>
              <KiliButton
                size="xs"
                onClick={() => onAction(booking.id, 'confirm')}
                icon={<CheckCircle size={12} />}
              >
                Thibitisha
              </KiliButton>
              <KiliButton
                variant="danger"
                size="xs"
                onClick={() => onAction(booking.id, 'cancel')}
              >
                Kataa
              </KiliButton>
            </>
          )}

          {isGuide && booking.status === 'CONFIRMED' && (
            <KiliButton
              size="xs"
              onClick={() => onAction(booking.id, 'start')}
            >
              Anza Uzoefu
            </KiliButton>
          )}

          {/* Tourist actions */}
          {!isGuide && booking.status === 'IN_PROGRESS' && (
            <KiliButton
              size="xs"
              variant="success"
              onClick={() => onAction(booking.id, 'complete')}
              icon={<CheckCircle size={12} />}
            >
              Nimekamilika — Toa Pesa
            </KiliButton>
          )}

          {!isGuide && booking.status === 'COMPLETED' && !booking.has_review && (
            <KiliButton
              size="xs"
              variant="outline"
              onClick={() => onReview(booking.id)}
              icon={<Star size={12} />}
            >
              Kadiria Guide
            </KiliButton>
          )}

          {['PENDING', 'CONFIRMED'].includes(booking.status) && (
            <KiliButton
              size="xs"
              variant="ghost"
              onClick={() => onAction(booking.id, 'cancel')}
              icon={<XCircle size={12} />}
            >
              Futa
            </KiliButton>
          )}

          {!isGuide && booking.status === 'IN_PROGRESS' && (
            <KiliButton
              size="xs"
              variant="danger"
              onClick={() => onAction(booking.id, 'dispute')}
            >
              Tatizo
            </KiliButton>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Bookings Page ──────────────────────────────
export default function BookingsPage() {
  const { sessionValid, user } = useSession()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null)
  const isGuide = user?.role === 'LOCAL_GUIDE'

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: isGuide ? ['guide-bookings'] : ['my-bookings'],
    queryFn: isGuide
      ? bookingsService.getGuideBookings
      : bookingsService.getMyBookings,
    staleTime: 1000 * 60 * 2,
  })

  const actionMut = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      bookingsService.action(
        id,
        action as 'confirm' | 'start' | 'complete' | 'cancel' | 'dispute'
      ),
    onSuccess: (_, vars) => {
      const msgs: Record<string, string> = {
        confirm: 'Booking imethibitishwa! ✅',
        complete: 'Umekamilika! Pesa imetolewa kwa guide 💰',
        cancel: 'Booking imefutwa.',
        start: 'Uzoefu umeanza!',
      }
      toast.success(msgs[vars.action] || 'Imefanyika!')
      qc.invalidateQueries({ queryKey: ['guide-bookings', 'my-bookings'] })
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  const upcoming = bookings.filter((b) =>
    ['PENDING', 'CONFIRMED', 'ESCROW_HELD', 'IN_PROGRESS'].includes(b.status)
  )
  const past = bookings.filter((b) =>
    ['COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED'].includes(b.status)
  )

  const displayed = activeTab === 'upcoming' ? upcoming : past

  return (
    <div className="min-h-dvh bg-bg-base pt-safe pb-safe overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-black text-text-primary">
          📅 {isGuide ? 'Bookings za Wateja' : 'Bookings Zangu'}
        </h1>
        <p className="text-text-muted text-sm mt-0.5">
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-5 mb-5">
        {(['upcoming', 'past'] as const).map((tab) => (
          <motion.button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{
              background:
                activeTab === tab
                  ? 'rgba(245,166,35,0.15)'
                  : 'rgba(26,26,36,0.6)',
              border: `1px solid ${
                activeTab === tab
                  ? 'rgba(245,166,35,0.4)'
                  : 'rgba(255,255,255,0.07)'
              }`,
              color: activeTab === tab ? '#F5A623' : '#8B8BA7',
            }}
          >
            {tab === 'upcoming' ? '⏳ Zinakuja' : '✅ Zilizopita'}
            {tab === 'upcoming' && upcoming.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-gold text-black rounded-full w-4 h-4 inline-flex items-center justify-center">
                {upcoming.length}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* List */}
      <div className="px-5 space-y-4 pb-8">
        {isLoading ? (
          [0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="h-52" rounded="xl" />
          ))
        ) : displayed.length === 0 ? (
          <EmptyState
            icon={activeTab === 'upcoming' ? '📅' : '📋'}
            title={
              activeTab === 'upcoming'
                ? 'Hakuna bookings zinazokuja'
                : 'Hakuna bookings zilizopita'
            }
            subtitle={
              activeTab === 'upcoming'
                ? 'Bookings mpya zitaonekana hapa'
                : 'Historia ya bookings itaonekana hapa'
            }
          />
        ) : (
          displayed.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              isGuide={isGuide}
              onAction={(id, action) =>
                actionMut.mutate({ id, action })
              }
              onReview={setReviewBookingId}
            />
          ))
        )}
      </div>

      {/* Review modal */}
      {reviewBookingId && (
        <ReviewModal
          bookingId={reviewBookingId}
          isOpen={!!reviewBookingId}
          onClose={() => setReviewBookingId(null)}
        />
      )}
    </div>
  )
}