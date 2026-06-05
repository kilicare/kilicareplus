'use client'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { CheckCheck, Bell, Filter, RefreshCw } from 'lucide-react'
import {
  notificationsService,
  type KiliNotification,
} from '@/services/notifications.service'
import { notificationsSocket } from '@/core/websocket/notificationsWs'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliButton } from '@/components/ui/KiliButton'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { useUIStore } from '@/stores/ui.store'
import { timeAgo } from '@/lib/utils'

const TYPE_CFG: Record<string, { emoji: string; color: string; path: string }> = {
  LIKE:                  { emoji:'❤️', color:'#FF2D2D',  path:'/feed' },
  COMMENT:               { emoji:'💬', color:'#3B82F6',  path:'/feed' },
  FOLLOW:                { emoji:'👤', color:'#10B981',  path:'/profile' },
  SOS_RESPONSE:          { emoji:'🆘', color:'#FF2D2D',  path:'/sos' },
  BOOKING_REQUEST:       { emoji:'📅', color:'#F5A623',  path:'/creator/bookings' },
  BOOKING_CONFIRMED:     { emoji:'✅', color:'#10B981',  path:'/bookings' },
  BOOKING_COMPLETED:     { emoji:'🎉', color:'#10B981',  path:'/bookings' },
  PAYMENT_RECEIVED:      { emoji:'💰', color:'#F5A623',  path:'/billing' },
  BADGE_UNLOCK:          { emoji:'🏆', color:'#F5A623',  path:'/passport' },
  POINTS_AWARDED:        { emoji:'⭐', color:'#F5A623',  path:'/passport' },
  TIP_VERIFIED:          { emoji:'✓',  color:'#10B981',  path:'/tips' },
  NEW_MESSAGE:           { emoji:'💬', color:'#3B82F6',  path:'/chat' },
  SUBSCRIPTION_EXPIRING: { emoji:'⏰', color:'#FF7700',  path:'/billing' },
  SHOWCASE_ORDER:        { emoji:'🛍️', color:'#8B5CF6',  path:'/creator/showcase' },
  SHOWCASE_DELIVERED:    { emoji:'📦', color:'#10B981',  path:'/creator/showcase' },
  LEVEL_UP:              { emoji:'🚀', color:'#F5A623',  path:'/passport' },
  REVIEW_RECEIVED:       { emoji:'⭐', color:'#F5A623',  path:'/creator/bookings' },
}

