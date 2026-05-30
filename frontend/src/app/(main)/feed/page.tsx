'use client'
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Heart, MessageCircle, Bookmark, Share2, Plus,
  Volume2, VolumeX, MapPin, Flame,
} from 'lucide-react'
import { momentsService, type Moment, type Comment } from '@/services/moments.service'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliBadge } from '@/components/ui/KiliBadge'
import { TrustScoreRing } from '@/components/ui/TrustScoreRing'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { KiliBottomSheet } from '@/components/ui/KiliBottomSheet'
import { KiliButton } from '@/components/ui/KiliButton'
import { mediaUrl, timeAgo, formatCount, vibrate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import Image from 'next/image'

// ── Heart burst animation ───────────────────────────
function HeartBurst({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="fixed z-50 pointer-events-none"
      style={{ left: x - 40, top: y - 40 }}
      initial={{ opacity: 1, scale: 0.5 }}
      animate={{ opacity: 0, scale: 2 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="text-5xl">❤️</div>
    </motion.div>
  )
}

// ── Comment Sheet ───────────────────────────────────
function CommentSheet({
  momentId,
  isOpen,
  onClose,
}: {
  momentId: number | null
  isOpen: boolean
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: comments = { pages: [] } } = useInfiniteQuery({
    queryKey: ['comments', momentId],
    queryFn: () => momentsService.getComments(momentId!),
    initialPageParam: 1,
    getNextPageParam: () => null,
    enabled: isOpen && !!momentId,
  })

  const commentMut = useMutation({
    mutationFn: () => momentsService.comment(momentId!, text.trim()),
    onSuccess: () => {
      setText('')
      qc.invalidateQueries({ queryKey: ['comments', momentId] })
      qc.invalidateQueries({ queryKey: ['feed'] })
    },
    onError: () => toast.error('Imeshindwa kutuma maoni'),
  })

  const allComments = (comments.pages ?? []).flat()

  return (
    <KiliBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="💬 Maoni"
      height="75"
    >
      <div className="flex flex-col h-full">
        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {allComments.length === 0 ? (
            <EmptyState
              icon="💬"
              title="Hakuna maoni bado"
              subtitle="Kuwa wa kwanza kutoa maoni!"
            />
          ) : (
            allComments.map((c: Comment) => (
              <motion.div
                key={c.id}
                className="flex items-start gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <KiliAvatar
                  src={c.avatar_url}
                  name={c.username}
                  size="sm"
                />
                <div
                  className="flex-1 p-3 rounded-2xl"
                  style={{ background: 'rgba(26,26,36,0.8)' }}
                >
                  <p className="text-xs font-bold text-gold mb-1">
                    @{c.username}
                  </p>
                  <p className="text-sm text-text-primary">{c.text}</p>
                  <p className="text-[10px] text-text-muted mt-1">
                    {timeAgo(c.created_at)}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Input */}
        <div
          className="flex-shrink-0 flex items-center gap-3 p-4 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <KiliAvatar
            src={user?.profile?.avatar_url}
            name={`${user?.first_name} ${user?.last_name}`}
            size="sm"
          />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Andika maoni..."
            className="flex-1 bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-gold"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) {
                commentMut.mutate()
              }
            }}
          />
          <KiliButton
            size="sm"
            disabled={!text.trim() || commentMut.isPending}
            onClick={() => commentMut.mutate()}
          >
            Tuma
          </KiliButton>
        </div>
      </div>
    </KiliBottomSheet>
  )
}

// ── Create Moment Sheet ─────────────────────────────
function CreateMomentSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const createMut = useMutation({
    mutationFn: () => {
      const form = new FormData()
      form.append('media', file!)
      form.append('media_type', file!.type.startsWith('video') ? 'video' : 'image')
      if (caption) form.append('caption', caption)
      if (location) form.append('location', location)
      return momentsService.create(form)
    },
    onSuccess: () => {
      toast.success('Moment imechapishwa! 🎉')
      qc.invalidateQueries({ queryKey: ['feed'] })
      setFile(null)
      setPreview(null)
      setCaption('')
      setLocation('')
      onClose()
    },
    onError: () => toast.error('Imeshindwa kuchapisha'),
  })

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 50 * 1024 * 1024) {
      toast.error('Faili lazima iwe chini ya 50MB')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  return (
    <KiliBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="📸 Chapisha Moment"
      height="90"
    >
      <div className="p-5 space-y-4">
        {/* Media picker */}
        {!preview ? (
          <motion.div
            className="rounded-3xl border-2 border-dashed flex flex-col items-center justify-center py-16 cursor-pointer"
            style={{ borderColor: 'var(--border-gold)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileRef.current?.click()}
          >
            <div className="text-5xl mb-3">📸</div>
            <p className="text-text-primary font-bold">
              Chagua Picha au Video
            </p>
            <p className="text-text-muted text-sm mt-1">
              PNG, JPG, MP4 — max 50MB
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFile}
            />
          </motion.div>
        ) : (
          <div className="relative rounded-3xl overflow-hidden aspect-square">
            {file?.type.startsWith('video') ? (
              <video
                src={preview}
                className="w-full h-full object-cover"
                controls
              />
            ) : (
              <Image
                src={preview}
                alt="preview"
                fill
                className="object-cover"
                unoptimized
              />
            )}
            <button
              onClick={() => { setFile(null); setPreview(null) }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white text-lg"
            >
              ✕
            </button>
          </div>
        )}

        {/* Caption */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Andika kitu kuhusu moment hii... #Tanzania"
          rows={3}
          maxLength={500}
          className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold resize-none"
        />

        {/* Location */}
        <div className="flex items-center gap-2 bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3">
          <MapPin size={16} className="text-gold flex-shrink-0" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Mahali — mf. Zanzibar, Tanzania"
            className="flex-1 bg-transparent text-sm text-text-primary outline-none"
          />
        </div>

        <KiliButton
          fullWidth
          size="lg"
          loading={createMut.isPending}
          disabled={!file}
          onClick={() => createMut.mutate()}
        >
          Chapisha Moment 🌍
        </KiliButton>
      </div>
    </KiliBottomSheet>
  )
}

// ── Moment Card ─────────────────────────────────────
function MomentCard({
  moment,
  onComment,
}: {
  moment: Moment
  onComment: (id: number) => void
}) {
  const qc = useQueryClient()
  const [muted, setMuted] = useState(true)
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([])
  const [localLiked, setLocalLiked] = useState(moment.is_liked)
  const [localLikes, setLocalLikes] = useState(moment.like_count)
  const [localSaved, setLocalSaved] = useState(moment.is_saved)
  const lastTap = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const likeMut = useMutation({
    mutationFn: () => momentsService.like(moment.id),
    onMutate: () => {
      const newLiked = !localLiked
      setLocalLiked(newLiked)
      setLocalLikes((c) => newLiked ? c + 1 : c - 1)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  })

  const saveMut = useMutation({
    mutationFn: () => momentsService.save(moment.id),
    onMutate: () => setLocalSaved((s) => !s),
    onSettled: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  })

  const handleDoubleTap = useCallback((e: React.MouseEvent) => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      // Double tap
      vibrate(10)
      const { clientX: x, clientY: y } = e
      const id = Date.now()
      setHearts((prev) => [...prev, { id, x, y }])
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== id))
      }, 700)
      if (!localLiked) likeMut.mutate()
    }
    lastTap.current = now
  }, [localLiked, likeMut])

  const shareUrl = `${window.location.origin}/moments/${moment.id}`

  return (
    <div
      className="relative snap-start flex-shrink-0"
      style={{ height: '100dvh', width: '100%' }}
    >
      {/* Media */}
      <div
        className="absolute inset-0 bg-black"
        onClick={handleDoubleTap}
      >
        {moment.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={moment.media_url || mediaUrl(moment.media)}
            className="w-full h-full object-cover"
            loop
            muted={muted}
            playsInline
            autoPlay
          />
        ) : (
          <Image
            src={moment.media_url || mediaUrl(moment.media) || '/placeholder.jpg'}
            alt={moment.caption || 'Moment'}
            fill
            className="object-cover"
            unoptimized
            priority
          />
        )}
      </div>

      {/* Heart bursts */}
      {hearts.map((h) => (
        <HeartBurst key={h.id} x={h.x} y={h.y} />
      ))}

      {/* Top gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'var(--gradient-hero)' }}
      />

      {/* Bottom gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
        style={{ background: 'var(--gradient-card)' }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 pt-safe flex items-start justify-between px-4 pt-4">
        {/* User info */}
        <div className="flex items-center gap-3">
          <KiliAvatar
            src={moment.posted_by_avatar}
            name={moment.posted_by_username}
            role={moment.posted_by_role}
            isVerified={moment.posted_by_verified}
            size="md"
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white">
                @{moment.posted_by_username}
              </p>
              <KiliBadge
                variant={moment.posted_by_role as 'TOURIST' | 'LOCAL_GUIDE'}
                size="xs"
                showEmoji={false}
              />
            </div>
            <TrustScoreRing
              score={moment.trust_score}
              size="xs"
              showNumber={false}
            />
          </div>
        </div>

        {/* Mute toggle for video */}
        {moment.media_type === 'video' && (
          <motion.button
            onClick={() => setMuted(!muted)}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full glass flex items-center justify-center"
          >
            {muted ? (
              <VolumeX size={18} className="text-white" />
            ) : (
              <Volume2 size={18} className="text-white" />
            )}
          </motion.button>
        )}
      </div>

      {/* Right actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5">
        {/* Like */}
        <motion.button
          onClick={() => { vibrate(10); likeMut.mutate() }}
          whileTap={{ scale: 0.8 }}
          className="flex flex-col items-center gap-1"
        >
          <motion.div
            animate={localLiked ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Heart
              size={30}
              fill={localLiked ? '#FF2D2D' : 'none'}
              className={localLiked ? 'text-kili-red' : 'text-white'}
              strokeWidth={localLiked ? 0 : 2}
            />
          </motion.div>
          <span className="text-white text-xs font-bold">
            {formatCount(localLikes)}
          </span>
        </motion.button>

        {/* Comment */}
        <motion.button
          onClick={() => onComment(moment.id)}
          whileTap={{ scale: 0.8 }}
          className="flex flex-col items-center gap-1"
        >
          <MessageCircle size={30} className="text-white" />
          <span className="text-white text-xs font-bold">
            {formatCount(moment.comment_count)}
          </span>
        </motion.button>

        {/* Save */}
        <motion.button
          onClick={() => saveMut.mutate()}
          whileTap={{ scale: 0.8 }}
          className="flex flex-col items-center gap-1"
        >
          <Bookmark
            size={28}
            fill={localSaved ? '#F5A623' : 'none'}
            className={localSaved ? 'text-gold' : 'text-white'}
          />
          <span className="text-white text-xs font-bold">Save</span>
        </motion.button>

        {/* Share */}
        <motion.button
          onClick={() => {
            navigator.share?.({ url: shareUrl }).catch(() => {
              navigator.clipboard.writeText(shareUrl)
              toast.success('Link imekopwa!')
            })
          }}
          whileTap={{ scale: 0.8 }}
          className="flex flex-col items-center gap-1"
        >
          <Share2 size={28} className="text-white" />
          <span className="text-white text-xs font-bold">Share</span>
        </motion.button>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 pb-nav px-4 pb-24">
        {/* Trending badge */}
        {moment.trending_score > 50 && (
          <div className="flex items-center gap-1.5 mb-3">
            <div
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(245,166,35,0.2)',
                border: '1px solid rgba(245,166,35,0.4)',
                color: '#F5A623',
              }}
            >
              <Flame size={12} />
              Inayoongoza
            </div>
          </div>
        )}

        {/* Caption */}
        {moment.caption && (
          <p className="text-white text-sm leading-relaxed mb-2 max-w-xs">
            {moment.caption.length > 120
              ? `${moment.caption.slice(0, 120)}...`
              : moment.caption}
          </p>
        )}

        {/* Location */}
        {moment.location && (
          <div className="flex items-center gap-1.5 text-white/80 text-xs mb-2">
            <MapPin size={12} />
            {moment.location}
          </div>
        )}

        {/* Time */}
        <p className="text-white/60 text-xs">{timeAgo(moment.created_at)}</p>
      </div>
    </div>
  )
}

