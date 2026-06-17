'use client'
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Edit2, Share2, MapPin, Calendar,
  Grid3x3, Lightbulb, Star,
  ChevronLeft, Camera, UserCheck, MessageSquare,
} from 'lucide-react'
import type { User } from '@/types'
import { useAuthStore } from '@/stores/auth.store'
import { performLogout } from '@/core/auth/logout'
import { authService } from '@/services/auth.service'
import { momentsService } from '@/services/moments.service'
import { tipsService } from '@/services/tips.service'
import { experiencesService } from '@/services/experiences.service'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliBadge } from '@/components/ui/KiliBadge'
import { TrustScoreRing } from '@/components/ui/TrustScoreRing'
import { KiliButton } from '@/components/ui/KiliButton'
import { KiliBottomSheet } from '@/components/ui/KiliBottomSheet'
import { KiliInput } from '@/components/ui/KiliInput'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { mediaUrl, parseApiError } from '@/lib/utils'
import Image from 'next/image'
import { Suspense } from 'react'
import api from '@/core/api/axios'

// ── Edit Profile Sheet ────────────────────────────────
function EditProfileSheet({
  isOpen,
  onClose,
  user,
}: {
  isOpen: boolean
  onClose: () => void
  user: User
}) {
  const qc = useQueryClient()
  const { setUser } = useAuthStore()
  const [form, setForm] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    bio: user.profile?.bio || '',
    location: user.profile?.location || '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const mut = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('first_name', form.first_name)
      fd.append('last_name', form.last_name)
      fd.append('bio', form.bio)
      fd.append('location', form.location)
      if (avatarFile) fd.append('avatar', avatarFile)
      return authService.updateMe(fd)
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      toast.success('Profile imesasishwa! ✅')
      qc.invalidateQueries({ queryKey: ['me'] })
      onClose()
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  return (
    <KiliBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="✏️ Hariri Profile"
      height="90"
    >
      <div className="p-5 space-y-4">
        {/* Avatar picker */}
        <div className="flex justify-center">
          <div className="relative">
            <KiliAvatar
              src={avatarPreview || user.profile?.avatar_url}
              name={`${user.first_name} ${user.last_name}`}
              role={user.role}
              isVerified={user.is_verified}
              size="xl"
            />
            <motion.button
              onClick={() => fileRef.current?.click()}
              whileTap={{ scale: 0.9 }}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--gradient-gold)' }}
            >
              <Camera size={16} className="text-black" />
            </motion.button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  setAvatarFile(f)
                  setAvatarPreview(URL.createObjectURL(f))
                }
              }}
            />
          </div>
        </div>

        <KiliInput
          label="Jina la Kwanza"
          value={form.first_name}
          onChange={(e) =>
            setForm((f) => ({ ...f, first_name: e.target.value }))
          }
          placeholder="Jina lako"
        />

        <KiliInput
          label="Jina la Mwisho"
          value={form.last_name}
          onChange={(e) =>
            setForm((f) => ({ ...f, last_name: e.target.value }))
          }
          placeholder="Jina la ukoo"
        />

        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1.5">
            Bio
          </label>
          <textarea
            value={form.bio}
            onChange={(e) =>
              setForm((f) => ({ ...f, bio: e.target.value }))
            }
            placeholder="Jiambie kidogo..."
            rows={3}
            maxLength={300}
            className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold resize-none"
          />
          <p className="text-[10px] text-text-muted text-right mt-1">
            {form.bio.length}/300
          </p>
        </div>

        <KiliInput
          label="Eneo"
          value={form.location}
          onChange={(e) =>
            setForm((f) => ({ ...f, location: e.target.value }))
          }
          placeholder="Mf. Dar es Salaam, Tanzania"
          icon={<MapPin size={16} />}
        />

        <KiliButton
          fullWidth size="lg"
          loading={mut.isPending}
          onClick={() => mut.mutate()}
        >
          Hifadhi Mabadiliko
        </KiliButton>
      </div>
    </KiliBottomSheet>
  )
}

