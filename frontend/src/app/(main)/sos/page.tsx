'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MapPin, Shield, Users, Clock, CheckCircle, Loader2, History, AlertCircle, UserCheck, MessageSquare, XCircle, ArrowUp, Activity, Send } from 'lucide-react'
import { createWsManager } from '@/core/websocket/wsManager'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliButton } from '@/components/ui/KiliButton'
import { useAuthStore } from '@/stores/auth.store'
import { vibrate, timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'
import api from '@/core/api/axios'

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

// Hapa mabano yamekaa sawa na kuwekwa kwenye mstari mmoja kwa usafi
const SEV_CONFIG: Record<Severity, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Chini', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  MEDIUM: { label: 'Wastani', color: '#F5A623', bg: 'rgba(245,166,35,0.12)' },
  HIGH: { label: 'Juu', color: '#FF7700', bg: 'rgba(255,119,0,0.12)' },
  CRITICAL: { label: 'Hatari!', color: '#FF2D2D', bg: 'rgba(255,45,45,0.12)' },
}

interface SOSResponse {
  responder_username: string
  message: string
  eta_minutes: number | null
  created_at: string
  chat_room_name?: string
}

interface ChatMessage {
  id: number
  content: string
  sender_id: number
  sender_username: string
  sender_first_name: string
  sender_avatar: string | null
  timestamp: string
  is_read: boolean
}

interface TimelineEvent {
  id: number
  event_type: string
  created_at: string
  actor: {
    id: number
    username: string
    first_name: string
  } | null
  data: Record<string, any>
  response_data?: {
    id: number
    message: string
    eta_minutes: number | null
    responder_username: string
  } | null
  message_data?: {
    id: number
    content: string
    sender_id: number
    sender_username: string
    timestamp: string
  } | null
}

interface ActiveAlert {
  id: number
  user: { id: number; username: string; first_name: string; avatar: string | null }
  latitude: number
  longitude: number
  severity: Severity
  status: string
  message: string
  responder_count: number
  created_at: string
  chat_room_name?: string
  primary_responder_id?: number | null
  primary_responder_username?: string | null
  primary_responder_first_name?: string | null
  primary_responder_avatar?: string | null
  standby_responders?: Array<{
    id: number
    username: string
    first_name: string
    avatar: string | null
    eta_minutes: number | null
    guide_status: string
  }>
  assigned_at?: string | null
  responses?: Array<{
    id: number
    responder_id: number
    responder_username: string
    responder_first_name: string
    responder_avatar: string | null
    message: string
    eta_minutes: number | null
    guide_status: string
    is_primary: boolean
    created_at: string
  }>
  responders?: Array<{
    id: number
    username: string
    first_name: string
    avatar: string | null
    responded_at: string
    message: string | null
    eta_minutes: number | null
  }>
}

// ── Timeline Helper Functions ──────────────────────────
const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'SOS_CREATED':
      return <AlertCircle className="w-4 h-4" />
    case 'GUIDE_INTERESTED':
      return <UserCheck className="w-4 h-4" />
    case 'GUIDE_ASSIGNED':
      return <Shield className="w-4 h-4" />
    case 'GUIDE_ACCEPTED':
      return <CheckCircle className="w-4 h-4" />
    case 'GUIDE_ON_THE_WAY':
      return <Activity className="w-4 h-4" />
    case 'GUIDE_ARRIVED':
      return <MapPin className="w-4 h-4" />
    case 'GUIDE_COMPLETED':
      return <CheckCircle className="w-4 h-4" />
    case 'PRIMARY_REASSIGNED':
      return <ArrowUp className="w-4 h-4" />
    case 'ADMIN_INTERVENTION':
      return <Shield className="w-4 h-4" />
    case 'CHAT_MESSAGE':
      return <MessageSquare className="w-4 h-4" />
    case 'SOS_RESOLVED':
      return <CheckCircle className="w-4 h-4" />
    case 'SOS_CANCELLED':
      return <XCircle className="w-4 h-4" />
    case 'SOS_ESCALATED':
      return <ArrowUp className="w-4 h-4" />
    default:
      return <Activity className="w-4 h-4" />
  }
}

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case 'SOS_CREATED':
      return 'text-kili-red'
    case 'GUIDE_INTERESTED':
      return 'text-gold'
    case 'CHAT_MESSAGE':
      return 'text-blue-400'
    case 'SOS_RESOLVED':
      return 'text-green-400'
    case 'SOS_CANCELLED':
      return 'text-gray-400'
    case 'SOS_ESCALATED':
      return 'text-orange-400'
    case 'ADMIN_INTERVENTION':
      return 'text-purple-400'
    default:
      return 'text-text-muted'
  }
}

const getEventLabel = (event: TimelineEvent) => {
  switch (event.event_type) {
    case 'SOS_CREATED':
      return 'SOS imetumwa'
    case 'GUIDE_INTERESTED':
      return `${event.actor?.first_name || 'Wasaidaji'} anajibu`
    case 'CHAT_MESSAGE':
      return `${event.actor?.first_name || 'Mtumiaji'} ameandika`
    case 'SOS_RESOLVED':
      return 'SOS imesuluhishwa'
    case 'SOS_CANCELLED':
      return 'SOS imefutwa'
    case 'SOS_ESCALATED':
      return 'SOS imepandishwa kiwango'
    case 'ADMIN_INTERVENTION':
      return `Admin: ${event.data?.action || 'intervention'}`
    default:
      return 'Tukio'
  }
}

