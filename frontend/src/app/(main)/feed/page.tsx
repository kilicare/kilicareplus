'use client'
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Heart, Bot, Bookmark, Share2, Plus,
  Volume2, VolumeX, MapPin, Flame, Music, Trash2,
} from 'lucide-react'
import { momentsService, type Moment } from '@/services/moments.service'
import { aiService } from '@/services/ai.service'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliBadge } from '@/components/ui/KiliBadge'
import { TrustScoreRing } from '@/components/ui/TrustScoreRing'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { KiliBottomSheet } from '@/components/ui/KiliBottomSheet'
import { KiliButton } from '@/components/ui/KiliButton'
import { mediaUrl, timeAgo, formatCount, vibrate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { useAudio } from '@/hooks/useAudio'
import { useFeedAudio } from '@/hooks/useFeedAudio'
import { useInViewport } from '@/hooks/useInViewport'
import { useFeedSession } from '@/hooks/useFeedSession'
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

// ── AI Chat Sheet ───────────────────────────────────
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

function AIChatSheet({
  moment,
  isOpen,
  onClose,
}: {
  moment: Moment | null
  isOpen: boolean
  onClose: () => void
}) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize with context message when moment changes
  useEffect(() => {
    if (isOpen && moment) {
      setMessages([
        {
          id: 'context',
          role: 'assistant',
          content: `🤖 Karibu! Mimi ni AI Travel Assistant yako. Ninaelewa kuhusu post hili: "${moment.caption || 'Post bila caption'}" kutoka ${moment.location || 'Tanzania'}. Unaweza kuuliza maswali yoyote kuhusu eneo hili, usafiri, au mahitaji yako!`,
          timestamp: new Date(),
        },
      ])
      setThreadId(null) // Reset thread ID for new moment
    }
  }, [isOpen, moment])

  const [threadId, setThreadId] = useState<number | null>(null)

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const userText = input.trim()
    setInput('')
    setIsLoading(true)

    let aiResponseText = ''

    try {
      await aiService.streamChat(
        userText,
        threadId,
        'sw',
        (chunk) => {
          aiResponseText += chunk
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1]
            if (lastMsg?.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...lastMsg, content: aiResponseText },
              ]
            }
            return [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'assistant',
                content: aiResponseText,
                timestamp: new Date(),
              },
            ]
          })
        },
        (newThreadId) => {
          setThreadId(newThreadId)
          setIsLoading(false)
        },
        (error) => {
          toast.error(error)
          setIsLoading(false)
        },
        moment?.id
      )
    } catch (error) {
      toast.error('Imeshindwa kupata majibu ya AI')
      setIsLoading(false)
    }
  }

  return (
    <KiliBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="🤖 Ask AI"
      height="75"
    >
      <div className="flex flex-col h-full">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-gold text-black'
                    : 'bg-bg-elevated text-text-primary'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className="text-[10px] opacity-70 mt-1">
                  {msg.timestamp.toLocaleTimeString('sw-TZ', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-bg-elevated p-3 rounded-2xl flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gold animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="flex-shrink-0 flex items-center gap-3 p-4 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Uliza AI kuhusu post hili..."
            className="flex-1 bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-gold"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim()) {
                handleSendMessage()
              }
            }}
            disabled={isLoading}
          />
          <KiliButton
            size="sm"
            disabled={!input.trim() || isLoading}
            onClick={handleSendMessage}
          >
            {isLoading ? '...' : 'Tuma'}
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
  const { user } = useAuthStore()
  const [file, setFile] = useState<File | null>(null)
  const [audio, setAudio] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const createMut = useMutation({
    mutationFn: () => {
      const form = new FormData()
      form.append('media', file!)
      form.append('media_type', file!.type.startsWith('video') ? 'video' : 'image')
      if (caption) form.append('caption', caption)
      if (location) form.append('location', location)
      if (audio) form.append('audio', audio)
      return momentsService.create(form)
    },
    onMutate: async () => {
      // Cancel ongoing feed queries to avoid overwriting optimistic update
      await qc.cancelQueries({ queryKey: ['feed'] })
      
      // Snapshot previous feed data for rollback
      const previousFeed = qc.getQueryData(['feed'])
      
      // Create temporary moment for optimistic update
      const tempMoment = {
        id: Date.now(), // Use number instead of string
        posted_by_username: user?.username || '',
        posted_by_avatar_url: user?.profile?.avatar_url || null,
        posted_by_role: user?.role || 'TOURIST',
        posted_by_verified: user?.is_verified || false,
        media_url: preview ? URL.createObjectURL(file!) : null,
        thumbnail_url: preview ? URL.createObjectURL(file!) : null,
        audio_url: audioPreview ? URL.createObjectURL(audio!) : null,
        media_type: file!.type.startsWith('video') ? 'video' : 'image',
        caption: caption || null,
        location: location || null,
        latitude: null,
        longitude: null,
        views: 0,
        shares: 0,
        trending_score: 0,
        like_count: 0,
        is_liked: false,
        is_saved: false,
        trust_score: 0,
        visibility: 'PUBLIC',
        created_at: new Date().toISOString(),
        is_optimistic: true, // Flag for optimistic update
      }
      
      // Optimistically add new moment to feed cache
      qc.setQueryData(['feed'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: [
            {
              results: [tempMoment, ...(old.pages?.[0]?.results || [])],
              count: (old.pages?.[0]?.count || 0) + 1,
              page: 1,
              has_next: old.pages?.[0]?.has_next || false,
            },
            ...(old.pages?.slice(1) || []),
          ],
        }
      })
      
      return { previousFeed }
    },
    onError: (error, variables, context) => {
      // Rollback to previous feed data on error
      if (context?.previousFeed) {
        qc.setQueryData(['feed'], context.previousFeed)
      }
      toast.error('Imeshindwa kuchapisha')
    },
    onSuccess: () => {
      toast.success('Moment imechapishwa! 🎉')
      // Invalidate to get real data from server
      qc.invalidateQueries({ queryKey: ['feed'] })
      setFile(null)
      setAudio(null)
      setPreview(null)
      setAudioPreview(null)
      setCaption('')
      setLocation('')
      onClose()
    },
    onSettled: () => {
      // Always refetch to ensure cache is in sync
      qc.invalidateQueries({ queryKey: ['feed'] })
    },
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

  const handleAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Faili la sauti lazima iwe chini ya 10MB')
      return
    }
    if (!f.type.startsWith('audio')) {
      toast.error('Chagua faili la sauti (MP3, WAV, M4A, etc)')
      return
    }
    setAudio(f)
    setAudioPreview(f.name)
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
                quality={85}
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

        {/* Audio picker */}
        {preview && (
          <motion.button
            className="w-full rounded-2xl border-2 border-dashed p-4 flex items-center gap-3 cursor-pointer"
            style={{ borderColor: 'var(--border-gold)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => audioRef.current?.click()}
          >
            <div className="text-2xl">🎵</div>
            <div className="flex-1 text-left">
              <p className="text-text-primary text-sm font-bold">
                {audioPreview ? `✅ Sauti iliyochaguliwa` : 'Chagua Sauti (Iختار)'}
              </p>
              <p className="text-text-muted text-xs mt-0.5">
                {audioPreview ? audioPreview : 'MP3, WAV, M4A — max 20MB (zingira)'}
              </p>
            </div>
            {audio && (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  setAudio(null)
                  setAudioPreview(null)
                }}
                className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-sm cursor-pointer hover:bg-red-500/30 transition-colors"
              >
                ✕
              </div>
            )}
            <input
              ref={audioRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudio}
            />
          </motion.button>
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
const MomentCard = memo(function MomentCard({
  moment,
  onAskAI,
  feedAudio,
}: {
  moment: Moment
  onAskAI: (moment: Moment) => void
  feedAudio: ReturnType<typeof useFeedAudio>
}) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [muted, setMuted] = useState(true)
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([])
  const [localLiked, setLocalLiked] = useState(moment.is_liked)
  const [localLikes, setLocalLikes] = useState(moment.like_count)
  const [localSaved, setLocalSaved] = useState(moment.is_saved)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const lastTap = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const shareUrl = useMemo(
    () => `${window.location.origin}/moments/${moment.id}`,
    [moment.id]
  )

  // Detect when moment is in viewport
  const { elementRef, isVisible } = useInViewport({
    onEnter: async () => {
      // Play audio when moment enters viewport
      if (moment.audio_url) {
        await feedAudio.playMoment(moment.id)
        setAudioPlaying(true)
      }
    },
    onLeave: () => {
      // Stop audio when moment leaves viewport
      feedAudio.stopMoment(moment.id)
      setAudioPlaying(false)
    },
    threshold: 0.5,
  })

  // Register audio element with feed audio manager
  useEffect(() => {
    if (audioRef.current && moment.audio_url) {
      feedAudio.registerAudio(moment.id, audioRef.current)
      return () => {
        feedAudio.registerAudio(moment.id, null)
      }
    }
  }, [moment.id, moment.audio_url, feedAudio])

  // Handle double tap to trigger audio play (for manual control)
  const handleDoubleTap = useCallback(
    async (e: React.MouseEvent) => {
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

        // Also trigger audio play on double tap
        if (moment.audio_url && audioRef.current && !audioPlaying) {
          try {
            await audioRef.current.play()
            await feedAudio.playMoment(moment.id)
            setAudioPlaying(true)
          } catch (error) {
            // Autoplay restriction
          }
        }
      }
      lastTap.current = now
    },
    [localLiked, audioPlaying, moment, feedAudio]
  )

  const likeMut = useMutation({
    mutationFn: () => momentsService.like(moment.id),
    onMutate: () => {
      const newLiked = !localLiked
      setLocalLiked(newLiked)
      setLocalLikes((c) => (newLiked ? c + 1 : c - 1))
    },
    onError: () => {
      setLocalLiked(moment.is_liked)
      setLocalLikes(moment.like_count)
      toast.error('Imeshindwa kupenda')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  })

  const saveMut = useMutation({
    mutationFn: () => momentsService.save(moment.id),
    onMutate: () => setLocalSaved((s) => !s),
    onError: () => {
      setLocalSaved(moment.is_saved)
      toast.error('Imeshindwa kuhifadhi')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  })

  const deleteMut = useMutation({
    mutationFn: () => momentsService.delete(moment.id),
    onSuccess: () => {
      toast.success('Moment imefutwa!')
      qc.invalidateQueries({ queryKey: ['feed'] })
      setShowDeleteConfirm(false)
    },
    onError: () => {
      toast.error('Imeshindwa kufuta')
      setShowDeleteConfirm(false)
    },
  })

  // Robust ownership check - case-insensitive username comparison with fallback
  const isOwner = user && moment.posted_by_username && 
    user.username.toLowerCase() === moment.posted_by_username.toLowerCase()

  return (
    <div
      ref={elementRef}
      className="relative snap-start flex-shrink-0"
      style={{ height: '100dvh', width: '100%' }}
    >
      {/* Hidden audio element for background music */}
      {moment.audio_url && (
        <audio
          ref={audioRef}
          src={moment.audio_url}
          loop
          crossOrigin="anonymous"
          onPlay={() => setAudioPlaying(true)}
          onPause={() => setAudioPlaying(false)}
        />
      )}

      {/* Media */}
      <div
        className="absolute inset-0 bg-black"
        onClick={handleDoubleTap}
      >
        {moment.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={moment.media_url || '/placeholder-video.mp4'}
            className="w-full h-full object-cover"
            loop
            muted={muted}
            playsInline
            autoPlay
          />
        ) : (
          <Image
            src={moment.media_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%231a1a2e"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="24"%3ENo Image%3C/text%3E%3C/svg%3E'}
            alt={moment.caption || 'Moment'}
            fill
            className="object-cover"
            sizes="100vw"
            loading="lazy"
            quality={85}
            unoptimized
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%231a1a2e"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="24"%3EFailed to Load%3C/text%3E%3C/svg%3E'
            }}
          />
        )}
      </div>

      {/* Heart bursts */}
      {hearts.map((h) => (
        <HeartBurst key={h.id} x={h.x} y={h.y} />
      ))}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-elevated rounded-3xl p-6 mx-4 max-w-sm w-full border border-border-subtle"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  Delete Post?
                </h3>
                <p className="text-text-muted text-sm mb-6">
                  Are you sure you want to delete this post? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteMut.isPending}
                    className="flex-1 py-3 px-4 rounded-2xl bg-bg-base border border-border-subtle text-text-primary font-medium transition-colors hover:bg-bg-elevated disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => deleteMut.mutate()}
                    disabled={deleteMut.isPending}
                    className="flex-1 py-3 px-4 rounded-2xl bg-red-500 text-white font-medium transition-colors hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteMut.isPending ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Top bar - Header content and media controls */}
      <div className="absolute top-0 left-0 right-0 pt-safe flex items-center justify-between px-4 pt-4 md:px-6 lg:px-8">
        {/* Header content - Posted by, badge, location */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            {/* Posted by info */}
            <div className="flex items-center gap-2">
              <p className="text-xs text-white/70 truncate max-w-[150px] md:max-w-[200px]">
                Posted by @{moment.posted_by_username}
              </p>
              <KiliBadge
                variant={moment.posted_by_role as 'TOURIST' | 'LOCAL_GUIDE'}
                size="xs"
                showEmoji={false}
              />
            </div>
            {/* Location */}
            <div className="flex items-center gap-1.5 text-white/80 text-xs mt-1">
              <MapPin size={12} className="text-gold flex-shrink-0" />
              <span className="truncate max-w-[150px] md:max-w-[200px]">{moment.location || 'Tanzania'}</span>
            </div>
          </div>
        </div>

        {/* Audio and video controls */}
        <div className="flex items-center gap-2">
          {/* Audio indicator */}
          {moment.audio_url && (
            <motion.button
              onClick={() => {
                if (audioRef.current) {
                  if (audioPlaying) {
                    audioRef.current.pause()
                  } else {
                    audioRef.current.play()
                  }
                }
              }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-full glass flex items-center justify-center"
              animate={audioPlaying ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              <Music
                size={18}
                className={audioPlaying ? 'text-gold' : 'text-white'}
                fill={audioPlaying ? 'currentColor' : 'none'}
              />
            </motion.button>
          )}

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
      </div>

      {/* LEFT SIDE - Content Actions */}
      <div className="absolute left-4 bottom-32 flex flex-col items-center gap-5 md:left-6 lg:left-8">
        {/* Appreciate */}
        <motion.button
          onClick={() => {
            vibrate(10)
            likeMut.mutate()
          }}
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
          <span className="text-white text-xs font-bold">Appreciate</span>
        </motion.button>

        {/* Ask AI */}
        <motion.button
          onClick={() => onAskAI(moment)}
          whileTap={{ scale: 0.8 }}
          className="flex flex-col items-center gap-1"
        >
          <Bot size={30} className="text-white" />
          <span className="text-white text-xs font-bold">Ask AI</span>
        </motion.button>

        {/* Add to Journey */}
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
          <span className="text-white text-xs font-bold">Add</span>
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

        {/* Delete - only for own moments */}
        {isOwner && (
          <motion.button
            onClick={() => setShowDeleteConfirm(true)}
            whileTap={{ scale: 0.8 }}
            className="flex flex-col items-center gap-1"
          >
            <Trash2 size={28} className="text-white" />
            <span className="text-white text-xs font-bold">Delete</span>
          </motion.button>
        )}
      </div>

      {/* RIGHT SIDE - Content Details */}
      <div className="absolute right-4 bottom-32 flex flex-col items-end gap-3 max-w-xs md:right-6 lg:right-8 md:max-w-sm lg:max-w-md">
        {/* Caption */}
        {moment.caption && (
          <p className="text-white text-sm leading-relaxed">
            {moment.caption.length > 120
              ? `${moment.caption.slice(0, 120)}...`
              : moment.caption}
          </p>
        )}

        {/* Trending badge */}
        {moment.trending_score > 50 && (
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(245,166,35,0.2)',
                border: '1px solid rgba(245,166,35,0.4)',
                color: '#F5A623',
              }}
            >
              <Flame size={12} />
              Frequently Experienced
            </div>
          </div>
        )}

        {/* Guide signal */}
        {moment.posted_by_role === 'LOCAL_GUIDE' && (
          <div className="flex items-center gap-1.5 text-gold text-xs">
            <span>👤 Local Guide available</span>
          </div>
        )}

        {/* Time and AI hint */}
        <div className="flex items-center gap-2">
          <p className="text-white/60 text-xs">{timeAgo(moment.created_at)}</p>
          <span className="text-white/50 text-xs">•</span>
          <p className="text-gold text-xs">🤖 AI Travel Insight available</p>
        </div>
      </div>
    </div>
  )
})

