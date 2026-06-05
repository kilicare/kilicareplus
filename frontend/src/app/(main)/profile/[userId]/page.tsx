'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  MapPin, Calendar, Grid3x3, Lightbulb, Star,
  ChevronLeft, UserPlus, UserCheck, MessageSquare, Award, Crown,
} from 'lucide-react'
import type { User } from '@/types'
import { useAuthStore } from '@/stores/auth.store'
import { followService } from '@/services/follow.service'
import { momentsService } from '@/services/moments.service'
import { tipsService } from '@/services/tips.service'
import { experiencesService } from '@/services/experiences.service'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliBadge } from '@/components/ui/KiliBadge'
import { TrustScoreRing } from '@/components/ui/TrustScoreRing'
import { KiliButton } from '@/components/ui/KiliButton'
import { KiliBottomSheet } from '@/components/ui/KiliBottomSheet'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { mediaUrl, parseApiError } from '@/lib/utils'
import Image from 'next/image'
import { Suspense } from 'react'
import api from '@/core/api/axios'

interface PublicProfile {
  id: number
  username: string
  first_name: string
  last_name: string
  role: string
  is_verified: boolean
  bio: string
  avatar_url: string | null
  location: string
  trust_score: number
  level: string
  points: number
  followers_count: number
  following_count: number
  moments_count: number
  tips_count: number
  date_joined: string
}