// ── Follow Stats ─────────────────────────────────────
function FollowStats({
  userId,
  momentsCount,
  tipsCount,
}: {
  userId: number
  momentsCount: number
  tipsCount: number
}) {
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)

  const { data: followData } = useQuery({
    queryKey: ['follow-check', userId],
    queryFn: async () => {
      const { data } = await api.get(`/api/follow/${userId}/check/`)
      return data
    },
    staleTime: 1000 * 60,
  })

  return (
    <div className="flex items-center gap-6 justify-center py-4 border-y border-border-subtle">
      {[
        { label: 'Moments', value: momentsCount },
        {
          label: 'Wafuasi',
          value: followData?.followers_count ?? 0,
          onClick: () => setShowFollowers(true),
        },
        {
          label: 'Wanaofuata',
          value: followData?.following_count ?? 0,
          onClick: () => setShowFollowing(true),
        },
        { label: 'Tips', value: tipsCount },
      ].map((stat) => (
        <motion.div
          key={stat.label}
          className="text-center cursor-pointer"
          whileTap={{ scale: 0.97 }}
          onClick={stat.onClick}
        >
          <p className="text-xl font-black text-text-primary">
            {stat.value}
          </p>
          <p className="text-xs text-text-muted">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  )
}

// ── Main Profile Page ─────────────────────────────────
function ProfileContent() {
  const { user } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'moments' | 'tips' | 'experiences'>('moments')
  const [showEdit, setShowEdit] = useState(false)

  const { data: myMoments = [], isLoading: momentsLoading } = useQuery({
    queryKey: ['my-moments'],
    queryFn: momentsService.getMyMoments,
    staleTime: 1000 * 60 * 5,
  })

  const { data: myTips = [] } = useQuery({
    queryKey: ['my-tips'],
    queryFn: tipsService.getMyTips,
    staleTime: 1000 * 60 * 5,
  })

  const { data: myExps = [] } = useQuery({
    queryKey: ['my-experiences'],
    queryFn: experiencesService.getMyExperiences,
    staleTime: 1000 * 60 * 5,
    enabled: user?.role === 'LOCAL_GUIDE',
  })

  if (!user) return null

  const passport = user.passport_info
  const isGuide = user.role === 'LOCAL_GUIDE'

  const tabs = [
    { key: 'moments', label: 'Moments', icon: Grid3x3, count: myMoments.length },
    { key: 'tips', label: 'Tips', icon: Lightbulb, count: myTips.length },
    ...(isGuide
      ? [{ key: 'experiences', label: 'Uzoefu', icon: Star, count: myExps.length }]
      : []),
  ] as const

  return (
    <div className="min-h-dvh bg-bg-base overflow-y-auto no-scrollbar">
      {/* Cover */}
      <div
        className="relative h-40"
        style={{
          background: user.profile?.cover_photo_url
            ? undefined
            : 'linear-gradient(135deg, rgba(245,166,35,0.15), rgba(10,10,15,0.9))',
        }}
      >
        {user.profile?.cover_photo_url && (
          <Image
            src={mediaUrl(user.profile.cover_photo_url)}
            alt="cover"
            fill
            className="object-cover"
            unoptimized
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 50%, #0A0A0F 100%)',
          }}
        />
        <div
          className="absolute top-0 right-0 flex gap-2 p-4"
          style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}
        >
          <motion.button
            onClick={() => setShowEdit(true)}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 glass rounded-xl flex items-center justify-center"
          >
            <Edit2 size={15} className="text-white" />
          </motion.button>
          <motion.button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              toast.success('Link imekopwa!')
            }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 glass rounded-xl flex items-center justify-center"
          >
            <Share2 size={15} className="text-white" />
          </motion.button>
        </div>
      </div>

      {/* Avatar + Info */}
      <div className="px-5 -mt-10 relative z-10 pb-4">
        <div className="flex items-end justify-between mb-4">
          <KiliAvatar
            src={user.profile?.avatar_url}
            name={`${user.first_name} ${user.last_name}`}
            role={user.role}
            isVerified={user.is_verified}
            size="xl"
          />
          <div className="flex items-center gap-2">
            {passport && (
              <TrustScoreRing score={passport.trust_score} size="md" />
            )}
          </div>
        </div>

        {/* Name + badges */}
        <h1 className="text-xl font-black text-text-primary">
          {user.first_name} {user.last_name}
        </h1>
        <p className="text-text-muted text-sm mb-2">
          @{user.username}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <KiliBadge variant={user.role} size="sm" />
          {user.is_verified && (
            <KiliBadge variant="VERIFIED" size="sm" />
          )}
          {passport?.level && (
            <KiliBadge
              variant={passport.level as 'EXPLORER' | 'ADVENTURER' | 'GUARDIAN' | 'LEGEND'}
              size="sm"
            />
          )}
        </div>

        {/* Bio */}
        {user.profile?.bio && (
          <p className="text-text-secondary text-sm leading-relaxed mb-2">
            {user.profile.bio}
          </p>
        )}

        {/* Location + joined */}
        <div className="flex flex-wrap gap-4 text-xs text-text-muted mb-2">
          {user.profile?.location && (
            <div className="flex items-center gap-1">
              <MapPin size={11} />
              {user.profile.location}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar size={11} />
            {new Date(user.date_joined).toLocaleDateString('sw-TZ', {
              month: 'long', year: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <FollowStats
        userId={user.id}
        momentsCount={myMoments.length}
        tipsCount={myTips.length}
      />

      {/* Tabs */}
      <div className="flex border-b border-border-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
            style={{
              color: activeTab === tab.key ? 'var(--gold)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.key
                ? '2px solid var(--gold)'
                : '2px solid transparent',
            }}
          >
            <tab.icon size={16} />
            {tab.label}
            <span className="text-[10px]">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 pb-safe">
        <AnimatePresence mode="wait">
          {activeTab === 'moments' && (
            <motion.div
              key="moments"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-3 gap-1"
            >
              {momentsLoading
                ? [0,1,2,3,4,5].map((i) => (
                    <SkeletonCard key={i} className="aspect-square" rounded="sm" />
                  ))
                : myMoments.length === 0
                ? <EmptyState icon="📸" title="Hakuna moments bado" className="col-span-3" />
                : myMoments.map((m) => (
                    <motion.div
                      key={m.id}
                      className="aspect-square rounded-lg overflow-hidden relative bg-bg-elevated"
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
                    </motion.div>
                  ))}
            </motion.div>
          )}

          {activeTab === 'tips' && (
            <motion.div
              key="tips"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {myTips.length === 0 ? (
                <EmptyState icon="💡" title="Hakuna tips bado" />
              ) : (
                myTips.map((tip) => (
                  <div
                    key={tip.id}
                    className="rounded-2xl p-4"
                    style={{
                      background: 'rgba(26,26,36,0.8)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <p className="text-xs text-text-muted mb-1">
                      {tip.category}
                    </p>
                    <p className="text-sm font-bold text-text-primary">
                      {tip.title}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                      {tip.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-text-muted">
                        👍 {tip.upvotes}
                      </span>
                      {tip.is_verified && (
                        <span className="text-xs text-kili-green font-bold">
                          ✓ Imethibitishwa
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'experiences' && (
            <motion.div
              key="experiences"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {myExps.length === 0 ? (
                <EmptyState icon="⭐" title="Hakuna uzoefu bado" />
              ) : (
                myExps.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center gap-3 rounded-2xl p-3"
                    style={{
                      background: 'rgba(26,26,36,0.8)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    {exp.primary_image?.file_url ? (
                      <img
                        src={exp.primary_image.file_url}
                        alt={exp.title}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-bg-elevated flex items-center justify-center text-2xl flex-shrink-0">
                        ⭐
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {exp.title}
                      </p>
                      <p className="text-xs text-text-muted">{exp.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-muted">
                          👁️ {exp.views}
                        </span>
                        {exp.today_moment_active && (
                          <span className="text-xs text-kili-green font-bold">
                            ⚡ Leo!
                          </span>
                        )}
                        {exp.price_range && (
                          <span className="text-xs text-gold">
                            {exp.price_range}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit sheet */}
      {showEdit && (
        <EditProfileSheet
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          user={user}
        />
      )}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  )
}