function NotifCard({
  notif,
  onRead,
}: {
  notif: KiliNotification
  onRead: (id: number) => void
}) {
  const router = useRouter()
  const cfg    = TYPE_CFG[notif.notification_type] || {
    emoji: '🔔', color: '#8B8BA7', path: '/',
  }

  return (
    <motion.div
      onClick={() => {
        if (!notif.is_read) onRead(notif.id)
        router.push(cfg.path)
      }}
      className="flex items-start gap-4 px-5 py-4 cursor-pointer"
      style={{
        background: notif.is_read
          ? 'transparent'
          : `${cfg.color}07`,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Icon / Avatar */}
      <div className="relative flex-shrink-0">
        {notif.sender ? (
          <KiliAvatar
            src={notif.sender.avatar}
            name={notif.sender.username ?? undefined}
            size="md"
          />
        ) : (
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
            style={{ background: `${cfg.color}15` }}
          >
            {cfg.emoji}
          </div>
        )}
        {notif.sender && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
            style={{ background: cfg.color }}
          >
            {cfg.emoji}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="text-sm leading-snug"
          style={{
            color: notif.is_read
              ? 'var(--text-secondary)'
              : 'var(--text-primary)',
            fontWeight: notif.is_read ? 400 : 600,
          }}
        >
          {notif.title}
        </p>
        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
          {notif.body}
        </p>
        <p className="text-[10px] text-text-disabled mt-1.5">
          {timeAgo(notif.created_at)}
        </p>
      </div>

      {!notif.is_read && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
          style={{ background: cfg.color }}
        />
      )}
    </motion.div>
  )
}

export default function NotificationsPage() {
  const qc = useQueryClient()
  const { setNotificationCount } = useUIStore()
  const [filterType, setFilterType] = useState<string | null>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsService.getAll,
    staleTime: 1000 * 30,
  })

  const typedNotifications: KiliNotification[] = notifications as KiliNotification[]

  // Manual refresh with sync
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
      await notificationsService.sync()
    } catch (e) {
      console.error('Refresh failed:', e)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Filter notifications by type
  const filteredNotifications = filterType
    ? typedNotifications.filter((n: KiliNotification) => n.notification_type === filterType)
    : typedNotifications

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((acc: Record<string, KiliNotification[]>, notif: KiliNotification) => {
    const date = new Date(notif.created_at).toDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(notif)
    return acc
  }, {})

  // Get unique notification types for filter
  const notificationTypes: string[] = Array.from(
    new Set(typedNotifications.map((n: KiliNotification) => n.notification_type))
  )

  // Real-time WebSocket
  useEffect(() => {
    notificationsSocket.connect()

    const off = notificationsSocket.on((data) => {
      if (data.type === 'notification') {
        qc.invalidateQueries({ queryKey: ['notifications'] })
        qc.invalidateQueries({ queryKey: ['notif-count'] })
      }
      if (data.type === 'unread_count') {
        const count = (data as { count: number }).count
        setNotificationCount(count)
      }
      if (data.type === 'all_read') {
        qc.invalidateQueries({ queryKey: ['notifications'] })
        setNotificationCount(0)
      }
    })

    return () => off()
  }, [qc, setNotificationCount])

  const readMut = useMutation({
    mutationFn: (id: number) => notificationsService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-count'] })
    },
  })

  const readAllMut = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      setNotificationCount(0)
      notificationsSocket.send({ action: 'mark_all_read' })
    },
  })

  const unread = typedNotifications.filter((n: KiliNotification) => !n.is_read).length

  return (
    <div
      ref={scrollRef}
      className="min-h-dvh bg-bg-base overflow-y-auto no-scrollbar"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-5 py-4 border-b flex items-center justify-between"
        style={{
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--border)',
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-gold" />
          <h1 className="text-xl font-black text-text-primary">Arifa</h1>
          {unread > 0 && (
            <span className="bg-kili-red text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <KiliButton
            variant="ghost"
            size="xs"
            loading={isRefreshing}
            onClick={handleRefresh}
            icon={<RefreshCw size={14} />}
          />
          <KiliButton
            variant="ghost"
            size="xs"
            onClick={() => setShowFilter(!showFilter)}
            icon={<Filter size={14} />}
          />
          {unread > 0 && (
            <KiliButton
              variant="ghost"
              size="xs"
              loading={readAllMut.isPending}
              onClick={() => readAllMut.mutate()}
              icon={<CheckCheck size={14} />}
            >
              Soma Zote
            </KiliButton>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="px-5 py-3 flex gap-2 overflow-x-auto no-scrollbar">
              <KiliButton
                variant={filterType === null ? 'primary' : 'ghost'}
                size="xs"
                onClick={() => setFilterType(null)}
              >
                Zote
              </KiliButton>
              {notificationTypes.map((type: string) => (
                <KiliButton
                  key={type}
                  variant={filterType === type ? 'primary' : 'ghost'}
                  size="xs"
                  onClick={() => setFilterType(type)}
                >
                  {TYPE_CFG[type]?.emoji || '🔔'} {type}
                </KiliButton>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[0,1,2,3,4].map((i) => (
            <SkeletonCard key={i} className="h-20" rounded="xl" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title={filterType ? `Hakuna arifa za ${filterType}` : 'Hakuna arifa bado'}
          subtitle={filterType ? 'Badili filter kuona arifa nyingine' : 'Arifa zitaonekana hapa ukifanya shughuli'}
        />
      ) : (
        <div className="pb-4">
          {Object.entries(groupedNotifications).map(([date, notifs]) => (
            <div key={date}>
              <div className="px-5 py-2 sticky top-[73px] z-0 bg-bg-base/95 backdrop-blur-sm">
                <p className="text-xs font-bold text-text-muted uppercase">
                  {date === new Date().toDateString() ? 'Leo' : date}
                </p>
              </div>
              <AnimatePresence>
                {(notifs as KiliNotification[]).map((n: KiliNotification) => (
                  <NotifCard
                    key={n.id}
                    notif={n}
                    onRead={(id) => readMut.mutate(id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}