// ── Follow Stats ─────────────────────────────────────
function FollowStats({
  userId,
  momentsCount,
  tipsCount,
  followersCount,
  followingCount,
  onShowFollowers,
  onShowFollowing,
}: {
  userId: number
  momentsCount: number
  tipsCount: number
  followersCount: number
  followingCount: number
  onShowFollowers: () => void
  onShowFollowing: () => void
}) {
  return (
    <div className="flex items-center gap-6 justify-center py-4 border-y border-white/10">
      {[
        { label: 'Moments', value: momentsCount, icon: Grid3x3, color: '#F5A623' },
        {
          label: 'Wafuasi',
          value: followersCount,
          onClick: onShowFollowers,
          icon: UserPlus,
          color: '#3B82F6',
        },
        {
          label: 'Wanaofuata',
          value: followingCount,
          onClick: onShowFollowing,
          icon: UserCheck,
          color: '#10B981',
        },
        { label: 'Tips', value: tipsCount, icon: Lightbulb, color: '#8B5CF6' },
      ].map((stat, i) => (
        <motion.div
          key={stat.label}
          className="text-center cursor-pointer"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={stat.onClick}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <stat.icon size={14} style={{ color: stat.color }} />
            <p className="text-xl font-black text-text-primary">
              {stat.value}
            </p>
          </div>
          <p className="text-xs text-text-muted">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  )
}

// ── Followers/Following Modal ─────────────────────────
function FollowListModal({
  isOpen,
  onClose,
  title,
  userId,
  type,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  userId: number
  type: 'followers' | 'following'
}) {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['follow-list', userId, type],
    queryFn: () => type === 'followers' ? followService.getFollowers(userId) : followService.getFollowing(userId),
    enabled: isOpen,
  })

  return (
    <KiliBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <div className="p-5 space-y-3">
        {isLoading ? (
          [0,1,2,3].map((i) => (
            <SkeletonCard key={i} className="h-16" rounded="xl" />
          ))
        ) : users.length === 0 ? (
          <EmptyState icon="👥" title="Hakuna watumiaji" />
        ) : (
          users.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-2xl relative overflow-hidden"
              style={{
                background: 'rgba(26,26,36,0.8)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              whileHover={{ scale: 1.02, borderColor: 'rgba(245,166,35,0.3)' }}
            >
              <div className="absolute top-0 right-0 w-12 h-12 rounded-full blur-2xl opacity-10"
                style={{ background: 'radial-gradient(circle, #F5A623, rgba(245,166,35,0))' }}
              />
              <KiliAvatar
                src={user.avatar}
                name={user.first_name}
                role={user.role as any}
                isVerified={user.is_verified}
                size="md"
              />
              <div className="flex-1 min-w-0 relative z-10">
                <p className="text-sm font-bold text-text-primary truncate">
                  {user.first_name}
                </p>
                <p className="text-xs text-text-muted">@{user.username}</p>
              </div>
              {user.is_following && (
                <UserCheck size={16} className="text-green-400 relative z-10" />
              )}
            </motion.div>
          ))
        )}
      </div>
    </KiliBottomSheet>
  )
}

// ── Main Profile Page ─────────────────────────────────
function ProfileContent() {
  const { user: currentUser } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'moments' | 'tips' | 'experiences'>('moments')
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)

  const userId = params.userId as string

  // Fetch public profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      const { data } = await api.get<PublicProfile>(`/auth/users/${userId}/profile/`)
      return data
    },
    enabled: !!userId,
  })

  // Check follow status
  const { data: followData } = useQuery({
    queryKey: ['follow-check', userId],
    queryFn: () => followService.checkFollow(parseInt(userId)),
    enabled: !!userId && currentUser?.id !== parseInt(userId),
  })

  // Toggle follow mutation
  const followMut = useMutation({
    mutationFn: () => followService.toggleFollow(parseInt(userId)),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['follow-check', userId] })
      qc.invalidateQueries({ queryKey: ['public-profile', userId] })
      toast.success(data.following ? 'Unafuata sasa!' : 'Umefuta kufuata')
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  // For now, use counts from profile data
  // Individual content fetching would require backend endpoints
  const userMoments: any[] = []
  const userTips: any[] = []
  const userExps: any[] = []
  const momentsLoading = false

  if (profileLoading) {
    return (
      <div className="min-h-dvh bg-bg-base p-5">
        <SkeletonCard className="h-40 rounded-2xl mb-4" />
        <div className="flex gap-4 mb-4">
          <SkeletonCard className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonCard className="h-6 w-1/2" />
            <SkeletonCard className="h-4 w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-dvh bg-bg-base flex items-center justify-center p-5">
        <EmptyState icon="👤" title="Mtumiaji haukupatikana" />
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === profile.id
  const isGuide = profile.role === 'LOCAL_GUIDE'

  const tabs = [
    { key: 'moments', label: 'Moments', icon: Grid3x3, count: userMoments.length },
    { key: 'tips', label: 'Tips', icon: Lightbulb, count: userTips.length },
    ...(isGuide
      ? [{ key: 'experiences', label: 'Uzoefu', icon: Star, count: userExps.length }]
      : []),
  ] as const

  return (
    <div className="min-h-dvh bg-bg-base overflow-y-auto no-scrollbar">
      {/* Header */}
      <motion.div
        className="sticky top-0 z-10 px-5 py-4 border-b flex items-center gap-3"
        style={{
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.1)',
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button
          onClick={() => router.back()}
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          whileHover={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <ChevronLeft size={18} className="text-white relative z-10" />
        </motion.button>
        <h1 className="text-xl font-black text-text-primary flex-1">
          {profile.first_name} {profile.last_name}
        </h1>
      </motion.div>

      {/* Cover */}
      <motion.div
        className="relative h-40 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-purple/10 to-bg-base" />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 50%, #0A0A0F 100%)',
          }}
        />
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #F5A623, rgba(245,166,35,0))' }}
        />
      </motion.div>

      {/* Avatar + Info */}
      <motion.div
        className="px-5 -mt-10 relative z-10 pb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-end justify-between mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          >
            <KiliAvatar
              src={profile.avatar_url}
              name={`${profile.first_name} ${profile.last_name}`}
              role={profile.role as any}
              isVerified={profile.is_verified}
              size="xl"
            />
          </motion.div>
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 300 }}
            >
              <TrustScoreRing score={profile.trust_score} size="md" />
            </motion.div>
            {!isOwnProfile && (
              <KiliButton
                variant={followData?.is_following ? 'outline' : 'primary'}
                size="sm"
                icon={followData?.is_following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                loading={followMut.isPending}
                onClick={() => followMut.mutate()}
              >
                {followData?.is_following ? 'Unafuata' : 'Fuatilia'}
              </KiliButton>
            )}
          </div>
        </div>

        {/* Name + badges */}
        <h1 className="text-xl font-black text-text-primary mb-1">
          {profile.first_name} {profile.last_name}
        </h1>
        <p className="text-text-muted text-sm mb-3">
          @{profile.username}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <KiliBadge variant={profile.role as any} size="sm" />
          {profile.is_verified && (
            <KiliBadge variant="VERIFIED" size="sm" />
          )}
          <KiliBadge
            variant={profile.level as 'EXPLORER' | 'ADVENTURER' | 'GUARDIAN' | 'LEGEND'}
            size="sm"
          />
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-text-secondary text-sm leading-relaxed mb-3">
            {profile.bio}
          </p>
        )}

        {/* Location + joined */}
        <div className="flex flex-wrap gap-4 text-xs text-text-muted mb-2">
          {profile.location && (
            <div className="flex items-center gap-1" style={{ color: '#F5A623' }}>
              <MapPin size={11} />
              {profile.location}
            </div>
          )}
          <div className="flex items-center gap-1" style={{ color: '#3B82F6' }}>
            <Calendar size={11} />
            {new Date(profile.date_joined).toLocaleDateString('sw-TZ', {
              month: 'long', year: 'numeric',
            })}
          </div>
        </div>

        {/* Points */}
        <motion.div
          className="flex items-center gap-2 mt-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Award size={14} className="text-gold" />
          <span className="text-sm font-bold text-gold">{profile.points} points</span>
          {profile.level === 'LEGEND' && (
            <Crown size={14} className="text-purple-400" />
          )}
        </motion.div>
      </motion.div>

      {/* Stats */}
      <FollowStats
        userId={profile.id}
        momentsCount={profile.moments_count}
        tipsCount={profile.tips_count}
        followersCount={profile.followers_count}
        followingCount={profile.following_count}
        onShowFollowers={() => setShowFollowers(true)}
        onShowFollowing={() => setShowFollowing(true)}
      />

      {/* Tabs */}
      <motion.div
        className="flex border-b border-white/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {tabs.map((tab, i) => (
          <motion.button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + (i * 0.05) }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <tab.icon
              size={16}
              style={{ color: activeTab === tab.key ? '#F5A623' : '#8B8BA7' }}
            />
            <span style={{ color: activeTab === tab.key ? '#F5A623' : '#8B8BA7' }}>
              {tab.label}
            </span>
            <span className="text-[10px] text-text-muted">({tab.count})</span>
            {activeTab === tab.key && (
              <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: '#F5A623' }}
                layoutId="activeTab"
              />
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* Content */}
      <div className="p-4 pb-safe">
        <AnimatePresence mode="wait">
          {activeTab === 'moments' && (
            <motion.div
              key="moments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-3 gap-1.5"
            >
              {momentsLoading
                ? [0,1,2,3,4,5].map((i) => (
                    <SkeletonCard key={i} className="aspect-square" rounded="sm" />
                  ))
                : userMoments.length === 0
                ? <EmptyState icon="📸" title="Hakuna moments bado" className="col-span-3" />
                : userMoments.map((m: any, i) => (
                    <motion.div
                      key={m.id}
                      className="aspect-square rounded-xl overflow-hidden relative bg-bg-elevated"
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ scale: 1.05, zIndex: 10 }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {userTips.length === 0 ? (
                <EmptyState icon="💡" title="Hakuna tips bado" />
              ) : (
                userTips.map((tip: any, i) => (
                  <motion.div
                    key={tip.id}
                    className="rounded-2xl p-4 relative overflow-hidden"
                    style={{
                      background: 'rgba(26,26,36,0.8)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                    whileHover={{ scale: 1.02, borderColor: 'rgba(245,166,35,0.3)' }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-10"
                      style={{ background: 'radial-gradient(circle, #F5A623, rgba(245,166,35,0))' }}
                    />
                    <div className="relative z-10">
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
                          <span className="text-xs text-green-400 font-bold">
                            ✓ Imethibitishwa
                          </span>
                        )}
                      </div>
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
              className="space-y-3"
            >
              {userExps.length === 0 ? (
                <EmptyState icon="⭐" title="Hakuna uzoefu bado" />
              ) : (
                userExps.map((exp: any, i) => (
                  <motion.div
                    key={exp.id}
                    className="flex items-center gap-3 rounded-2xl p-3 relative overflow-hidden"
                    style={{
                      background: 'rgba(26,26,36,0.8)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                    whileHover={{ scale: 1.02, borderColor: 'rgba(245,166,35,0.3)' }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-10"
                      style={{ background: 'radial-gradient(circle, #F5A623, rgba(245,166,35,0))' }}
                    />
                    {exp.primary_image?.file_url ? (
                      <img
                        src={exp.primary_image.file_url}
                        alt={exp.title}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 relative z-10"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-bg-elevated flex items-center justify-center text-2xl flex-shrink-0 relative z-10">
                        ⭐
                      </div>
                    )}
                    <div className="flex-1 min-w-0 relative z-10">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {exp.title}
                      </p>
                      <p className="text-xs text-text-muted">{exp.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-muted">
                          👁️ {exp.views}
                        </span>
                        {exp.today_moment_active && (
                          <span className="text-xs text-green-400 font-bold">
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
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <FollowListModal
        isOpen={showFollowers}
        onClose={() => setShowFollowers(false)}
        title="Wafuasi"
        userId={profile.id}
        type="followers"
      />
      <FollowListModal
        isOpen={showFollowing}
        onClose={() => setShowFollowing(false)}
        title="Wanaofuata"
        userId={profile.id}
        type="following"
      />
    </div>
  )
}

export default function UserProfilePage() {
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  )
}
