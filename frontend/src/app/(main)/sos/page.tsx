'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MapPin, Shield, Users, Clock, CheckCircle } from 'lucide-react'
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
}

// ── Guide Alert Card ────────────────────────────────
function GuideAlertCard({
  alert,
  onRespond,
}: {
  alert: ActiveAlert
  onRespond: (id: number, msg: string, eta?: number) => void
}) {
  const [responseMsg, setResponseMsg] = useState('')
  const [eta, setEta] = useState('')
  const [showForm, setShowForm] = useState(false)
  const sev = SEV_CONFIG[alert.severity]

  return (
    <motion.div
      className="rounded-3xl overflow-hidden"
      style={{
        background: sev.bg,
        border: `1px solid ${sev.color}30`,
        boxShadow: alert.severity === 'CRITICAL'
          ? `0 0 20px ${sev.color}30`
          : 'none',
      }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      layout
    >
      {/* Severity bar */}
      <div className="h-1" style={{ background: sev.color }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <KiliAvatar
            src={alert.user.avatar}
            name={alert.user.first_name}
            size="sm"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: sev.bg, color: sev.color }}
              >
                {sev.label}
              </span>
              <span className="text-[10px] text-text-muted">
                {timeAgo(alert.created_at)}
              </span>
            </div>
            <p className="text-sm font-bold text-text-primary mt-0.5">
              {alert.user.first_name || alert.user.username}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Wasaidizi</p>
            <p className="font-bold text-text-primary">
              {alert.responder_count}
            </p>
          </div>
        </div>

        {alert.message && (
          <p className="text-sm text-text-secondary mb-3 leading-relaxed">
            "{alert.message}"
          </p>
        )}

        {/* Location */}
        <div className="flex items-center gap-1.5 text-text-muted text-xs mb-4">
          <MapPin size={12} />
          {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
        </div>

        {/* Respond button */}
        {!showForm ? (
          <KiliButton
            fullWidth
            size="sm"
            onClick={() => setShowForm(true)}
            icon={<Shield size={14} />}
          >
            Jibu SOS Hii
          </KiliButton>
        ) : (
          <div className="space-y-3">
            <textarea
              value={responseMsg}
              onChange={(e) => setResponseMsg(e.target.value)}
              placeholder="Ujumbe wako kwa tourist..."
              rows={2}
              className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-3 py-2 text-sm text-text-primary outline-none focus:border-gold resize-none"
            />
            <input
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              type="number"
              placeholder="Dakika za kufika (optional)"
              className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
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
                  onRespond(
                    alert.id,
                    responseMsg,
                    eta ? parseInt(eta) : undefined,
                  )
                  setShowForm(false)
                  vibrate([100, 50, 100])
                }}
              >
                Tuma Jibu
              </KiliButton>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main SOS Page ───────────────────────────────────
export default function SOSPage() {
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

  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const wsRef = useRef(createWsManager())
  const locationRef = useRef<{ lat: number; lng: number } | null>(null)

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
  const { data: activeAlerts = [] } = useQuery({
    queryKey: ['sos-active'],
    queryFn: async () => {
      const { data } = await api.get<ActiveAlert[]>('/api/sos/active/')
      return data
    },
    enabled: isGuide || isAdmin,
    refetchInterval: 15000,
  })

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
        toast.success(`🆘 ${d.response.responder_username} anakuja!`)
        vibrate([100, 50, 100])
      }
      if (data.type === 'sos_resolved') {
        setActiveAlertId(null)
        setResponses([])
        toast.success('SOS imesuluhishwa! ✅')
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

  const respondSOS = (
    alertId: number, msg: string, eta?: number
  ) => {
    wsRef.current.send({
      action: 'respond_sos',
      alert_id: alertId,
      message: msg,
      eta_minutes: eta,
    })
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
        <div className="px-4 py-5">
          <h1 className="text-2xl font-black text-text-primary mb-1">
            🆘 SOS Monitor
          </h1>
          <p className="text-text-muted text-sm">
            Watalii wanaohitaji msaada
          </p>
        </div>

        {combinedAlerts.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="font-bold text-text-primary">
                Hakuna dharura sasa
              </p>
              <p className="text-text-muted text-sm mt-1">
                Tanzania iko salama 🌍
              </p>
            </div>
          </div>
        ) : (
          <div className="px-4 space-y-4">
            {combinedAlerts
              .sort((a, b) => {
                const order = {
                  CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3,
                }
                return (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
              })
              .map((alert) => (
                <GuideAlertCard
                  key={alert.id}
                  alert={alert}
                  onRespond={respondSOS}
                />
              ))}
          </div>
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
        <h1 className="text-2xl font-black text-text-primary">
          🆘 Usalama wa Dharura
        </h1>
        <p className="text-text-muted text-sm mt-1">
          {activeAlertId
            ? 'SOS inayoendelea...'
            : 'Shika kitufe kwa sekunde 3 kutuma SOS'}
        </p>
      </div>

      {/* Active SOS status */}
      {activeAlertId && (
        <div className="px-5 mb-4">
          <motion.div
            className="rounded-3xl p-5"
            style={{
              background: 'rgba(255,45,45,0.08)',
              border: '1px solid rgba(255,45,45,0.25)',
            }}
            animate={{ borderColor: ['rgba(255,45,45,0.25)', 'rgba(255,45,45,0.6)', 'rgba(255,45,45,0.25)'] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-kili-red animate-pulse" />
              <p className="font-bold text-kili-red">SOS INAYOENDELEA</p>
            </div>

            {responses.length > 0 && (
              <div className="space-y-2 mb-4">
                {responses.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-bg-elevated"
                  >
                    <CheckCircle size={16} className="text-kili-green flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-text-primary">
                        {r.responder_username} anakuja!
                      </p>
                      <p className="text-xs text-text-muted">
                        {r.message}
                        {r.eta_minutes && ` • ETA ${r.eta_minutes} dakika`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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