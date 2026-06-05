'use client'
import { use, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ChevronLeft, MapPin, Clock, Users, Star,
  Share2, Calendar, MessageSquare,
} from 'lucide-react'
import { experiencesService } from '@/services/experiences.service'
import { chatService } from '@/services/chat.service'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { TrustScoreRing } from '@/components/ui/TrustScoreRing'
import { KiliButton } from '@/components/ui/KiliButton'
import { KiliBottomSheet } from '@/components/ui/KiliBottomSheet'
import { KiliInput } from '@/components/ui/KiliInput'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { formatCurrency, parseApiError } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/core/api/axios'

// ── Booking Sheet ─────────────────────────────────────
function BookingSheet({
  experience,
  isOpen,
  onClose,
}: {
  experience: { id: number; guide_id: number; title: string; price_min: number | null; price_max: number | null; location: string }
  isOpen: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    scheduled_date: '',
    scheduled_time: '',
    participants: '1',
    special_requests: '',
    amount: experience.price_min?.toString() || '0',
  })

  const bookMut = useMutation({
    mutationFn: () =>
      api.post('/api/bookings/', {
        experience_id: experience.id,
        guide_id: experience.guide_id,
        title: experience.title,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        participants: parseInt(form.participants),
        location: experience.location,
        amount: parseFloat(form.amount),
        special_requests: form.special_requests,
      }),
    onSuccess: () => {
      toast.success('Booking imeundwa! 🎉')
      router.push('/bookings')
      onClose()
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  return (
    <KiliBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="📅 Weka Booking"
      height="90"
    >
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <KiliInput
            label="Tarehe"
            type="date"
            value={form.scheduled_date}
            onChange={(e) =>
              setForm((f) => ({ ...f, scheduled_date: e.target.value }))
            }
          />
          <KiliInput
            label="Wakati"
            type="time"
            value={form.scheduled_time}
            onChange={(e) =>
              setForm((f) => ({ ...f, scheduled_time: e.target.value }))
            }
          />
        </div>

        <KiliInput
          label="Washiriki"
          type="number"
          value={form.participants}
          onChange={(e) =>
            setForm((f) => ({ ...f, participants: e.target.value }))
          }
          icon={<Users size={16} />}
        />

        <KiliInput
          label="Bei (TZS)"
          type="number"
          value={form.amount}
          onChange={(e) =>
            setForm((f) => ({ ...f, amount: e.target.value }))
          }
        />

        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1.5">
            Maombi Maalum (optional)
          </label>
          <textarea
            value={form.special_requests}
            onChange={(e) =>
              setForm((f) => ({ ...f, special_requests: e.target.value }))
            }
            placeholder="Mahitaji yoyote maalum..."
            rows={3}
            className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold resize-none"
          />
        </div>

        {/* Price breakdown */}
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{
            background: 'rgba(245,166,35,0.05)',
            border: '1px solid rgba(245,166,35,0.15)',
          }}
        >
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Uzoefu</span>
            <span className="text-text-primary font-bold">
              {formatCurrency(parseFloat(form.amount) || 0)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Ada ya Platform (10%)</span>
            <span className="text-text-muted">
              {formatCurrency((parseFloat(form.amount) || 0) * 0.1)}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border-subtle">
            <span className="font-bold text-text-primary">Jumla</span>
            <span className="font-black text-gold">
              {formatCurrency((parseFloat(form.amount) || 0) * 1.1)}
            </span>
          </div>
        </div>

        <KiliButton
          fullWidth size="lg"
          loading={bookMut.isPending}
          disabled={!form.scheduled_date || !form.scheduled_time || !form.amount || !parseFloat(form.amount)}
          onClick={() => bookMut.mutate()}
          icon={<Calendar size={18} />}
        >
          Tuma Booking
        </KiliButton>
      </div>
    </KiliBottomSheet>
  )
}

// ── Main Experience Detail Page ───────────────────────
export default function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { user } = useAuthStore()
  const [showBooking, setShowBooking] = useState(false)
  const [activeImg, setActiveImg] = useState(0)

  const { data: exp, isLoading } = useQuery({
    queryKey: ['experience', resolvedParams.id],
    queryFn: () => experiencesService.getOne(parseInt(resolvedParams.id)),
    staleTime: 1000 * 60 * 5,
  })

  const startChatMut = useMutation({
    mutationFn: async () => {
      if (!exp) return null
      // Find guide's user ID from username
      const { data } = await api.get(
        `/auth/check-username/?username=${exp.guide_username}`
      )
      return null
    },
    onSuccess: () => router.push('/chat'),
  })

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-bg-base">
        <SkeletonCard className="h-64 rounded-none" rounded="sm" />
        <div className="px-5 pt-4 space-y-4">
          <SkeletonCard className="h-8 w-3/4" rounded="md" />
          <SkeletonCard className="h-32" rounded="xl" />
        </div>
      </div>
    )
  }

  if (!exp) {
    return (
      <div className="min-h-dvh bg-bg-base flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">😕</p>
          <p className="text-text-primary font-bold">Uzoefu haukupatikana</p>
          <KiliButton
            variant="ghost"
            size="sm"
            className="mt-4"
            onClick={() => router.back()}
          >
            Rudi
          </KiliButton>
        </div>
      </div>
    )
  }

  const images = exp.media || []
  const currentImg = images[activeImg]
  const isOwnExperience = user?.username === exp.guide_username

  return (
    <div className="min-h-dvh bg-bg-base overflow-y-auto no-scrollbar pb-safe">
      {/* Image gallery */}
      <div className="relative h-72">
        {currentImg?.file_url ? (
          <img
            src={currentImg.file_url}
            alt={exp.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-6xl"
            style={{
              background: 'linear-gradient(135deg, rgba(245,166,35,0.15), rgba(10,10,15,0.9))',
            }}
          >
            ⭐
          </div>
        )}

        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.7) 100%)',
          }}
        />

        {/* Back + Share */}
        <div className="absolute top-0 left-0 right-0 flex justify-between p-4"
          style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}
        >
          <motion.button
            onClick={() => router.back()}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 glass rounded-xl flex items-center justify-center"
          >
            <ChevronLeft size={20} className="text-white" />
          </motion.button>
          <motion.button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              toast.success('Link imekopwa!')
            }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 glass rounded-xl flex items-center justify-center"
          >
            <Share2 size={16} className="text-white" />
          </motion.button>
        </div>

        {/* Today badge */}
        {exp.today_moment_active && (
          <div className="absolute top-16 left-4">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-kili-green/90 text-white">
              ⚡ Leo Inapatikana!
            </span>
          </div>
        )}

        {/* Image thumbnails */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: i === activeImg ? '#F5A623' : 'rgba(255,255,255,0.5)',
                  width: i === activeImg ? 16 : 8,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-5 space-y-5">
        {/* Category + Title */}
        <div>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-xl mb-2 inline-block"
            style={{
              background: 'rgba(245,166,35,0.15)',
              color: '#F5A623',
            }}
          >
            {exp.category}
          </span>
          <h1 className="text-2xl font-black text-text-primary leading-tight mt-1">
            {exp.title}
          </h1>
          <div className="flex items-center gap-1.5 mt-2 text-text-muted text-sm">
            <MapPin size={14} />
            {exp.location}
          </div>
        </div>

        {/* Guide card */}
        <div
          className="flex items-center gap-4 rounded-3xl p-4"
          style={{
            background: 'rgba(26,26,36,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <KiliAvatar
            src={exp.guide_avatar}
            name={exp.guide_username}
            isVerified={exp.guide_verified}
            size="lg"
          />
          <div className="flex-1">
            <p className="font-black text-text-primary">
              @{exp.guide_username}
            </p>
            <p className="text-xs text-text-muted">Local Guide</p>
            <div className="flex items-center gap-2 mt-1">
              <TrustScoreRing score={exp.guide_trust} size="xs" />
              <span className="text-xs text-text-muted">
                Imani {exp.guide_trust}%
              </span>
            </div>
          </div>
          {!isOwnExperience && (
            <KiliButton
              variant="ghost"
              size="xs"
              onClick={() => router.push('/chat')}
              icon={<MessageSquare size={14} />}
            >
              Wasiliana
            </KiliButton>
          )}
        </div>

        {/* Price */}
        {(exp.price_min || exp.price_max || exp.price_range) && (
          <div
            className="rounded-2xl p-4 flex items-center justify-between"
            style={{
              background: 'rgba(245,166,35,0.08)',
              border: '1px solid rgba(245,166,35,0.2)',
            }}
          >
            <div>
              <p className="text-xs text-text-muted mb-0.5">Bei</p>
              <p className="text-2xl font-black text-gold">
                {exp.price_range ||
                  (exp.price_min
                    ? `TZS ${exp.price_min.toLocaleString()}`
                    : 'Mazungumzo')}
              </p>
            </div>
            <div className="text-right text-xs text-text-muted">
              <p>👁️ {exp.views} maoni</p>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <h2 className="font-bold text-text-primary mb-2">
            Kuhusu Uzoefu Huu
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            {exp.description}
          </p>
        </div>

        {/* CTA Buttons */}
        {!isOwnExperience && (
          <div className="space-y-3 pt-2">
            <KiliButton
              fullWidth size="lg"
              onClick={() => setShowBooking(true)}
              icon={<Calendar size={18} />}
            >
              Weka Booking
            </KiliButton>
            <KiliButton
              variant="ghost"
              fullWidth size="md"
              onClick={() => router.push('/chat')}
              icon={<MessageSquare size={16} />}
            >
              Uliza Maswali
            </KiliButton>
          </div>
        )}

        {isOwnExperience && (
          <KiliButton
            variant="outline"
            fullWidth
            onClick={() => router.push('/dashboard')}
          >
            Simamia Uzoefu Huu
          </KiliButton>
        )}
      </div>

      {/* Booking Sheet */}
      <BookingSheet
        experience={{
          id: exp.id,
          guide_id: exp.guide_id,
          title: exp.title,
          price_min: exp.price_min,
          price_max: exp.price_max,
          location: exp.location,
        }}
        isOpen={showBooking}
        onClose={() => setShowBooking(false)}
      />
    </div>
  )
}