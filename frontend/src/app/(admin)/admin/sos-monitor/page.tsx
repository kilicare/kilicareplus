'use client'
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
  timeline?: TimelineEvent[]
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
  const [selectedAlert, setSelectedAlert] = useState<SosAlert | null>(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState<'reassign' | 'escalate' | 'resolve' | 'cancel' | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [selectedResponderId, setSelectedResponderId] = useState<number | null>(null)
  const [showTimeline, setShowTimeline] = useState(false)
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineEvent[]>([])
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

  const { data: stats, error: statsError } = useQuery({
    queryKey: ['admin-sos-stats'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/api/sos/statistics/')
        return data
      } catch (error) {
        console.warn('[SOS Monitor] Failed to fetch statistics:', error)
        return null
      }
    },
    staleTime: 1000 * 30,
    retry: 1,
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

  // Admin action handlers
  const handleAdminAction = async (alertId: number, action: string, data: any = {}) => {
    try {
      const endpoint = `/api/sos/admin/${alertId}/${action}/`
      const response = await api.put(endpoint, data)
      if (response.status === 200) {
        // Refresh alerts
        setLiveAlerts(prev => prev.filter(a => a.id !== alertId))
        setShowActionModal(false)
        setActionReason('')
        setSelectedResponderId(null)
      }
    } catch (error) {
      console.error('Failed to perform admin action:', error)
    }
  }

  const handleReassign = () => {
    if (selectedAlert && selectedResponderId) {
      handleAdminAction(selectedAlert.id, 'reassign', { responder_id: selectedResponderId, reason: actionReason })
    }
  }

  const handleEscalate = () => {
    if (selectedAlert) {
      handleAdminAction(selectedAlert.id, 'escalate', { reason: actionReason })
    }
  }

  const handleResolve = () => {
    if (selectedAlert) {
      handleAdminAction(selectedAlert.id, 'resolve', { reason: actionReason })
    }
  }

  const handleCancel = () => {
    if (selectedAlert) {
      handleAdminAction(selectedAlert.id, 'cancel', { reason: actionReason })
    }
  }

  const fetchTimeline = async (alertId: number) => {
    try {
      const { data } = await api.get(`/api/sos/${alertId}/timeline/`)
      setSelectedTimeline(data.timeline)
    } catch (error) {
      console.error('Failed to fetch timeline:', error)
    }
  }

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
      case 'CHAT_MESSAGE':
        return <MessageSquare className="w-4 h-4" />
      case 'SOS_RESOLVED':
        return <CheckCircle className="w-4 h-4" />
      case 'SOS_CANCELLED':
        return <XCircle className="w-4 h-4" />
      case 'SOS_ESCALATED':
        return <ArrowUp className="w-4 h-4" />
      case 'PRIMARY_REASSIGNED':
        return <RefreshCw className="w-4 h-4" />
      case 'ADMIN_INTERVENTION':
        return <Shield className="w-4 h-4" />
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
        return 'SOS Created'
      case 'GUIDE_INTERESTED':
        return `${event.actor?.first_name || 'Guide'} Responded`
      case 'GUIDE_ASSIGNED':
        return `${event.actor?.first_name || 'Guide'} Assigned as Primary`
      case 'GUIDE_ACCEPTED':
        return `${event.actor?.first_name || 'Guide'} Accepted Mission`
      case 'GUIDE_ON_THE_WAY':
        return `${event.actor?.first_name || 'Guide'} Started Journey`
      case 'GUIDE_ARRIVED':
        return `${event.actor?.first_name || 'Guide'} Arrived`
      case 'GUIDE_COMPLETED':
        return `${event.actor?.first_name || 'Guide'} Completed Rescue`
      case 'CHAT_MESSAGE':
        return `${event.actor?.first_name || 'User'} sent message`
      case 'SOS_RESOLVED':
        return 'SOS Resolved'
      case 'SOS_CANCELLED':
        return 'SOS Cancelled'
      case 'SOS_ESCALATED':
        return 'SOS Escalated'
      case 'PRIMARY_REASSIGNED':
        return 'Primary Responder Reassigned'
      case 'ADMIN_INTERVENTION':
        return `Admin: ${event.data?.action || 'intervention'}`
      default:
        return event.event_type
    }
  }

  return (
    <div className="min-h-dvh bg-bg-base pt-safe pb-safe overflow-y-auto no-scrollbar">
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
              {combined.length} Active
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-kili-red"
          />
          <p className="text-sm text-text-muted">Live monitoring</p>
        </div>
      </motion.div>

      {/* Stats */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-3 px-5 mb-5">
          {[
            { label:'Active',    value: stats.active,          color:'#FF2D2D', icon: AlertTriangle },
            { label:'Responding',value: stats.responding,      color:'#F5A623', icon: Shield },
            { label:'Escalated', value: stats.escalated || 0, color:'#FF7700', icon: Users },
            { label:'Leo',       value: stats.resolved_today,  color:'#10B981', icon: Clock },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05, y: -4 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 100 }}
              className="rounded-2xl p-3 text-center relative overflow-hidden backdrop-blur-sm border"
              style={{ background:`${s.color}15`, border:`1px solid ${s.color}30` }}>
              <motion.div
                animate={{
                  boxShadow: `0 0 20px ${s.color}30`
                }}
                className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-30"
                style={{ background: `radial-gradient(circle, ${s.color}, transparent)` }}
              />
              <div className="relative z-10">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.2 }}
                >
                  <s.icon size={18} className="mx-auto mb-1" style={{ color: s.color }} />
                </motion.div>
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.2 + 0.3, type: 'spring' }}
                  className="text-2xl font-black"
                  style={{ color: s.color }}>{s.value}</motion.p>
                <p className="text-[10px] text-text-muted font-semibold">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Alerts */}
      <div className="px-5 space-y-4 pb-8">
        {isLoading ? (
          [0,1,2].map((i) => <SkeletonCard key={i} className="h-52" rounded="xl" />)
        ) : combined.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <EmptyState icon="✅" title="Hakuna dharura sasa"
              subtitle="Tanzania iko salama 🌍" />
          </motion.div>
        ) : (
          combined.map((alert, i) => {
            const sev = SEV[alert.severity] || SEV.LOW
            return (
              <motion.div key={alert.id}
                initial={{ opacity: 0, y: 20, rotateX: -10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                whileHover={{ y: -8, rotateX: 5 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 100 }}
                className="group relative h-full"
                style={{ perspective: '1000px' }}>
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
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/15 shadow-2xl p-5 h-full flex flex-col gap-4">
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
                          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-white/10 text-text-muted border border-white/20">
                            {alert.status}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-text-primary">
                          {alert.user.first_name || alert.user.username}
                        </p>
                        <p className="text-xs text-text-muted">
                          @{alert.user.username}
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
                        <Users size={12} />
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

                  {/* Primary Responder Section */}
                  {alert.primary_responder_username && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-gold/10 border border-gold/30 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={12} className="text-gold" />
                        <p className="text-xs font-semibold text-text-primary">
                          ⭐ Primary Responder
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <KiliAvatar
                          src={alert.primary_responder_avatar}
                          name={alert.primary_responder_first_name}
                          size="xs"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gold">
                            {alert.primary_responder_first_name}
                          </p>
                          {alert.assigned_at && (
                            <div className="flex items-center gap-1 text-[10px] text-gold">
                              <Clock size={10} />
                              <span>Assigned: {timeAgo(alert.assigned_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Standby Responders Section */}
                  {alert.responses && alert.responses.filter((r: any) => !r.is_primary).length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Users size={12} className="text-text-muted" />
                        <p className="text-xs font-semibold text-text-primary">
                          Standby Responders ({alert.responses.filter((r: any) => !r.is_primary).length})
                        </p>
                      </div>
                      <div className="space-y-2">
                        {alert.responses.filter((r: any) => !r.is_primary).map((responder: any) => (
                          <div
                            key={responder.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
                          >
                            <KiliAvatar
                              src={responder.responder_avatar}
                              name={responder.responder_first_name}
                              size="xs"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-text-muted truncate">
                                {responder.responder_first_name}
                              </p>
                              {responder.eta_minutes && (
                                <div className="flex items-center gap-1 text-[10px] text-text-muted">
                                  <Clock size={10} />
                                  <span>{responder.eta_minutes}min</span>
                                </div>
                              )}
                              <p className="text-[9px] text-text-muted">
                                {responder.guide_status}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Admin Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedAlert(alert)
                        setActionType('reassign')
                        setShowActionModal(true)
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all"
                    >
                      <RefreshCw size={12} />
                      <span>Reassign</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedAlert(alert)
                        setActionType('escalate')
                        setShowActionModal(true)
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-all"
                    >
                      <ArrowUpRight size={12} />
                      <span>Escalate</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedAlert(alert)
                        setActionType('resolve')
                        setShowActionModal(true)
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all"
                    >
                      <CheckCircle size={12} />
                      <span>Resolve</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedAlert(alert)
                        setActionType('cancel')
                        setShowActionModal(true)
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                    >
                      <XCircle size={12} />
                      <span>Cancel</span>
                    </motion.button>
                  </motion.div>

                  {/* Time */}
                  <div className="flex items-center gap-2 text-text-muted text-xs pt-2 border-t border-white/10">
                    <Clock size={10} />
                    <span>{timeAgo(alert.created_at)}</span>
                  </div>

                  {/* Timeline Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedAlert(alert)
                      fetchTimeline(alert.id)
                      setShowTimeline(true)
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/5 text-text-muted border border-white/20 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Activity size={12} />
                    <span>View Timeline</span>
                  </motion.button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Admin Action Modal */}
      {showActionModal && selectedAlert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowActionModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-white/20 rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-text-primary mb-4">
              {actionType === 'reassign' && 'Reassign Primary Responder'}
              {actionType === 'escalate' && 'Escalate Incident'}
              {actionType === 'resolve' && 'Resolve Incident'}
              {actionType === 'cancel' && 'Cancel Incident'}
            </h3>

            {actionType === 'reassign' && selectedAlert.responses && (
              <div className="space-y-2 mb-4">
                <p className="text-xs text-text-muted mb-2">Select new primary responder:</p>
                {selectedAlert.responses.map((responder: any) => (
                  <motion.button
                    key={responder.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedResponderId(responder.responder_id)}
                    className={`w-full flex items-center gap-2 p-3 rounded-xl border ${
                      selectedResponderId === responder.responder_id
                        ? 'bg-gold/20 border-gold/40 text-gold'
                        : 'bg-white/5 border-white/20 text-text-muted'
                    }`}
                  >
                    <KiliAvatar
                      src={responder.responder_avatar}
                      name={responder.responder_first_name}
                      size="xs"
                    />
                    <div className="flex-1 text-left">
                      <p className="text-xs font-semibold">{responder.responder_first_name}</p>
                      {responder.eta_minutes && (
                        <p className="text-[10px] text-text-muted">ETA: {responder.eta_minutes}min</p>
                      )}
                      <p className="text-[9px] text-text-muted">{responder.guide_status}</p>
                    </div>
                    {responder.is_primary && (
                      <span className="text-[10px] font-bold text-gold">MKUU</span>
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs text-text-muted mb-2 block">Reason (optional):</label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Enter reason for this action..."
                rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowActionModal(false)
                  setActionReason('')
                  setSelectedResponderId(null)
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/10 text-text-muted border border-white/20 hover:bg-white/20 transition-all"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (actionType === 'reassign') handleReassign()
                  else if (actionType === 'escalate') handleEscalate()
                  else if (actionType === 'resolve') handleResolve()
                  else if (actionType === 'cancel') handleCancel()
                }}
                disabled={actionType === 'reassign' && !selectedResponderId}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gold text-black hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Timeline Modal */}
      {showTimeline && selectedAlert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowTimeline(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-white/20 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">Incident Timeline</h3>
              <button
                onClick={() => setShowTimeline(false)}
                className="text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {selectedTimeline.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getEventColor(event.event_type)}`}>
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${getEventColor(event.event_type)}`}>
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
                    {event.data?.reason && (
                      <p className="text-xs text-text-secondary">
                        Reason: {event.data.reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}