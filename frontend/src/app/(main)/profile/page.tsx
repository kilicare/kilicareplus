'use client'
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Force dynamic rendering to prevent static pre-rendering during build
// This ensures auth state is evaluated at runtime, not build time
export const dynamic = 'force-dynamic'
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
    username: user.username || '',
    email: user.email || '',
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
      fd.append('username', form.username)
      fd.append('email', form.email)
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
      title=""
      height="full"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-xl font-bold text-text-primary">Edit Profile</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Avatar picker */}
          <div className="flex justify-center">
            <div className="relative">
              {avatarPreview ? (
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gold/30">
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <KiliAvatar
                  src={user.profile?.avatar_url}
                  name={`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'User'}
                  role={user.role}
                  isVerified={user.is_verified}
                  size="xl"
                />
              )}
              <motion.button
                onClick={() => fileRef.current?.click()}
                whileTap={{ scale: 0.9 }}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-xl bg-gradient-to-br from-gold-dim to-gold flex items-center justify-center shadow-lg shadow-gold/30"
              >
                <Camera size={18} className="text-black" />
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Username</label>
            <input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="Your username"
              className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="your@email.com"
              className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">First Name</label>
            <input
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              placeholder="Your first name"
              className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Last Name</label>
            <input
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              placeholder="Your last name"
              className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              rows={4}
              maxLength={300}
              className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 resize-none transition-all"
            />
            <div className="flex justify-between text-xs text-text-muted">
              <span>Share your story</span>
              <span>{form.bio.length}/300</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Location</label>
            <div className="flex items-center gap-3 bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/20 transition-all">
              <MapPin size={18} className="text-gold flex-shrink-0" />
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Dar es Salaam, Tanzania"
                className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle bg-bg-elevated">
          <KiliButton
            fullWidth
            size="lg"
            loading={mut.isPending}
            onClick={() => mut.mutate()}
            className="!rounded-2xl"
          >
            {mut.isPending ? 'Saving...' : 'Save Changes'}
          </KiliButton>
        </div>
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
    <div className="flex items-center gap-4 justify-center py-4">
      {[
        { label: 'Moments', value: momentsCount },
        {
          label: 'Followers',
          value: followData?.followers_count ?? 0,
          onClick: () => setShowFollowers(true),
        },
        {
          label: 'Following',
          value: followData?.following_count ?? 0,
          onClick: () => setShowFollowing(true),
        },
        { label: 'Tips', value: tipsCount },
      ].map((stat) => (
        <motion.div
          key={stat.label}
          className="text-center cursor-pointer group"
          whileTap={{ scale: 0.97 }}
          onClick={stat.onClick}
        >
          <p className="text-2xl font-black text-text-primary group-hover:text-gold transition-colors">
            {stat.value}
          </p>
          <p className="text-xs text-text-muted group-hover:text-text-primary transition-colors">{stat.label}</p>
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
      <div className="relative h-48">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-bg-base to-bg-base" />
        {user.profile?.cover_photo_url && (
          <Image
            src={mediaUrl(user.profile.cover_photo_url)}
            alt="cover"
            fill
            className="object-cover"
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg-base" />
        <div className="absolute top-0 right-0 flex gap-2 p-4" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}>
          <motion.button
            onClick={() => setShowEdit(true)}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <Edit2 size={18} />
          </motion.button>
          <motion.button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              toast.success('Link copied!')
            }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <Share2 size={18} />
          </motion.button>
        </div>
      </div>

      {/* Avatar + Info */}
      <div className="px-5 -mt-16 relative z-10 pb-4">
        <div className="flex items-end justify-between mb-4">
          <div className="relative">
            <KiliAvatar
              src={user.profile?.avatar_url}
              name={`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'User'}
              role={user.role}
              isVerified={user.is_verified}
              size="xl"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-gold-dim to-gold flex items-center justify-center shadow-lg shadow-gold/30">
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {passport && (
              <TrustScoreRing score={passport.trust_score} size="md" />
            )}
          </div>
        </div>

        {/* Name + badges */}
        <h1 className="text-2xl font-black text-text-primary mb-1">
          {user.first_name} {user.last_name}
        </h1>
        <p className="text-gold text-sm font-medium mb-3">
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
          <p className="text-text-secondary text-sm leading-relaxed mb-3">
            {user.profile.bio}
          </p>
        )}

        {/* Location + joined */}
        <div className="flex flex-wrap gap-4 text-xs text-text-muted">
          {user.profile?.location && (
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="text-gold" />
              <span className="text-text-primary">{user.profile.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-gold" />
            <span className="text-text-primary">
              Joined {new Date(user.date_joined).toLocaleDateString('en-US', {
                month: 'short', year: 'numeric',
              })}
            </span>
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
      <div className="flex border-b border-border-subtle bg-bg-elevated/50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className="flex-1 flex flex-col items-center gap-1.5 py-4 text-sm font-medium transition-all relative"
          >
            <tab.icon size={18} className={activeTab === tab.key ? 'text-gold' : 'text-text-muted'} />
            <span className={activeTab === tab.key ? 'text-text-primary' : 'text-text-muted'}>{tab.label}</span>
            <span className={`text-xs ${activeTab === tab.key ? 'text-gold font-bold' : 'text-text-muted'}`}>({tab.count})</span>
            {activeTab === tab.key && (
              <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-gold-dim to-gold rounded-full"
                layoutId="profile-activeTab"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 pb-safe">
        <AnimatePresence mode="wait">
          {activeTab === 'moments' && (
            <motion.div
              key="moments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-3 gap-2"
            >
              {momentsLoading
                ? [0,1,2,3,4,5].map((i) => (
                    <SkeletonCard key={i} className="aspect-square" rounded="xl" />
                  ))
                : myMoments.length === 0
                ? <EmptyState icon="📸" title="No moments yet" className="col-span-3" />
                : myMoments.map((m) => {
                    const primaryMedia = m.media_items?.find((item: any) => item.media_type !== 'audio') || m.media_items?.[0]
                    const mediaUrl = primaryMedia?.url
                    const isVideo = primaryMedia?.media_type === 'video'
                    return (
                      <motion.div
                        key={m.id}
                        className="aspect-square rounded-2xl overflow-hidden relative bg-bg-elevated"
                        whileTap={{ scale: 0.95 }}
                      >
                        {mediaUrl && isVideo ? (
                          <video
                            src={mediaUrl}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted
                            loop
                            playsInline
                          />
                        ) : mediaUrl ? (
                          <Image
                            src={mediaUrl}
                            alt={m.caption || ''}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </motion.div>
                    )
                  })}
            </motion.div>
          )}

          {activeTab === 'tips' && (
            <motion.div
              key="tips"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {myTips.length === 0 ? (
                <EmptyState icon="💡" title="No tips yet" />
              ) : (
                myTips.map((tip) => (
                  <motion.div
                    key={tip.id}
                    className="rounded-2xl p-4 bg-bg-elevated border border-border-subtle"
                    whileTap={{ scale: 0.98 }}
                  >
                    <p className="text-xs text-gold font-medium mb-1">{tip.category}</p>
                    <p className="text-sm font-bold text-text-primary">{tip.title}</p>
                    <p className="text-xs text-text-muted mt-1.5 line-clamp-2">{tip.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        👍 {tip.upvotes}
                      </span>
                      {tip.is_verified && (
                        <span className="text-xs text-gold font-bold flex items-center gap-1">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'experiences' && (
            <motion.div
              key="experiences"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {myExps.length === 0 ? (
                <EmptyState icon="⭐" title="No experiences yet" />
              ) : (
                myExps.map((exp) => (
                  <motion.div
                    key={exp.id}
                    className="flex items-center gap-3 rounded-2xl p-4 bg-bg-elevated border border-border-subtle"
                    whileTap={{ scale: 0.98 }}
                  >
                    {exp.primary_image?.file_url ? (
                      <img
                        src={exp.primary_image.file_url}
                        alt={exp.title}
                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gold-dim to-gold/20 flex items-center justify-center text-3xl flex-shrink-0">
                        ⭐
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{exp.title}</p>
                      <p className="text-xs text-gold mt-0.5">{exp.category}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          👁️ {exp.views}
                        </span>
                        {exp.today_moment_active && (
                          <span className="text-xs text-gold font-bold flex items-center gap-1">
                            ⚡ Today
                          </span>
                        )}
                        {exp.price_range && (
                          <span className="text-xs text-gold font-bold">{exp.price_range}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
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