// ── Role-Based Feed Views ─────────────────────────────
function TouristFeedView({
  activeMoment,
  setActiveMoment,
  showCreate,
  setShowCreate,
  feedAudio,
  sessionId,
}: {
  activeMoment: Moment | null
  setActiveMoment: (moment: Moment | null) => void
  showCreate: boolean
  setShowCreate: (show: boolean) => void
  feedAudio: ReturnType<typeof useFeedAudio>
  sessionId: string
}) {
  const { isLoading: authLoading, isAuthenticated } = useAuthStore()
  
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 1 }) => momentsService.getFeed(pageParam as number, sessionId),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.has_next ? last.page + 1 : undefined,
    staleTime: 1000 * 15, // 15 seconds for more dynamic feed
    // CRITICAL: Don't fetch until auth is loaded
    enabled: !authLoading && isAuthenticated,
  })

  const moments = useMemo(
    () => data?.pages.flatMap((p) => p.results) ?? [],
    [data]
  )

  // Show loading while auth is being verified
  if (authLoading) {
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

  // Show loading while feed is fetching
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

  // Show error state if feed request failed
  if (error) {
    return (
      <div className="min-h-dvh bg-bg-base flex items-center justify-center pb-safe">
        <div className="text-center">
          <EmptyState
            icon="📡"
            title="Imeshindwa kupakia feed"
            subtitle="Tafadhali jaribu tena au angalia muunganisho wako"
            actionLabel="Jaribu Tena"
            onAction={() => window.location.reload()}
          />
        </div>
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
    {/* Responsive container - centers feed on larger screens */}
    <div className="w-full max-w-2xl mx-auto lg:max-w-3xl xl:max-w-4xl">
      
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
        {/* Moments List */}
        {moments.map((moment) => (
          <MomentCard
            key={moment.id}
            moment={moment}
            onAskAI={() => setActiveMoment(moment)}
            feedAudio={feedAudio}
          />
        ))}

        {/* Infinite loading state */}
        {isFetchingNextPage && (
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{ height: '100dvh' }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          </div>
        )}
      </div>
    </div>

    {/* Floating Create Button */}
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

    {/* AI Chat Sheet (replaces comments system) */}
    <AIChatSheet
      moment={activeMoment}
      isOpen={!!activeMoment}
      onClose={() => setActiveMoment(null)}
    />

    {/* Create Moment Sheet */}
    <CreateMomentSheet
      isOpen={showCreate}
      onClose={() => setShowCreate(false)}
    />
  </div>
)
}

// ── Main Feed Page Component ─────────────────────────────
export default function FeedPage() {
  const [activeMoment, setActiveMoment] = useState<Moment | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const feedAudio = useFeedAudio()
  const { sessionId } = useFeedSession()

  return (
    <TouristFeedView
      activeMoment={activeMoment}
      setActiveMoment={setActiveMoment}
      showCreate={showCreate}
      setShowCreate={setShowCreate}
      feedAudio={feedAudio}
      sessionId={sessionId}
    />
  )
}