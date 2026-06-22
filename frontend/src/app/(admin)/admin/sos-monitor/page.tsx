'use client'
// Force dynamic rendering to prevent static pre-rendering during build
// This ensures auth state is evaluated at runtime, not build time
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Shield, Clock, Users, MapPin, AlertTriangle, Send, MessageSquare, ArrowUpRight, CheckCircle, XCircle, RefreshCw, AlertCircle, UserCheck, Activity, ArrowUp } from 'lucide-react'
import api from '@/core/api/axios'
import { createWsManager } from '@/core/websocket/wsManager'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { timeAgo } from '@/lib/utils'

const SEV: Record<string, { color: string; bg: string; glow: string; label: string }> = {
  CRITICAL: { color:'#FF2D2D', bg:'rgba(255,45,45,0.12)', glow:'rgba(255,45,45,0.3)', label:'CRITICAL' },
  HIGH:     { color:'#FF7700', bg:'rgba(255,119,0,0.12)', glow:'rgba(255,119,0,0.3)', label:'HIGH' },
  MEDIUM:   { color:'#F5A623', bg:'rgba(245,166,35,0.12)', glow:'rgba(245,166,35,0.3)', label:'MEDIUM' },
  LOW:      { color:'#3B82F6', bg:'rgba(59,130,246,0.12)', glow:'rgba(59,130,246,0.3)', label:'LOW' },
}

interface SosAlert {
  id: number
  user: { id: number; username: string; first_name: string; avatar: string | null }
  latitude: number
  longitude: number
  location_address?: string
  severity: string
  status: string
  message: string
  responder_count: number
  created_at: string
  primary_responder_id?: number | null
  primary_responder_username?: string | null
  primary_responder_first_name?: string | null
  primary_responder_avatar?: string | null
  assigned_at?: string | null
  coverage_level?: string
  responses?: SosResponse[]
  timeline?: TimelineEvent[]
}

interface SosResponse {
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
}

interface TimelineEvent {
  id: number
  event_type: string
  actor?: {
    id: number
    username: string
    first_name: string
    avatar: string | null
  }
  response_data?: {
    message: string
    eta_minutes: number
  }
  message_data?: {
    content: string
  }
  data?: any
  created_at: string
}

