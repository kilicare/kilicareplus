'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Shield, Clock, Users, MapPin, AlertTriangle } from 'lucide-react'
import api from '@/core/api/axios'
import { createWsManager } from '@/core/websocket/wsManager'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { timeAgo } from '@/lib/utils'

const SEV: Record<string, { color: string; bg: string; glow: string }> = {
  CRITICAL: { color:'#FF2D2D', bg:'rgba(255,45,45,0.12)', glow:'rgba(255,45,45,0.3)' },
  HIGH:     { color:'#FF7700', bg:'rgba(255,119,0,0.12)', glow:'rgba(255,119,0,0.3)' },
  MEDIUM:   { color:'#F5A623', bg:'rgba(245,166,35,0.12)', glow:'rgba(245,166,35,0.3)' },
  LOW:      { color:'#3B82F6', bg:'rgba(59,130,246,0.12)', glow:'rgba(59,130,246,0.3)' },
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
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-black text-text-primary mb-1">
          🆘 SOS Monitor
        </h1>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-kili-red animate-pulse" />
          <p className="text-sm text-text-muted">Live monitoring</p>
        </div>
      </div>

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
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl p-3 text-center relative overflow-hidden"
              style={{ background:`${s.color}12`, border:`1px solid ${s.color}25` }}>
              <div className="absolute top-0 right-0 w-12 h-12 rounded-full blur-2xl opacity-20"
                style={{ background: `radial-gradient(circle, ${s.color}, transparent)` }}
              />
              <div className="relative z-10">
                <s.icon size={16} className="mx-auto mb-1" style={{ color: s.color }} />
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-text-muted">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Alerts */}
      <div className="px-5 space-y-3 pb-8">
        {isLoading ? (
          [0,1,2].map((i) => <SkeletonCard key={i} className="h-40" rounded="xl" />)
        ) : combined.length === 0 ? (
          <EmptyState icon="✅" title="Hakuna dharura sasa"
            subtitle="Tanzania iko salama 🌍" />
        ) : (
          combined.map((alert, i) => {
            const sev = SEV[alert.severity] || SEV.LOW
            return (
              <motion.div key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-3xl overflow-hidden relative"
                style={{ background: sev.bg, border:`1px solid ${sev.color}40`,
                         boxShadow: alert.severity === 'CRITICAL'
                           ? `0 0 20px ${sev.glow}25` : 'none' }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20"
                  style={{ background: `radial-gradient(circle, ${sev.color}, transparent)` }}
                />
                <div className="h-1" style={{ background: sev.color }} />
                <div className="p-4 relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded-full"
                        style={{ background:`${sev.color}25`, color: sev.color }}>
                        {alert.severity}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-text-muted">
                        {alert.status}
                      </span>
                    </div>
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Clock size={10} /> {timeAgo(alert.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <KiliAvatar src={alert.user.avatar}
                      name={alert.user.first_name} size="sm" />
                    <div>
                      <p className="text-sm font-bold text-text-primary">
                        {alert.user.first_name || alert.user.username}
                      </p>
                      <p className="text-xs text-text-muted">
                        @{alert.user.username}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs text-text-muted flex items-center gap-1">
                        <Users size={10} /> {alert.responder_count} wasaidizi
                      </p>
                    </div>
                  </div>

                  {alert.message && (
                    <p className="text-xs text-text-secondary bg-black/20 rounded-xl px-3 py-2">
                      "{alert.message}"
                    </p>
                  )}

                  <p className="text-[10px] text-text-muted mt-2 flex items-center gap-1">
                    <MapPin size={10} /> {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                  </p>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}