// ── Guide Alert Card ────────────────────────────────
function GuideAlertCard({
  alert,
  onRespond,
  onGoToChat,
  chatMessages,
  chatUnreadCount,
  onQuickReply,
}: {
  alert: ActiveAlert
  onRespond: (id: number, msg: string) => void
  onGoToChat: (chatRoomName: string) => void
  chatMessages: ChatMessage[]
  chatUnreadCount: number
  onQuickReply: (msg: string) => void
}) {
  const [responseMsg, setResponseMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [responded, setResponded] = useState(false)
  const [quickReplyText, setQuickReplyText] = useState('')
  const [responseMode, setResponseMode] = useState<'quick' | 'chat'>('quick')
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [showTimeline, setShowTimeline] = useState(false)
  const { user } = useAuthStore()
  const sev = SEV_CONFIG[alert.severity]

  // Fetch timeline for this alert
  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const { data } = await api.get(`/api/sos/${alert.id}/timeline/`)
        setTimeline(data.timeline)
      } catch (error) {
        console.error('Failed to fetch timeline:', error)
      }
    }
    fetchTimeline()
  }, [alert.id])

  // Determine if current user is primary or standby responder
  const myResponse = alert.responses?.find(r => r.responder_id === user?.id)
  const isPrimary = myResponse?.is_primary || false
  const isStandby = myResponse && !myResponse.is_primary
  const guideStatus = myResponse?.guide_status || 'INTERESTED'

  // Lifecycle action handlers
  const handleAcceptMission = async () => {
    try {
      const response = await fetch(`/api/sos/${alert.id}/guide/accept/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (response.ok) {
        vibrate([100, 50, 100])
      }
    } catch (error) {
      console.error('Failed to accept mission:', error)
    }
  }

  const handleUpdateGuideStatus = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/sos/${alert.id}/guide/update-status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) {
        vibrate([100, 50, 100])
      }
    } catch (error) {
      console.error('Failed to update guide status:', error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateX: -10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      whileHover={{ y: -8, rotateX: 5 }}
      transition={{ type: 'spring', stiffness: 100 }}
      className="group relative h-full"
      style={{ perspective: '1000px' }}
    >
      {/* Glowing background effect */}
      <motion.div
        animate={{
          boxShadow: alert.severity === 'CRITICAL'
            ? `0 0 30px ${sev.color}40`
            : '0 0 20px rgba(255, 45, 45, 0.2)'
        }}
        className="absolute inset-0 bg-gradient-to-br from-kili-red/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
      />

      {/* Main card */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/15 shadow-2xl p-6 h-full flex flex-col gap-4">
        {/* Severity bar with glow */}
        <motion.div
          animate={{
            boxShadow: alert.severity === 'CRITICAL'
              ? `0 0 15px ${sev.color}`
              : 'none'
          }}
          className="h-1.5 w-full"
          style={{ background: sev.color }}
        />

        {/* Top section: User info & severity */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="relative"
            >
              <KiliAvatar
                src={alert.user.avatar}
                name={alert.user.first_name}
                size="md"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900"
                style={{ background: sev.color }}
              />
            </motion.div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{
                    boxShadow: alert.severity === 'CRITICAL'
                      ? `0 0 10px ${sev.color}`
                      : 'none'
                  }}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm border"
                  style={{
                    background: `${sev.color}20`,
                    color: sev.color,
                    borderColor: `${sev.color}40`
                  }}
                >
                  {sev.label}
                </motion.span>
                <span className="text-[10px] text-text-muted">
                  {timeAgo(alert.created_at)}
                </span>
              </div>
              <p className="text-sm font-bold text-text-primary">
                {alert.user.first_name || alert.user.username}
              </p>
            </div>
          </div>

          {/* Responder count badge */}
          <motion.div
            animate={{
              boxShadow: alert.responder_count > 0
                ? '0 0 15px rgba(255, 45, 45, 0.5)'
                : 'none'
            }}
            className="px-3 py-1.5 rounded-lg font-bold text-sm backdrop-blur-sm border border-kili-red/30 bg-kili-red/10 text-kili-red"
          >
            <div className="flex items-center gap-1.5">
              <Shield size={12} />
              <span>{alert.responder_count}</span>
            </div>
          </motion.div>
        </div>

        {/* Message */}
        {alert.message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <p className="text-sm text-text-secondary leading-relaxed">
              "{alert.message}"
            </p>
          </motion.div>
        )}

        {/* Location */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-2 text-text-muted text-xs p-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm cursor-pointer"
        >
          <MapPin size={12} className="text-kili-red" />
          <span className="font-mono">{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
        </motion.div>

        {/* Responders Section */}
        {alert.responses && alert.responses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Users size={12} className="text-gold" />
              <p className="text-xs font-semibold text-text-primary">
                Wasaidaji Wanajibu ({alert.responses.length})
              </p>
            </div>
            <div className="space-y-2">
              {alert.responses.map((response) => (
                <div
                  key={response.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    response.is_primary 
                      ? 'bg-gold/10 border-gold/30' 
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <KiliAvatar
                    src={response.responder_avatar}
                    name={response.responder_first_name}
                    size="xs"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {response.responder_first_name}
                      </p>
                      {response.is_primary && (
                        <span className="text-[10px] font-bold text-gold">MKUU</span>
                      )}
                    </div>
                    {response.message && (
                      <p className="text-[10px] text-text-muted truncate">
                        "{response.message}"
                      </p>
                    )}
                    {response.guide_status && (
                      <p className="text-[10px] text-text-muted">
                        {response.guide_status}
                      </p>
                    )}
                  </div>
                  {response.eta_minutes && (
                    <div className="flex items-center gap-1 text-[10px] text-gold">
                      <Clock size={10} />
                      <span>{response.eta_minutes}min</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Role Badge - Primary vs Standby */}
        {myResponse && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-4 rounded-2xl backdrop-blur-sm border ${
              isPrimary
                ? 'bg-gold/15 border-gold/40'
                : 'bg-white/5 border-white/10'
            }`}
          >
            {isPrimary ? (
              <div className="text-center">
                <div className="text-3xl mb-2">🚑</div>
                <p className="text-sm font-bold text-gold mb-1">YOU ARE PRIMARY RESPONDER</p>
                <p className="text-xs text-text-muted">Status: {guideStatus}</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-3xl mb-2">🟡</div>
                <p className="text-sm font-bold text-text-muted mb-1">YOU ARE STANDBY</p>
                {alert.primary_responder_first_name && (
                  <p className="text-xs text-text-muted">
                    Primary: {alert.primary_responder_first_name}
                  </p>
                )}
                {alert.responses?.find((r: any) => r.is_primary)?.eta_minutes && (
                  <p className="text-xs text-gold">
                    ETA: {alert.responses.find((r: any) => r.is_primary)?.eta_minutes} min
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Respond section */}
        {!responded ? (
          !showForm ? (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <KiliButton
                fullWidth
                size="sm"
                onClick={() => setShowForm(true)}
                icon={<Shield size={14} />}
                className="bg-gradient-to-r from-kili-red to-red-600 hover:from-kili-red/90 hover:to-red-600/90 shadow-lg shadow-kili-red/30"
              >
                Jibu SOS Hii
              </KiliButton>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {/* Response Mode Selector */}
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setResponseMode('quick')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all backdrop-blur-sm border ${
                    responseMode === 'quick'
                      ? 'bg-gold text-black border-gold shadow-lg shadow-gold/30'
                      : 'bg-white/5 text-text-muted border-white/20 hover:border-white/40'
                  }`}
                >
                  ⚡ Jibu la Haraka
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setResponseMode('chat')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all backdrop-blur-sm border ${
                    responseMode === 'chat'
                      ? 'bg-gold text-black border-gold shadow-lg shadow-gold/30'
                      : 'bg-white/5 text-text-muted border-white/20 hover:border-white/40'
                  }`}
                >
                  💬 Fungua Mawasiliano
                </motion.button>
              </div>

              {responseMode === 'quick' ? (
                <>
                  <motion.textarea
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    value={responseMsg}
                    onChange={(e) => setResponseMsg(e.target.value)}
                    placeholder="Ujumbe wako kwa tourist..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/20 rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-kold focus:ring-2 focus:ring-gold/20 resize-none backdrop-blur-sm transition-all"
                  />
                  <div className="flex gap-2">
                    <KiliButton
                      variant="ghost"
                      size="sm"
                      fullWidth
                      onClick={() => setShowForm(false)}
                    >
                      Rudi
                    </KiliButton>
                    <KiliButton
                      size="sm"
                      fullWidth
                      disabled={!responseMsg.trim()}
                      onClick={() => {
                        onRespond(alert.id, responseMsg)
                        setResponded(true)
                        setShowForm(false)
                        vibrate([100, 50, 100])
                      }}
                    >
                      Tuma Jibu
                    </KiliButton>
                  </div>
                </>
              ) : (
                <>
                  <motion.textarea
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    value={responseMsg}
                    onChange={(e) => setResponseMsg(e.target.value)}
                    placeholder="Ujumbe wa kuanzia mawasiliano..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/20 rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 resize-none backdrop-blur-sm transition-all"
                  />
                  <div className="flex gap-2">
                    <KiliButton
                      variant="ghost"
                      size="sm"
                      fullWidth
                      onClick={() => setShowForm(false)}
                    >
                      Rudi
                    </KiliButton>
                    <KiliButton
                      size="sm"
                      fullWidth
                      variant="primary"
                      disabled={!responseMsg.trim()}
                      onClick={() => {
                        onRespond(alert.id, responseMsg)
                        setResponded(true)
                        setShowForm(false)
                        setTimeout(() => {
                          if (alert.chat_room_name) {
                            onGoToChat(alert.chat_room_name)
                          }
                        }, 500)
                        vibrate([100, 50, 100])
                      }}
                      icon={<Users size={14} />}
                    >
                      Tuma na Fungua Chat
                    </KiliButton>
                  </div>
                </>
              )}
            </div>
          )
        ) : (
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <KiliButton
                fullWidth
                size="sm"
                variant="primary"
                onClick={() => {
                  if (alert.chat_room_name) {
                    onGoToChat(alert.chat_room_name)
                  }
                }}
                icon={<Users size={14} />}
                className="bg-gradient-to-r from-gold to-gold-dim hover:from-gold/90 hover:to-gold-dim/90 shadow-lg shadow-gold/30 relative overflow-hidden"
              >
                <span className="relative z-10">Fungua Mawasiliano</span>
                {chatUnreadCount > 0 && (
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="ml-2 px-2 py-0.5 bg-kili-red text-white text-xs rounded-full relative z-10"
                  >
                    {chatUnreadCount}
                  </motion.span>
                )}
              </KiliButton>
            </motion.div>

            {/* Guide Lifecycle Controls - Only for Primary Responder */}
            {isPrimary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={12} className="text-gold" />
                  <p className="text-xs font-semibold text-text-primary">
                    Mission Controls
                  </p>
                </div>

                {/* ACCEPT MISSION - Show when status is INTERESTED or ASSIGNED */}
                {(guideStatus === 'INTERESTED' || guideStatus === 'ASSIGNED') && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <KiliButton
                      fullWidth
                      size="sm"
                      onClick={handleAcceptMission}
                      icon={<CheckCircle size={14} />}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-500/90 hover:to-green-600/90 shadow-lg shadow-green-500/30"
                    >
                      ✅ ACCEPT MISSION
                    </KiliButton>
                  </motion.div>
                )}

                {/* START JOURNEY - Show when status is ACCEPTED */}
                {guideStatus === 'ACCEPTED' && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <KiliButton
                      fullWidth
                      size="sm"
                      onClick={() => handleUpdateGuideStatus('on_the_way')}
                      icon={<Activity size={14} />}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-500/90 hover:to-blue-600/90 shadow-lg shadow-blue-500/30"
                    >
                      🚀 ON THE WAY
                    </KiliButton>
                  </motion.div>
                )}

                {/* ARRIVED - Show when status is ON_THE_WAY */}
                {guideStatus === 'ON_THE_WAY' && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <KiliButton
                      fullWidth
                      size="sm"
                      onClick={() => handleUpdateGuideStatus('ARRIVED')}
                      icon={<MapPin size={14} />}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-500/90 hover:to-purple-600/90 shadow-lg shadow-purple-500/30"
                    >
                      📍 ARRIVED
                    </KiliButton>
                  </motion.div>
                )}

                {/* COMPLETE INCIDENT - Show when status is ARRIVED */}
                {guideStatus === 'ARRIVED' && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <KiliButton
                      fullWidth
                      size="sm"
                      onClick={() => handleUpdateGuideStatus('completed')}
                      icon={<CheckCircle size={14} />}
                      className="bg-gradient-to-r from-gold to-gold-dim hover:from-gold/90 hover:to-gold-dim/90 shadow-lg shadow-gold/30"
                    >
                      ✅ COMPLETE INCIDENT
                    </KiliButton>
                  </motion.div>
                )}

                {/* UNABLE TO CONTINUE - Failure Scenario */}
                {(guideStatus === 'ACCEPTED' || guideStatus === 'ON_THE_WAY') && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <KiliButton
                      fullWidth
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUpdateGuideStatus('unable_to_continue')}
                      icon={<XCircle size={14} />}
                      className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                    >
                      ❌ UNABLE TO CONTINUE
                    </KiliButton>
                  </motion.div>
                )}

                {/* Status Display */}
                <div className="text-center py-2">
                  <p className="text-[10px] text-text-muted">
                    Current Status: <span className="font-bold text-gold">{guideStatus}</span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* Standby Guide - Stay Available Button Only */}
            {isStandby && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <KiliButton
                    fullWidth
                    size="sm"
                    variant="ghost"
                    icon={<Shield size={14} />}
                    className="bg-white/10 text-text-muted border border-white/20 hover:bg-white/20"
                  >
                    👁️ STAY AVAILABLE
                  </KiliButton>
                </motion.div>
                <p className="text-[10px] text-text-muted text-center">
                  You are on standby. No lifecycle controls available.
                </p>
              </motion.div>
            )}

            {/* Timeline Section */}
            {timeline.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-gold" />
                    <p className="text-xs font-semibold text-text-primary">
                      Mwelekeo wa Dharura
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowTimeline(!showTimeline)}
                    className="text-[10px] text-gold hover:text-gold/80"
                  >
                    {showTimeline ? 'Funga' : 'Onesha zaidi'}
                  </motion.button>
                </div>
                {showTimeline ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {timeline.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-2 rounded-xl bg-white/5 border border-white/10"
                      >
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                          getEventColor(event.event_type)
                        )}>
                          {getEventIcon(event.event_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('text-[10px] font-semibold', getEventColor(event.event_type))}>
                              {getEventLabel(event)}
                            </span>
                            <span className="text-[9px] text-text-muted">
                              {timeAgo(event.created_at)}
                            </span>
                          </div>
                          {event.response_data && (
                            <p className="text-[10px] text-text-secondary">
                              {event.response_data.message}
                              {event.response_data.eta_minutes && (
                                <span className="ml-1 text-gold">ETA: {event.response_data.eta_minutes} min</span>
                              )}
                            </p>
                          )}
                          {event.message_data && (
                            <p className="text-[10px] text-text-secondary">
                              {event.message_data.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {timeline.slice(-3).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-2 rounded-xl bg-white/5 border border-white/10"
                      >
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                          getEventColor(event.event_type)
                        )}>
                          {getEventIcon(event.event_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('text-[10px] font-semibold', getEventColor(event.event_type))}>
                              {getEventLabel(event)}
                            </span>
                            <span className="text-[9px] text-text-muted">
                              {timeAgo(event.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Chat Preview */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-gold" />
                  <p className="text-xs font-semibold text-text-primary">
                    Mawasiliano ya Karibu
                  </p>
                </div>
                {chatUnreadCount > 0 && (
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="px-2 py-0.5 bg-kili-red text-white text-xs rounded-full"
                  >
                    {chatUnreadCount} mpya
                  </motion.span>
                )}
              </div>

              {chatMessages.length > 0 ? (
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {chatMessages.slice(-3).map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      className={`p-3 rounded-xl text-sm backdrop-blur-sm ${
                        msg.sender_id === user?.id
                          ? 'bg-gold/10 ml-8 border border-gold/20'
                          : 'bg-white/5 mr-8 border border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <KiliAvatar
                          src={msg.sender_avatar}
                          name={msg.sender_first_name}
                          size="xs"
                        />
                        <span className="text-xs font-semibold text-text-primary">
                          {msg.sender_first_name}
                        </span>
                        <span className="text-[10px] text-text-muted ml-auto">
                          {timeAgo(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-text-secondary text-xs leading-relaxed">{msg.content}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 mb-3">
                  <MessageSquare size={24} className="mx-auto text-text-muted mb-2 opacity-50" />
                  <p className="text-text-muted text-xs">
                    Hakuna ujumbe bado
                  </p>
                </div>
              )}

              {/* Quick Reply */}
              <div className="flex gap-2">
                <input
                  value={quickReplyText}
                  onChange={(e) => setQuickReplyText(e.target.value)}
                  placeholder="Andika jibu la haraka..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 backdrop-blur-sm transition-all"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      onQuickReply(quickReplyText)
                      setQuickReplyText('')
                    }
                  }}
                />
                <KiliButton
                  size="sm"
                  disabled={!quickReplyText.trim()}
                  onClick={() => {
                    onQuickReply(quickReplyText)
                    setQuickReplyText('')
                  }}
                  icon={<Send size={14} />}
                  className="bg-gold hover:bg-gold/90"
                >
                  Tuma
                </KiliButton>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main SOS Page ───────────────────────────────────
export default function SOSPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const isGuide = user?.role === 'LOCAL_GUIDE'
  const isAdmin = user?.role === 'ADMIN'

  const [severity, setSeverity] = useState<Severity>('HIGH')
  const [message, setMessage] = useState('')
  const [activeAlertId, setActiveAlertId] = useState<number | null>(null)
  const [responses, setResponses] = useState<SOSResponse[]>([])
  const [isHolding, setIsHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [guideAlerts, setGuideAlerts] = useState<ActiveAlert[]>([])
  const [chatRoomName, setChatRoomName] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [showChatPreview, setShowChatPreview] = useState(false)
  const [quickReply, setQuickReply] = useState('')
  const [guideChatMessages, setGuideChatMessages] = useState<Record<number, ChatMessage[]>>({})
  const [guideChatUnreadCount, setGuideChatUnreadCount] = useState<Record<number, number>>({})
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [showTimeline, setShowTimeline] = useState(false)

  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const wsRef = useRef(createWsManager())
  const locationRef = useRef<{ lat: number; lng: number } | null>(null)
  const chatWsRef = useRef(createWsManager())

  // Get location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        locationRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
      })
    }
  }, [])

  // Load active alerts for guides
  const { data: activeAlerts = [], isLoading: isLoadingActive, error: activeError } = useQuery({
    queryKey: ['sos-active'],
    queryFn: async () => {
      const { data } = await api.get<ActiveAlert[]>('/api/sos/active/')
      return data
    },
    enabled: isGuide || isAdmin,
    refetchInterval: 15000,
  })

  // Load tourist's own alerts for state restoration
  const { data: myAlerts = [], isLoading: isLoadingMyAlerts, error: myAlertsError } = useQuery({
    queryKey: ['sos-my-alerts'],
    queryFn: async () => {
      const { data } = await api.get<any[]>('/api/sos/my-alerts/?include_responses=true')
      return data
    },
    enabled: !isGuide && !isAdmin,
    refetchInterval: 10000,
  })

  // Handle errors
  useEffect(() => {
    if (activeError) {
      console.error('[SOS] Error loading active alerts:', activeError)
      toast.error('Imeshindika kupata dharura za karibu')
    }
    if (myAlertsError) {
      console.error('[SOS] Error loading my alerts:', myAlertsError)
      toast.error('Imeshindika kupata dharura zako')
    }
  }, [activeError, myAlertsError])

  // State restoration on page load for tourists
  useEffect(() => {
    if (!isGuide && !isAdmin && myAlerts.length > 0) {
      // Find active alert (ACTIVE or RESPONDING status)
      const activeAlert = myAlerts.find((a: any) =>
        a.status === 'ACTIVE' || a.status === 'RESPONDING'
      )

      if (activeAlert) {
        console.log('[SOS] Restoring active alert:', activeAlert.id)
        setActiveAlertId(activeAlert.id)

        // Join incident-scoped WebSocket group
        wsRef.current.send({
          action: 'join_incident',
          alert_id: activeAlert.id,
        })

        // Restore responses if they exist
        if (activeAlert.responses && activeAlert.responses.length > 0) {
          console.log('[SOS] Restoring responses:', activeAlert.responses.length)
          setResponses(activeAlert.responses)
        }

        // Restore chat room if it exists
        if (activeAlert.chat_room_name) {
          console.log('[SOS] Restoring chat room:', activeAlert.chat_room_name)
          setChatRoomName(activeAlert.chat_room_name)
          // Restore latest chat message if available
          if (activeAlert.latest_chat_message) {
            setChatMessages([activeAlert.latest_chat_message])
          }
          // Restore unread count
          if (activeAlert.chat_unread_count) {
            setChatUnreadCount(activeAlert.chat_unread_count)
          }
        }

        // Fetch timeline for active alert
        fetchTimeline(activeAlert.id)
      } else {
        // No active alert, clear state
        setActiveAlertId(null)
        setResponses([])
        setChatRoomName(null)
        setChatMessages([])
        setChatUnreadCount(0)
        setTimeline([])
      }
    }
  }, [myAlerts, isGuide, isAdmin])

  // WebSocket
  useEffect(() => {
    const ws = wsRef.current
    ws.connect('/ws/sos/')

    const off = ws.on((data) => {
      if (data.type === 'sos_created') {
        setActiveAlertId((data as { alert_id: number }).alert_id)
        vibrate([200, 100, 200])
      }
      if (data.type === 'sos_response') {
        const d = data as { response: SOSResponse }
        setResponses((prev) => [d.response, ...prev])
        if (d.response.chat_room_name) {
          setChatRoomName(d.response.chat_room_name)
        }
        toast.success(`🆘 ${d.response.responder_username} anakuja!`)
        vibrate([100, 50, 100])
      }
      if (data.type === 'sos_chat_room') {
        setChatRoomName((data as { chat_room_name: string }).chat_room_name)
        console.log('[SOS] Chat room created:', (data as { chat_room_name: string }).chat_room_name)
      }
      if (data.type === 'sos_resolved') {
        setActiveAlertId(null)
        setResponses([])
        setChatRoomName(null)
        setChatMessages([])
        setChatUnreadCount(0)
        toast.success('SOS imesuluhishwa! ✅')
      }
      if (data.type === 'sos_cancelled') {
        setActiveAlertId(null)
        setResponses([])
        setChatRoomName(null)
        setChatMessages([])
        setChatUnreadCount(0)
        toast.info('SOS imefutwa')
      }
      if (data.type === 'sos_escalated') {
        toast.warning('SOS imepandishwa!')
      }
      if (data.type === 'new_sos') {
        const d = data.alert as ActiveAlert
        setGuideAlerts((prev) => {
          const exists = prev.find((a) => a.id === d.id)
          return exists ? prev : [d, ...prev]
        })
        vibrate([300, 100, 300, 100, 300])
        toast.error(`🚨 SOS ${d.severity} — ${d.user?.username || 'Tourist'}`)
      }
    })

    return () => {
      off()
      ws.disconnect()
    }
  }, [])

  // Chat WebSocket for real-time messages
  useEffect(() => {
    if (!chatRoomName) return

    const chatWs = chatWsRef.current
    chatWs.connect(`/ws/chat/${chatRoomName}/`)

    const off = chatWs.on((data) => {
      if (data.type === 'message') {
        const msg = data as unknown as ChatMessage
        setChatMessages((prev) => [...prev, msg])
        // If message is from someone else, increment unread count
        if (msg.sender_id !== user?.id) {
          setChatUnreadCount((prev) => prev + 1)
          vibrate([50])
          toast.info(`💬 ${msg.sender_first_name} ameandika`)
        }
      }
    })

    return () => {
      off()
      chatWs.disconnect()
    }
  }, [chatRoomName, user?.id])

  // Chat WebSocket for guide alerts (real-time updates)
  useEffect(() => {
    if (!isGuide && !isAdmin) return

    // Create WebSocket connections for all active guide alerts with chat rooms
    const chatConnections: { [key: string]: any } = {}

    const connectToAlertChat = (alertId: number, chatRoomName: string) => {
      if (chatConnections[chatRoomName]) return

      const chatWs = createWsManager()
      chatWs.connect(`/ws/chat/${chatRoomName}/`)

      const off = chatWs.on((data) => {
        if (data.type === 'message') {
          const msg = data as unknown as ChatMessage
          setGuideChatMessages((prev) => ({
            ...prev,
            [alertId]: [...(prev[alertId] || []), msg]
          }))
          // If message is from someone else, increment unread count
          if (msg.sender_id !== user?.id) {
            setGuideChatUnreadCount((prev) => ({
              ...prev,
              [alertId]: (prev[alertId] || 0) + 1
            }))
            vibrate([50])
            toast.info(`💬 ${msg.sender_first_name} ameandika`)
          }
        }
      })

      chatConnections[chatRoomName] = { ws: chatWs, off }
    }

    // Connect to all alerts that have chat rooms
    guideAlerts.forEach((alert) => {
      if (alert.chat_room_name) {
        connectToAlertChat(alert.id, alert.chat_room_name)
      }
    })

    // Cleanup
    return () => {
      Object.values(chatConnections).forEach(({ ws, off }) => {
        off()
        ws.disconnect()
      })
    }
  }, [guideAlerts, isGuide, isAdmin, user?.id])

  // Hold to activate
  const startHold = useCallback(() => {
    if (activeAlertId) return
    setIsHolding(true)
    setHoldProgress(0)
    let elapsed = 0
    holdTimer.current = setInterval(() => {
      elapsed += 50
      const prog = (elapsed / 3000) * 100
      setHoldProgress(prog)
      if (prog >= 100) {
        clearInterval(holdTimer.current!)
        setIsHolding(false)
        setHoldProgress(0)
        activateSOS()
      }
    }, 50)
  }, [activeAlertId])

  const stopHold = useCallback(() => {
    if (holdTimer.current) clearInterval(holdTimer.current)
    setIsHolding(false)
    setHoldProgress(0)
  }, [])

  const activateSOS = useCallback(() => {
    const loc = locationRef.current
    if (!loc) {
      toast.error('GPS haijapata eneo lako. Jaribu tena.')
      return
    }
    vibrate([200, 100, 200])
    wsRef.current.send({
      action: 'create_sos',
      latitude: loc.lat,
      longitude: loc.lng,
      severity,
      message,
    })
    toast.success('🆘 SOS imetumwa! Wasaidizi wanaarifu...')
  }, [severity, message])

  const respondSOS = (alertId: number, msg: string) => {
    wsRef.current.send({
      action: 'respond_sos',
      alert_id: alertId,
      message: msg,
    })

    // Join incident-scoped WebSocket group after responding
    wsRef.current.send({
      action: 'join_incident',
      alert_id: alertId,
    })

    // Fetch chat messages after responding
    setTimeout(() => {
      const alert = guideAlerts.find(a => a.id === alertId)
      if (alert && alert.chat_room_name) {
        fetchGuideChatMessages(alertId, alert.chat_room_name)
      }
    }, 1000)
  }

  const goToChat = (chatRoomName: string) => {
    router.push(`/chat?room=${chatRoomName}`)
  }

  const handleGuideQuickReply = (alertId: number, msg: string) => {
    const alert = guideAlerts.find(a => a.id === alertId)
    if (!alert || !alert.chat_room_name) return

    // Send message via chat WebSocket
    const chatWs = createWsManager()
    chatWs.connect(`/ws/chat/${alert.chat_room_name}/`)
    chatWs.send({
      action: 'message',
      content: msg,
    })
    chatWs.disconnect()
    vibrate([50])
  }

  const fetchGuideChatMessages = async (alertId: number, chatRoomName: string) => {
    try {
      const { data } = await api.get(`/api/sos/${alertId}/chat-room/`)
      if (data.exists && data.messages) {
        setGuideChatMessages(prev => ({
          ...prev,
          [alertId]: data.messages
        }))
        setGuideChatUnreadCount(prev => ({
          ...prev,
          [alertId]: data.unread_count || 0
        }))
      }
    } catch (error) {
      console.error('[SOS] Error fetching guide chat messages:', error)
    }
  }

  const resolveSOS = () => {
    if (!activeAlertId) return
    wsRef.current.send({ action: 'resolve_sos', alert_id: activeAlertId })
  }

  const cancelSOS = () => {
    if (!activeAlertId) return
    wsRef.current.send({ action: 'cancel_sos', alert_id: activeAlertId })
    setActiveAlertId(null)
    setResponses([])
    setChatRoomName(null)
    setChatMessages([])
    setChatUnreadCount(0)
  }

  const sendQuickReply = () => {
    if (!quickReply.trim() || !chatRoomName) return
    chatWsRef.current.send({
      action: 'message',
      content: quickReply,
    })
    setQuickReply('')
    setChatUnreadCount(0)
    vibrate([50])
  }

  const fetchTimeline = async (alertId: number) => {
    try {
      const { data } = await api.get<{ timeline: TimelineEvent[] }>(`/api/sos/${alertId}/timeline/`)
      setTimeline(data.timeline)
    } catch (error) {
      console.error('[SOS] Error fetching timeline:', error)
    }
  }

  const combinedAlerts = [
    ...guideAlerts,
    ...activeAlerts.filter(
      (a) => !guideAlerts.find((g) => g.id === a.id)
    ),
  ]

  // ── GUIDE VIEW ──────────────────────────────────
  if (isGuide || isAdmin) {
    return (
      <div className="min-h-dvh bg-bg-base pt-safe pb-safe">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-5"
        >
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-black text-text-primary">
              🆘 SOS Monitor
            </h1>
            {combinedAlerts.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-3 py-1 bg-kili-red text-white text-xs font-bold rounded-full"
              >
                {combinedAlerts.length} Active
              </motion.div>
            )}
          </div>
          <p className="text-text-muted text-sm">
            Watalii wanaohitaji msaada
          </p>
        </motion.div>

        {isLoadingActive ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gold" />
              <p className="text-text-muted text-sm">
                Inapakia dharura za karibu...
              </p>
            </div>
          </div>
        ) : combinedAlerts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center py-20"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-5xl mb-4"
              >
                ✅
              </motion.div>
              <p className="font-bold text-text-primary">
                Hakuna dharura sasa
              </p>
              <p className="text-text-muted text-sm mt-1">
                Tanzania iko salama 🌍
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 space-y-4"
          >
            {combinedAlerts
              .sort((a, b) => {
                const order = {
                  CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3,
                }
                return (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
              })
              .map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GuideAlertCard
                    alert={alert}
                    onRespond={respondSOS}
                    onGoToChat={goToChat}
                    chatMessages={guideChatMessages[alert.id] || []}
                    chatUnreadCount={guideChatUnreadCount[alert.id] || 0}
                    onQuickReply={(msg) => handleGuideQuickReply(alert.id, msg)}
                  />
                </motion.div>
              ))}
          </motion.div>
        )}
      </div>
    )
  }

  // ── TOURIST VIEW ────────────────────────────────
  return (
    <div
      className="min-h-dvh flex flex-col bg-bg-base pt-safe pb-safe"
      style={{
        background:
          activeAlertId
            ? 'radial-gradient(ellipse at center, rgba(255,45,45,0.08) 0%, #0A0A0F 60%)'
            : 'var(--bg-base)',
      }}
    >
      <div className="px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-text-primary">
              🆘 Usalama wa Dharura
            </h1>
            <p className="text-text-muted text-sm mt-1">
              {isLoadingMyAlerts
                ? 'Inapakia...'
                : activeAlertId
                ? 'SOS inayoendelea...'
                : 'Shika kitufe kwa sekunde 3 kutuma SOS'}
            </p>
          </div>
          {!isGuide && !isAdmin && (
            <KiliButton
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              icon={<History size={16} />}
            >
              Historia
            </KiliButton>
          )}
        </div>
      </div>

      {isLoadingMyAlerts && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gold" />
        </div>
      )}

      {/* SOS History */}
      {showHistory && !isGuide && !isAdmin && (
        <div className="px-5 mb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(26,26,36,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h3 className="font-bold text-text-primary mb-3">Historia ya SOS (5 za mwisho)</h3>
            {myAlerts.length === 0 ? (
              <p className="text-text-muted text-sm">Hakuna historia ya SOS</p>
            ) : (
              <div className="space-y-3">
                {myAlerts.slice(0, 5).map((alert: any) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                    onClick={() => {
                      setActiveAlertId(alert.id)
                      if (alert.responses && alert.responses.length > 0) {
                        setResponses(alert.responses)
                      }
                      if (alert.chat_room_name) {
                        setChatRoomName(alert.chat_room_name)
                      }
                      setShowHistory(false)
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{ color: SEV_CONFIG[alert.severity as Severity]?.color }}>
                        {SEV_CONFIG[alert.severity as Severity]?.label}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {timeAgo(alert.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary line-clamp-2">{alert.message || 'Bila ujumbe'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-text-muted">
                        {alert.responder_count} majibu
                      </span>
                      {alert.chat_room_name && (
                        <span className="text-xs text-gold">• Chat inapatikana</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Timeline Section for Active Alert */}
      {activeAlertId && timeline.length > 0 && (
        <div className="px-5 mb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(26,26,36,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h3 className="font-bold text-text-primary mb-3">Mwelekeo wa Dharura</h3>
            <div className="space-y-3">
              {timeline.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    getEventColor(event.event_type)
                  )}>
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-xs font-semibold', getEventColor(event.event_type))}>
                        {getEventLabel(event)}
                      </span>
                      <span className="text-xs text-text-muted">
                        {timeAgo(event.created_at)}
                      </span>
                    </div>
                    {event.response_data && (
                      <p className="text-xs text-text-secondary">
                        {event.response_data.message}
                        {event.response_data.eta_minutes && (
                          <span className="ml-2 text-gold">ETA: {event.response_data.eta_minutes} min</span>
                        )}
                      </p>
                    )}
                    {event.message_data && (
                      <p className="text-xs text-text-secondary">
                        {event.message_data.content}
                      </p>
                    )}
                    {event.event_type === 'SOS_CREATED' && event.data.message && (
                      <p className="text-xs text-text-secondary">
                        {event.data.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Active Rescue Team Card - Hero Section */}
      {activeAlertId && (
        <div className="px-5 mb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(255,45,45,0.12) 0%, rgba(245,166,35,0.08) 100%)',
              border: '2px solid rgba(255,45,45,0.3)',
            }}
          >
            {/* Hero Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-2xl"
                >
                  🚑
                </motion.div>
                <div>
                  <p className="text-sm font-bold text-kili-red">ACTIVE RESCUE TEAM</p>
                  <p className="text-[10px] text-text-muted">
                    {myAlerts.find((a: any) => a.id === activeAlertId)?.status || 'WAITING'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-kili-red animate-pulse" />
                <span className="text-[10px] text-text-muted">
                  {timeAgo(myAlerts.find((a: any) => a.id === activeAlertId)?.created_at || '')}
                </span>
              </div>
            </div>

            {/* Primary Responder - Hero Section */}
            {myAlerts.find((a: any) => a.id === activeAlertId)?.primary_responder_id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-4 rounded-2xl bg-gold/15 border border-gold/40"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={16} className="text-gold" />
                  <p className="text-sm font-bold text-gold">PRIMARY RESPONDER</p>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/20 text-gold">
                    ⭐ ASSIGNED
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="relative"
                  >
                    <KiliAvatar
                      src={myAlerts.find((a: any) => a.id === activeAlertId)?.primary_responder_avatar}
                      name={myAlerts.find((a: any) => a.id === activeAlertId)?.primary_responder_first_name || ''}
                      size="md"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 bg-gold"
                    />
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text-primary">
                      {myAlerts.find((a: any) => a.id === activeAlertId)?.primary_responder_first_name || 'Msaidizi'}
                    </p>
                    {myAlerts.find((a: any) => a.id === activeAlertId)?.responses?.find((r: any) => r.is_primary)?.eta_minutes && (
                      <div className="flex items-center gap-1 text-xs text-gold">
                        <Clock size={10} />
                        <span>ETA: {myAlerts.find((a: any) => a.id === activeAlertId)?.responses?.find((r: any) => r.is_primary)?.eta_minutes} Minutes</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gold">
                      {(() => {
                        const status = myAlerts.find((a: any) => a.id === activeAlertId)?.responses?.find((r: any) => r.is_primary)?.guide_status
                        if (status === 'ON_THE_WAY') return '🚀 ON THE WAY'
                        if (status === 'ARRIVED') return '📍 ARRIVED'
                        if (status === 'COMPLETED') return '✅ COMPLETED'
                        return status || 'ACCEPTED'
                      })()}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* No Primary Responder Yet - Hero Section */}
            {!myAlerts.find((a: any) => a.id === activeAlertId)?.primary_responder_id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={16} className="text-text-muted" />
                  <p className="text-sm font-bold text-text-muted">WAITING FOR RESPONDER</p>
                </div>
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 size={20} className="text-gold" />
                  </motion.div>
                  <p className="text-xs text-text-muted">
                    System is searching nearby guides...
                  </p>
                </div>
              </motion.div>
            )}

            {/* Backup Responders Count - Hero Section */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-text-muted" />
                <p className="text-xs font-semibold text-text-muted">
                  Backup Responders
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">
                  {myAlerts.find((a: any) => a.id === activeAlertId)?.responses?.filter((r: any) => !r.is_primary).length || 0}
                </span>
                <span className="text-[10px] text-text-muted">
                  on standby
                </span>
              </div>
            </div>

            {/* Current Status - Hero Section */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-gold" />
                <p className="text-xs font-semibold text-text-muted">
                  Current Status
                </p>
              </div>
              <span className="text-xs font-bold text-gold">
                {myAlerts.find((a: any) => a.id === activeAlertId)?.status || 'WAITING_FOR_RESPONDER'}
              </span>
            </div>

            {/* Rescue Confidence - Hero Section */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-gold" />
                <p className="text-xs font-semibold text-text-muted">
                  Rescue Confidence
                </p>
              </div>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-2 h-2 rounded-full ${
                    (myAlerts.find((a: any) => a.id === activeAlertId)?.responses?.length || 0) >= 3
                      ? 'bg-green-400'
                      : (myAlerts.find((a: any) => a.id === activeAlertId)?.responses?.length || 0) >= 1
                      ? 'bg-gold'
                      : 'bg-red-400'
                  }`}
                />
                <span className={`text-xs font-bold ${
                  (myAlerts.find((a: any) => a.id === activeAlertId)?.responses?.length || 0) >= 3
                    ? 'text-green-400'
                    : (myAlerts.find((a: any) => a.id === activeAlertId)?.responses?.length || 0) >= 1
                    ? 'text-gold'
                    : 'text-red-400'
                }`}>
                  {(myAlerts.find((a: any) => a.id === activeAlertId)?.responses?.length || 0) >= 3
                    ? '🟢 VERY HIGH'
                    : (myAlerts.find((a: any) => a.id === activeAlertId)?.responses?.length || 0) >= 1
                    ? '🟡 HIGH'
                    : '🔴 LOW'}
                </span>
              </div>
            </div>

            {/* Nearby Responders - Hero Section */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-gold" />
                <p className="text-xs font-semibold text-text-muted">
                  Nearby Responders
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">
                  {myAlerts.find((a: any) => a.id === activeAlertId)?.responses?.length || 0}
                </span>
                <span className="text-[10px] text-text-muted">
                  available
                </span>
              </div>
            </div>

            {/* Standby Responders List - Collapsed */}
            {myAlerts.find((a: any) => a.id === activeAlertId)?.responses?.filter((r: any) => !r.is_primary).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users size={12} className="text-text-muted" />
                  <p className="text-xs font-semibold text-text-muted">
                    Standby Responders
                  </p>
                </div>
                <div className="space-y-1">
                  {myAlerts.find((a: any) => a.id === activeAlertId)?.responses?.filter((r: any) => !r.is_primary).slice(0, 3).map((standby: any) => (
                    <div key={standby.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                      <KiliAvatar
                        src={standby.avatar}
                        name={standby.first_name}
                        size="xs"
                      />
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold text-text-muted">{standby.first_name}</p>
                        {standby.eta_minutes && (
                          <p className="text-[9px] text-text-muted">ETA: {standby.eta_minutes}min</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="flex gap-2">
              <KiliButton
                variant="success"
                fullWidth
                size="sm"
                onClick={resolveSOS}
                icon={<CheckCircle size={14} />}
              >
                Tatua — Niko Sawa
              </KiliButton>
              <KiliButton
                variant="ghost"
                size="sm"
                onClick={cancelSOS}
              >
                Futa
              </KiliButton>
            </div>

            {chatRoomName && (
              <div className="space-y-3">
                <KiliButton
                  fullWidth
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    router.push(`/chat?room=${chatRoomName}`)
                  }}
                  icon={<Users size={14} />}
                >
                  Fungua Mawasiliano
                  {chatUnreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-kili-red text-white text-xs rounded-full">
                      {chatUnreadCount}
                    </span>
                  )}
                </KiliButton>

                {/* Chat Preview */}
                <div className="rounded-2xl p-4 bg-bg-elevated border border-border-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-text-muted">
                      Mawasiliano ya Karibu
                    </p>
                    {chatUnreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-kili-red text-white text-xs rounded-full">
                        {chatUnreadCount} mpya
                      </span>
                    )}
                  </div>

                  {chatMessages.length > 0 ? (
                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                      {chatMessages.slice(-3).map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-2 rounded-xl text-sm ${
                            msg.sender_id === user?.id
                              ? 'bg-gold/10 ml-8'
                              : 'bg-white/5 mr-8'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <KiliAvatar
                              src={msg.sender_avatar}
                              name={msg.sender_first_name}
                              size="xs"
                            />
                            <span className="text-xs font-semibold text-text-primary">
                              {msg.sender_first_name}
                            </span>
                          </div>
                          <p className="text-text-secondary text-xs">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-muted text-xs mb-3">
                      Hakuna ujumbe bado
                    </p>
                  )}

                  {/* Quick Reply */}
                  <div className="flex gap-2">
                    <input
                      value={quickReply}
                      onChange={(e) => setQuickReply(e.target.value)}
                      placeholder="Andika jibu la haraka..."
                      className="flex-1 bg-bg-base border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') sendQuickReply()
                      }}
                    />
                    <KiliButton
                      size="sm"
                      disabled={!quickReply.trim()}
                      onClick={sendQuickReply}
                    >
                      Tuma
                    </KiliButton>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Severity selector */}
      {!activeAlertId && (
        <div className="px-5 mb-6">
          <p className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wider">
            Kiwango cha Hatari
          </p>
          <div className="flex gap-2">
            {(Object.keys(SEV_CONFIG) as Severity[]).map((s) => {
              const c = SEV_CONFIG[s]
              return (
                <motion.button
                  key={s}
                  onClick={() => setSeverity(s)}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all"
                  style={{
                    background: severity === s ? c.bg : 'rgba(26,26,36,0.6)',
                    border: `1px solid ${severity === s ? c.color : 'rgba(255,255,255,0.08)'}`,
                    color: severity === s ? c.color : 'var(--text-muted)',
                  }}
                >
                  {c.label}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Message input */}
      {!activeAlertId && (
        <div className="px-5 mb-8">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Eleza hali yako... (optional)"
            rows={2}
            className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-kili-red resize-none"
          />
        </div>
      )}

      {/* SOS Button */}
      <div className="flex-1 flex flex-col items-center justify-center px-10">
        {!activeAlertId && (
          <div className="relative flex items-center justify-center">
            {/* Pulsing rings */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-kili-red"
                style={{ width: 160 + i * 50, height: 160 + i * 50 }}
                animate={{ opacity: [0.4, 0, 0.4], scale: [1, 1.1, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.4,
                }}
              />
            ))}

            {/* Progress ring */}
            <svg
              width={160}
              height={160}
              className="absolute"
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle
                cx={80} cy={80} r={74}
                fill="none"
                stroke="rgba(255,45,45,0.15)"
                strokeWidth={6}
              />
              <circle
                cx={80} cy={80} r={74}
                fill="none"
                stroke="#FF2D2D"
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 74}
                strokeDashoffset={
                  2 * Math.PI * 74 * (1 - holdProgress / 100)
                }
                style={{ transition: 'stroke-dashoffset 50ms linear' }}
              />
            </svg>

            {/* Main button */}
            <motion.button
              onPointerDown={startHold}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              className="relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center select-none"
              style={{
                background: isHolding
                  ? 'linear-gradient(135deg, #CC1A1A, #FF2D2D)'
                  : 'linear-gradient(135deg, #FF2D2D, #CC1A1A)',
                boxShadow: isHolding
                  ? '0 0 60px rgba(255,45,45,0.8)'
                  : '0 0 30px rgba(255,45,45,0.45)',
              }}
              animate={
                isHolding
                  ? { scale: 0.95 }
                  : { scale: [1, 1.03, 1] }
              }
              transition={
                isHolding
                  ? { duration: 0.1 }
                  : { duration: 2, repeat: Infinity }
              }
            >
              <Shield size={40} className="text-white" strokeWidth={1.5} />
              <span className="text-white font-black text-lg mt-1">SOS</span>
            </motion.button>
          </div>
        )}

        <p className="text-text-muted text-sm mt-8 text-center">
          {activeAlertId
            ? '🔴 Wasaidizi wanaarifu...'
            : isHolding
            ? '⏱ Endelea kushika...'
            : '👆 Shika kwa sekunde 3'}
        </p>
      </div>
    </div>
  )
}