export default function SosMonitorPage() {
  const [liveAlerts, setLiveAlerts] = useState<SosAlert[]>([])
  const ws = createWsManager()

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['admin-sos-active'],
    queryFn: async () => {
      const { data } = await api.get('/api/sos/active/')
      return data
    },
    staleTime: 1000 * 15,
    refetchInterval: 15000,
  })

  useEffect(() => {
    ws.connect('/ws/sos/')
    const off = ws.on((data) => {
      if (data.type === 'new_sos') {
        const alert = (data as { alert: SosAlert }).alert
        setLiveAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)])
      }
      if (data.type === 'sos_resolved') {
        const aid = (data as { alert_id: number }).alert_id
        setLiveAlerts((prev) => prev.filter((a) => a.id !== aid))
      }
      // STEP 2: Handle responder interest updates
      if (data.type === 'sos_responder_interest') {
        const d = data as { alert_id: number; responder_count: number; responder: { id: number; username: string } }
        setLiveAlerts((prev) =>
          prev.map((alert) =>
            alert.id === d.alert_id
              ? { ...alert, responder_count: d.responder_count }
              : alert
          )
        )
      }
    })
    return () => { off(); ws.disconnect() }
  }, [])

  const combined = [
    ...liveAlerts,
    ...alerts.filter((a: SosAlert) => !liveAlerts.find((l) => l.id === a.id)),
  ].sort((a, b) => {
    const order: Record<string, number> = { CRITICAL:0, HIGH:1, MEDIUM:2, LOW:3 }
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
  })

  return (
    <div className="h-dvh flex flex-col bg-bg-base pt-safe pb-safe">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-6 pb-4"
      >
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-black text-text-primary">
            🆘 SOS Monitor
          </h1>
          {combined.length > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-3 py-1 bg-kili-red text-white text-xs font-bold rounded-full"
            >
              {combined.length}
            </motion.div>
          )}
        </div>
        <p className="text-sm text-text-muted">
          New incidents requiring attention
        </p>
      </motion.div>

      {/* Alerts - Phase 1 Only */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 space-y-4 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : combined.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center py-20"
          >
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="font-bold text-text-primary">No active incidents</p>
              <p className="text-text-muted text-sm mt-1">Tanzania is safe 🌍</p>
            </div>
          </motion.div>
        ) : (
          combined.map((alert, i) => {
            const sev = SEV[alert.severity] || SEV.LOW
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-xl border-2 border-white/20 shadow-2xl p-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 45, 45, 0.15) 0%, rgba(255, 45, 45, 0.05) 100%)',
                  borderColor: 'rgba(255, 45, 45, 0.4)'
                }}
              >
                {/* Incident Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <KiliAvatar
                      src={alert.user.avatar}
                      name={alert.user.first_name || alert.user.username}
                      size="md"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-text-primary">
                        {alert.user.first_name || alert.user.username}
                      </p>
                      <p className="text-xs text-text-muted">
                        Incident #{alert.id} • {timeAgo(alert.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg font-bold text-sm bg-kili-red/10 text-kili-red border border-kili-red/30">
                    {sev.label}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 mb-4">
                  <div className="flex items-center gap-2">
                    <Shield size={12} className="text-gold" />
                    <p className="text-xs font-semibold text-text-muted">
                      Status
                    </p>
                  </div>
                  <span className="text-xs font-bold text-kili-red">
                    {alert.status}
                  </span>
                </div>

                {/* STEP 2: Interested Responders List */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users size={12} className="text-text-muted" />
                      <p className="text-xs font-semibold text-text-muted">
                        Interested Responders
                      </p>
                    </div>
                    <span className="text-sm font-bold text-text-primary">
                      {alert.responder_count}
                    </span>
                  </div>

                  {/* STEP 2: Show actual responder names */}
                  {alert.responses && alert.responses.length > 0 ? (
                    <div className="space-y-2">
                      {alert.responses.map((response: SosResponse) => (
                        <div key={response.id} className="flex items-center gap-2">
                          <KiliAvatar
                            src={response.responder_avatar}
                            name={response.responder_first_name || response.responder_username}
                            size="sm"
                          />
                          <p className="text-xs text-text-primary">
                            {response.responder_first_name || response.responder_username}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted">
                      No responders yet
                    </p>
                  )}
                </div>

                {/* STEP 2: Timeline Section */}
                {alert.timeline && alert.timeline.length > 0 && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={12} className="text-gold" />
                      <p className="text-xs font-semibold text-text-muted">
                        Timeline
                      </p>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {alert.timeline.map((event: TimelineEvent) => (
                        <div
                          key={event.id}
                          className="flex items-start gap-2 p-2 rounded-lg bg-white/5"
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-gold">
                            {event.event_type === 'SOS_CREATED' && <AlertCircle className="w-4 h-4" />}
                            {event.event_type === 'GUIDE_INTERESTED' && <UserCheck className="w-4 h-4" />}
                            {event.event_type === 'CHAT_MESSAGE' && <MessageSquare className="w-4 h-4" />}
                            {!['SOS_CREATED', 'GUIDE_INTERESTED', 'CHAT_MESSAGE'].includes(event.event_type) && <Activity className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-semibold text-gold">
                                {event.event_type === 'SOS_CREATED' && 'SOS Created'}
                                {event.event_type === 'GUIDE_INTERESTED' && `${event.actor?.first_name || 'Guide'} Interested`}
                                {event.event_type === 'CHAT_MESSAGE' && `${event.actor?.first_name || 'User'} Sent Message`}
                                {!['SOS_CREATED', 'GUIDE_INTERESTED', 'CHAT_MESSAGE'].includes(event.event_type) && event.event_type}
                              </span>
                              <span className="text-[9px] text-text-muted">
                                {timeAgo(event.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MONITOR Button - Phase 1 Only */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-gold/20 text-gold border border-gold/40 hover:bg-gold/30 transition-all flex items-center justify-center gap-2"
                >
                  <Shield size={14} />
                  <span>MONITOR</span>
                </motion.button>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}