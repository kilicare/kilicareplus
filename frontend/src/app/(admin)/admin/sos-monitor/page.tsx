'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Shield, Clock, Users, MapPin, AlertTriangle, Send, MessageSquare } from 'lucide-react'
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
  severity: string
  status: string
  message: string
  responder_count: number
  created_at: string
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

  const { data: stats, error: statsError } = useQuery({
    queryKey: ['admin-sos-stats'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/api/admin-ops/sos/statistics/')
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

                  {/* Responders Section */}
                  {alert.responders && alert.responders.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Users size={12} className="text-gold" />
                        <p className="text-xs font-semibold text-text-primary">
                          Wasaidaji Wanajibu ({alert.responders.length})
                        </p>
                      </div>
                      <div className="space-y-2">
                        {alert.responders.map((responder: any) => (
                          <div
                            key={responder.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
                          >
                            <KiliAvatar
                              src={responder.avatar}
                              name={responder.first_name}
                              size="xs"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-text-primary truncate">
                                {responder.first_name}
                              </p>
                              {responder.message && (
                                <p className="text-[10px] text-text-muted truncate">
                                  "{responder.message}"
                                </p>
                              )}
                            </div>
                            {responder.eta_minutes && (
                              <div className="flex items-center gap-1 text-[10px] text-gold">
                                <Clock size={10} />
                                <span>{responder.eta_minutes}min</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Time */}
                  <div className="flex items-center gap-2 text-text-muted text-xs pt-2 border-t border-white/10">
                    <Clock size={10} />
                    <span>{timeAgo(alert.created_at)}</span>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}