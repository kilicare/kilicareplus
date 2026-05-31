'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ShoppingCart, MessageSquare, Share2,
  Minus, Plus, ChevronLeft, X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  showcaseService,
  type ShowcaseItem,
} from '@/services/showcase.service'
import { chatService } from '@/services/chat.service'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { TrustScoreRing } from '@/components/ui/TrustScoreRing'
import { KiliButton } from '@/components/ui/KiliButton'
import { KiliBottomSheet } from '@/components/ui/KiliBottomSheet'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, parseApiError } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

// ── Item detail sheet ───────────────────────────────
function ItemDetailSheet({
  item,
  isOpen,
  onClose,
  ownerUsername,
}: {
  item: ShowcaseItem | null
  isOpen: boolean
  onClose: () => void
  ownerUsername: string
}) {
  const router = useRouter()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [qty, setQty] = useState(1)
  const [imgIdx, setImgIdx] = useState(0)

  const orderMut = useMutation({
    mutationFn: () =>
      showcaseService.createOrder(item!.id, qty),
    onSuccess: () => {
      toast.success('Order imeundwa! Lipa ili kukamilisha. 🎉')
      qc.invalidateQueries({ queryKey: ['my-orders'] })
      onClose()
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  const startChatMut = useMutation({
    mutationFn: async () => {
      // Get seller's user ID from API
      const res = await chatService.startDM(0) // We'll need seller ID
      return res
    },
    onSuccess: (data) => {
      router.push(`/chat/${data.room_name}`)
    },
  })

  if (!item) return null

  const images = item.media.length > 0 ? item.media : []
  const currentImg = images[imgIdx]

  return (
    <KiliBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      height="90"
    >
      <div className="overflow-y-auto">
        {/* Images gallery */}
        {images.length > 0 && (
          <div className="relative">
            <div className="aspect-square relative overflow-hidden">
              <img
                src={currentImg?.file_url || ''}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar">
                {images.map((img, i) => (
                  <div
                    key={img.id}
                    onClick={() => setImgIdx(i)}
                    className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
                    style={{
                      border: imgIdx === i
                        ? '2px solid var(--gold)'
                        : '2px solid transparent',
                    }}
                  >
                    <img
                      src={img.file_url || ''}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-5">
          {/* Category */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(245,166,35,0.15)',
                color: '#F5A623',
              }}
            >
              {item.category}
            </span>
            {item.is_negotiable && (
              <span className="text-[10px] font-bold text-kili-green">
                💬 Bei ni mazungumzo
              </span>
            )}
          </div>

          <h2 className="text-xl font-black text-text-primary mb-1">
            {item.title}
          </h2>

          <p className="text-3xl font-black text-gold mb-3">
            {formatCurrency(item.price)}
          </p>

          <p className="text-text-secondary text-sm leading-relaxed mb-5">
            {item.description}
          </p>

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-5">
            <p className="text-sm font-medium text-text-secondary">
              Kiasi:
            </p>
            <div className="flex items-center gap-3">
              <motion.button
                onClick={() => setQty(Math.max(1, qty - 1))}
                whileTap={{ scale: 0.9 }}
                className="w-9 h-9 rounded-xl bg-bg-elevated flex items-center justify-center"
              >
                <Minus size={16} className="text-text-primary" />
              </motion.button>
              <span className="text-lg font-black text-text-primary w-8 text-center">
                {qty}
              </span>
              <motion.button
                onClick={() => setQty(qty + 1)}
                whileTap={{ scale: 0.9 }}
                className="w-9 h-9 rounded-xl bg-bg-elevated flex items-center justify-center"
              >
                <Plus size={16} className="text-text-primary" />
              </motion.button>
            </div>
          </div>

          {/* Total */}
          <div
            className="rounded-2xl p-3 mb-5 flex items-center justify-between"
            style={{
              background: 'rgba(245,166,35,0.08)',
              border: '1px solid rgba(245,166,35,0.2)',
            }}
          >
            <span className="text-text-muted text-sm">Jumla:</span>
            <span className="text-gold font-black">
              {formatCurrency(item.price * qty)}
            </span>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <KiliButton
              fullWidth
              size="lg"
              loading={orderMut.isPending}
              onClick={() => orderMut.mutate()}
              icon={<ShoppingCart size={18} />}
            >
              Nunua — {formatCurrency(item.price * qty)}
            </KiliButton>

            <KiliButton
              variant="ghost"
              fullWidth
              size="md"
              icon={<MessageSquare size={16} />}
              onClick={() => {
                onClose()
                router.push('/chat')
              }}
            >
              Wasiliana na Muuzaji
            </KiliButton>
          </div>
        </div>
      </div>
    </KiliBottomSheet>
  )
}

// ── Item Card ───────────────────────────────────────
function ItemCard({
  item,
  color,
  onClick,
}: {
  item: ShowcaseItem
  color: string
  onClick: () => void
}) {
  const img = item.primary_image?.file_url

  return (
    <motion.div
      className="rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: 'rgba(26,26,36,0.8)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      {/* Image */}
      <div className="aspect-square relative bg-bg-elevated">
        {img ? (
          <img src={img} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🎁
          </div>
        )}
        {!item.is_available && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              Haitapatikani
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-text-muted mb-0.5">{item.category}</p>
        <h4 className="text-sm font-bold text-text-primary line-clamp-1 mb-1">
          {item.title}
        </h4>
        <p className="text-sm font-black" style={{ color }}>
          {formatCurrency(item.price)}
        </p>
        {item.is_negotiable && (
          <p className="text-[10px] text-text-muted mt-0.5">💬 Mazungumzo</p>
        )}
      </div>
    </motion.div>
  )
}

// ── Main showcase page ──────────────────────────────
export default function ShowcaseDetailPage({
  params,
}: {
  params: any
}) {
  const router = useRouter()
  const [selectedItem, setSelectedItem] = useState<ShowcaseItem | null>(null)

  // `params` can be a Promise in client components; unwrap it with React.use
  const { username } = React.use(params) as { username: string }

  const { data: showcase, isLoading } = useQuery({
    queryKey: ['showcase', username],
    queryFn: () => showcaseService.getByUsername(username),
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-bg-base pt-safe pb-safe">
        <SkeletonCard className="h-48 rounded-none" rounded="sm" />
        <div className="px-5 pt-4 space-y-4">
          <SkeletonCard className="h-20" rounded="xl" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} className="h-48" rounded="xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!showcase) {
    return (
      <div className="min-h-dvh bg-bg-base flex items-center justify-center">
        <EmptyState
          icon="🛍️"
          title="Showcase haipatikani"
          actionLabel="Rudi"
          onAction={() => router.back()}
        />
      </div>
    )
  }

  const color = showcase.theme_color || '#F5A623'

  return (
    <div className="min-h-dvh bg-bg-base overflow-y-auto no-scrollbar pb-safe">
      {/* Banner */}
      <div
        className="relative h-52"
        style={{
          background: showcase.banner_url
            ? undefined
            : `linear-gradient(135deg, ${color}25, rgba(10,10,15,0.95))`,
        }}
      >
        {showcase.banner_url && (
          <img
            src={showcase.banner_url}
            alt={showcase.title}
            className="w-full h-full object-cover"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 40%, #0A0A0F 100%)',
          }}
        />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-safe left-4 mt-3 w-9 h-9 glass rounded-xl flex items-center justify-center"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>

        {/* Share */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href)
            toast.success('Link imekopwa!')
          }}
          className="absolute top-safe right-4 mt-3 w-9 h-9 glass rounded-xl flex items-center justify-center"
        >
          <Share2 size={16} className="text-white" />
        </button>
      </div>

      {/* Owner card */}
      <div className="px-5 -mt-10 relative z-10 mb-5">
        <div
          className="rounded-3xl p-4 flex items-center gap-4"
          style={{
            background: 'rgba(26,26,36,0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <KiliAvatar
            src={showcase.owner_avatar}
            name={showcase.owner_username}
            isVerified={showcase.owner_verified}
            size="lg"
          />
          <div className="flex-1">
            <h1 className="text-lg font-black text-text-primary">
              {showcase.title}
            </h1>
            <p className="text-xs text-text-muted">
              @{showcase.owner_username}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <TrustScoreRing
                score={showcase.owner_trust}
                size="xs"
                showNumber={false}
              />
              <span className="text-xs text-text-muted">
                👁️ {showcase.total_views.toLocaleString()} maoni
              </span>
            </div>
          </div>
        </div>

        {showcase.description && (
          <p className="text-text-muted text-sm mt-3 leading-relaxed">
            {showcase.description}
          </p>
        )}
      </div>

      {/* Items grid */}
      <div className="px-5 pb-8">
        <h2 className="text-lg font-black text-text-primary mb-4">
          🛍️ Bidhaa ({showcase.item_count})
        </h2>
        {showcase.items.length === 0 ? (
          <EmptyState
            icon="📦"
            title="Hakuna bidhaa bado"
            subtitle="Bidhaa zitaonekana hapa baadaye"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {showcase.items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                color={color}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Item detail */}
      <ItemDetailSheet
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        ownerUsername={showcase.owner_username}
      />
    </div>
  )
}