// ── Main Feed Page ──────────────────────────────────
export default function FeedPage() {
  const [activeComment, setActiveComment] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const { user } = useAuthStore()

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 1 }) => momentsService.getFeed(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.has_next ? last.page + 1 : undefined,
    staleTime: 1000 * 60 * 2,
  })

  const moments = data?.pages.flatMap((p) => p.results) ?? []

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-black flex flex-col">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-shrink-0"
            style={{ height: '100dvh' }}
          >
            <SkeletonCard className="w-full h-full" rounded="sm" />
          </div>
        ))}
      </div>
    )
  }

  if (moments.length === 0) {
    return (
      <div className="min-h-dvh bg-bg-base flex items-center justify-center pb-safe">
        <div className="text-center">
          <EmptyState
            icon="📸"
            title="Hakuna moments bado"
            subtitle="Kuwa wa kwanza kushiriki Tanzania yako!"
            actionLabel="Chapisha Moment"
            onAction={() => setShowCreate(true)}
          />
          <CreateMomentSheet
            isOpen={showCreate}
            onClose={() => setShowCreate(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-black">
      {/* Feed container */}
      <div
        className="snap-y-mandatory overflow-y-scroll"
        style={{ height: '100dvh' }}
        onScroll={(e) => {
          const el = e.currentTarget
          const nearBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 200
          if (nearBottom && hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
          }
        }}
      >
        {moments.map((moment) => (
          <MomentCard
            key={moment.id}
            moment={moment}
            onComment={(id) => setActiveComment(id)}
          />
        ))}

        {isFetchingNextPage && (
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{ height: '100dvh' }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      {/* Create FAB */}
      <motion.button
        onClick={() => setShowCreate(true)}
        whileTap={{ scale: 0.88 }}
        className="fixed bottom-24 right-4 z-30 w-14 h-14 rounded-2xl flex items-center justify-center shadow-gold"
        style={{ background: 'var(--gradient-gold)' }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Plus size={24} className="text-black" strokeWidth={2.5} />
      </motion.button>

      {/* Sheets */}
      <CommentSheet
        momentId={activeComment}
        isOpen={!!activeComment}
        onClose={() => setActiveComment(null)}
      />
      <CreateMomentSheet
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  )
}