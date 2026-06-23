'use client'
// Force dynamic rendering to prevent static pre-rendering during build
// This ensures auth state is evaluated at runtime, not build time
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MapPin, Shield, Users, Clock, CheckCircle, Loader2, History, Send, AlertCircle, UserCheck, MessageSquare, XCircle, ArrowUp, Activity, Ambulance, Phone, Navigation, Eye, ArrowLeft, AlertTriangle } from 'lucide-react'
import { createWsManager } from '@/core/websocket/wsManager'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliButton } from '@/components/ui/KiliButton'
import { useAuthStore } from '@/stores/auth.store'
import { vibrate, timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'
import api from '@/core/api/axios'

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

// SOS Color System - Keep existing brand colors
const SEV_CONFIG: Record<Severity, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Chini', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  MEDIUM: { label: 'Wastani', color: '#F5A623', bg: 'rgba(245,166,35,0.12)' },
  HIGH: { label: 'Juu', color: '#FF7700', bg: 'rgba(255,119,0,0.12)' },
  CRITICAL: { label: 'Hatari!', color: '#FF2D2D', bg: 'rgba(255,45,45,0.12)' },
}

// Incident Stage Detection - Phase 1 Only
type IncidentStage = 'STAGE_0' | 'STAGE_1'

const getIncidentStage = (alert: any): IncidentStage => {
  if (!alert) return 'STAGE_0'
  
  // Phase 1: Only WAITING_FOR_RESPONDER status
  if (alert.status === 'WAITING_FOR_RESPONDER') return 'STAGE_1'
  
  // For Phase 1, treat all other active statuses as STAGE_1 for simplicity
  if (alert.status === 'ACTIVE' || alert.status === 'ASSIGNED' || 
      alert.status === 'ON_THE_WAY' || alert.status === 'ARRIVED') {
    return 'STAGE_1'
  }
  
  // Stage 0: No active incident
  return 'STAGE_0'
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
  distance_km?: number | null
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
  timeline?: TimelineEvent[]
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
    case 'GUIDE_ASSIGNED':
      return 'text-gold'
    case 'GUIDE_ACCEPTED':
      return 'text-green-400'
    case 'GUIDE_ON_THE_WAY':
      return 'text-blue-400'
    case 'GUIDE_ARRIVED':
      return 'text-purple-400'
    case 'GUIDE_COMPLETED':
      return 'text-green-400'
    case 'PRIMARY_FAILED':
      return 'text-red-400'
    case 'STANDBY_PROMOTED':
      return 'text-orange-400'
    case 'PRIMARY_REASSIGNED':
      return 'text-orange-400'
    case 'CHAT_MESSAGE':
      return 'text-blue-400'
    case 'MESSAGE_SENT':
      return 'text-blue-400'
    case 'SOS_RESOLVED':
      return 'text-green-400'
    case 'SOS_CANCELLED':
      return 'text-gray-400'
    case 'SOS_ESCALATED':
      return 'text-orange-400'
    case 'ADMIN_INTERVENTION':
      return 'text-purple-400'
    case 'ADMIN_ACTION':
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
      return `${event.actor?.first_name || 'Guide'} Interested`
    case 'GUIDE_ASSIGNED':
      return `${event.actor?.first_name || 'Guide'} Assigned`
    case 'GUIDE_ACCEPTED':
      return `${event.actor?.first_name || 'Guide'} Accepted`
    case 'GUIDE_ON_THE_WAY':
      return `${event.actor?.first_name || 'Guide'} On The Way`
    case 'GUIDE_ARRIVED':
      return `${event.actor?.first_name || 'Guide'} Arrived`
    case 'GUIDE_COMPLETED':
      return `${event.actor?.first_name || 'Guide'} Completed`
    case 'PRIMARY_FAILED':
      return 'Primary Unable To Continue'
    case 'STANDBY_PROMOTED':
      return `${event.data?.new_primary_username || 'Guide'} Promoted To Primary`
    case 'PRIMARY_REASSIGNED':
      return 'Primary Reassigned'
    case 'CHAT_MESSAGE':
      return `${event.actor?.first_name || 'User'} Sent Message`
    case 'MESSAGE_SENT':
      return `${event.actor?.first_name || 'User'} Sent Message`
    case 'SOS_RESOLVED':
      return 'SOS Resolved'
    case 'SOS_CANCELLED':
      return 'SOS Cancelled'
    case 'SOS_ESCALATED':
      return 'SOS Escalated'
    case 'ADMIN_INTERVENTION':
      return `Admin: ${event.data?.action || 'Intervention'}`
    case 'ADMIN_ACTION':
      return `Admin: ${event.data?.action || 'Action'}`
    default:
      return 'Event'
  }
}

// ── COMPONENT: Active Rescue Team Card (Hero Section) - Phase 1 Only ────────────────────────────────
function ActiveRescueTeamCard({ alert }: { alert: ActiveAlert }) {
  // Phase 1: Only show INCIDENT CREATED hero
  const getHeroContent = () => {
    return (
      <div className="text-center">
        <div className="text-4xl mb-3">🚨</div>
        <p className="text-lg font-bold text-kili-red mb-1">INCIDENT CREATED</p>
        <p className="text-xs text-text-muted">Incident #{alert.id}</p>
        <p className="text-sm text-text-muted mt-2">Searching nearby responders...</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-6 mb-4 border-2"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 45, 45, 0.12) 0%, rgba(245, 166, 35, 0.08) 100%)',
        borderColor: 'rgba(255, 45, 45, 0.3)'
      }}
    >
      {getHeroContent()}
    </motion.div>
  )
}

// ── COMPONENT: Incident Status Card ────────────────────────────────
function IncidentStatusCard({ alert }: { alert: ActiveAlert }) {
  const sev = SEV_CONFIG[alert.severity]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 mb-4 bg-white/5 border border-white/10 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-gold" />
          <p className="text-xs font-semibold text-text-muted">
            Incident Status
          </p>
        </div>
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
      </div>

      <div className="flex items-center gap-3">
        <KiliAvatar
          src={alert.user?.avatar}
          name={alert.user?.first_name || alert.user?.username || 'Unknown'}
          size="md"
        />
        <div className="flex-1">
          <p className="text-sm font-bold text-text-primary">
            {alert.user?.first_name || alert.user?.username}
          </p>
          <p className="text-xs text-text-muted">
            Incident #{alert.id} • {timeAgo(alert.created_at)}
          </p>
        </div>
      </div>

      {alert.message && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10"
        >
          <p className="text-sm text-text-secondary leading-relaxed">
            "{alert.message}"
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}

// ── COMPONENT: Timeline Section ────────────────────────────────
function TimelineSection({ timeline }: { timeline: TimelineEvent[] }) {
  if (timeline.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 mb-4 bg-white/5 border border-white/10 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-gold" />
        <p className="text-xs font-semibold text-text-primary">
          Timeline
        </p>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {timeline.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-2 p-2 rounded-lg bg-white/5"
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
    </motion.div>
  )
}

// ── COMPONENT: Chat Section (Positioned Below Timeline) ────────────────────────────────
function ChatSection({ 
  chatRoomName, 
  chatMessages, 
  chatUnreadCount, 
  onGoToChat,
  onQuickReply,
  quickReply,
  setQuickReply 
}: { 
  chatRoomName: string | null
  chatMessages: ChatMessage[]
  chatUnreadCount: number
  onGoToChat: (room: string) => void
  onQuickReply: () => void
  quickReply: string
  setQuickReply: (msg: string) => void
}) {
  const { user } = useAuthStore()

  if (!chatRoomName) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 mb-4 bg-white/5 border border-white/10 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-gold" />
          <p className="text-xs font-semibold text-text-primary">
            Communication
          </p>
        </div>
        {chatUnreadCount > 0 && (
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="px-2 py-0.5 bg-kili-red text-white text-xs rounded-full"
          >
            {chatUnreadCount} new
          </motion.span>
        )}
      </div>

      {chatMessages.length > 0 ? (
        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
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
                  src={msg.sender_avatar || undefined}
                  name={msg.sender_first_name || msg.sender_username || 'Unknown'}
                  size="xs"
                />
                <span className="text-xs font-semibold text-text-primary">
                  {msg.sender_first_name}
                </span>
                <span className="text-[10px] text-text-muted ml-auto">
                  {timeAgo(msg.timestamp)}
                </span>
              </div>
              <p className="text-text-secondary text-xs">{msg.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-muted text-xs mb-3 text-center">
          No messages yet
        </p>
      )}

      <div className="flex gap-2">
        <input
          value={quickReply}
          onChange={(e) => setQuickReply(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-gold"
          onKeyPress={(e) => {
            if (e.key === 'Enter') onQuickReply()
          }}
        />
        <KiliButton
          size="sm"
          disabled={!quickReply.trim()}
          onClick={onQuickReply}
          icon={<Send size={14} />}
        >
          Send
        </KiliButton>
      </div>

      <KiliButton
        fullWidth
        size="sm"
        variant="ghost"
        className="mt-2"
        onClick={() => onGoToChat(chatRoomName)}
        icon={<Users size={14} />}
      >
        Open Full Chat
      </KiliButton>
    </motion.div>
  )
}

// ── COMPONENT: Rescue Progress Tracker - Phase 1 Only ────────────────────────────────
function RescueProgressTracker() {
  // Phase 1: Only Incident Created is completed
  const steps = [
    { label: 'Incident Created', completed: true },
    { label: 'Responders Found', completed: false },
    { label: 'Primary Assigned', completed: false },
    { label: 'Mission Accepted', completed: false },
    { label: 'On The Way', completed: false },
    { label: 'Arrived', completed: false },
    { label: 'Completed', completed: false },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 mb-4 bg-white/5 border border-white/10 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-gold" />
        <p className="text-xs font-semibold text-text-muted">
          Rescue Progress
        </p>
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2">
            <span className="text-sm">
              {step.completed ? '✅' : '⏳'}
            </span>
            <p className={`text-xs ${step.completed ? 'text-text-primary' : 'text-text-muted'}`}>
              {step.label}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── COMPONENT: Rescue Confidence Card - Phase 2 (Dynamic) ────────────────────────────────
function RescueConfidenceCard({ alert }: { alert: ActiveAlert }) {
  // STEP 2: Dynamic confidence based on responder count
  const getConfidence = () => {
    const count = alert.responder_count || 0
    if (count === 0) {
      return { emoji: '🔴', label: 'LOW', color: 'text-red-400' }
    } else if (count === 1) {
      return { emoji: '🟡', label: 'MEDIUM', color: 'text-yellow-400' }
    } else {
      return { emoji: '🟢', label: 'HIGH', color: 'text-green-400' }
    }
  }

  const confidence = getConfidence()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 mb-4 bg-white/5 border border-white/10 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-gold" />
          <p className="text-xs font-semibold text-text-muted">
            Rescue Confidence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{confidence.emoji}</span>
          <span className={`text-sm font-bold ${confidence.color}`}>
            {confidence.label}
          </span>
        </div>
      </div>

      <p className="text-xs text-text-muted mt-2">
        Nearby Responders: {alert.responder_count || 0}
      </p>
    </motion.div>
  )
}

// ── COMPONENT: Tourist Stage 0 (No Active Incident) ────────────────────────────────
function TouristStage0({ 
  severity, 
  setSeverity, 
  message, 
  setMessage, 
  isHolding, 
  holdProgress, 
  startHold, 
  stopHold,
  myAlerts,
  setShowHistory
}: { 
  severity: Severity
  setSeverity: (s: Severity) => void
  message: string
  setMessage: (m: string) => void
  isHolding: boolean
  holdProgress: number
  startHold: () => void
  stopHold: () => void
  myAlerts: any[]
  setShowHistory: (show: boolean) => void
}) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-5 py-5">
        <h1 className="text-2xl font-black text-text-primary mb-1">
          🚨 EMERGENCY SOS
        </h1>
        <p className="text-text-muted text-sm">
          Need immediate help?
        </p>
      </div>

      {/* Recent Incidents */}
      {myAlerts.length > 0 && (
        <div className="px-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-text-muted">
              Recent Incidents
            </p>
            <button
              onClick={() => setShowHistory(true)}
              className="text-xs text-gold"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {myAlerts.slice(0, 3).map((alert: any) => (
              <div
                key={alert.id}
                className="p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-kili-red">
                    Incident #{alert.id}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {timeAgo(alert.created_at)}
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  {alert.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Severity Selector */}
      <div className="px-5 mb-6">
        <p className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wider">
          Severity Level
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

      {/* Message Input */}
      <div className="px-5 mb-8">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your situation... (optional)"
          rows={2}
          className="w-full bg-white/5 border border-white/20 rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-kili-red resize-none"
        />
      </div>

      {/* Hold Button */}
      <div className="flex-1 flex flex-col items-center justify-center px-10">
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

        <p className="text-text-muted text-sm mt-8 text-center">
          {isHolding
            ? '⏱ Keep holding...'
            : '👆 Hold for 3 seconds to activate'}
        </p>
      </div>
    </div>
  )
}

// ── COMPONENT: Promoted To Primary Modal ────────────────────────────────
function PromotedToPrimaryModal({ 
  alertId, 
  onAccept, 
  onClose 
}: { 
  alertId: number
  onAccept: () => void
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-gold/50 shadow-2xl"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-6xl mb-4"
            >
              🚨
            </motion.div>
            
            <h2 className="text-2xl font-black text-gold mb-2">
              YOU ARE NOW PRIMARY RESPONDER
            </h2>
            
            <p className="text-text-muted text-sm mb-6">
              Incident #{alertId}
            </p>
            
            <div className="space-y-3">
              <KiliButton
                fullWidth
                size="lg"
                variant="primary"
                icon={<CheckCircle size={18} />}
                onClick={onAccept}
              >
                Accept Mission
              </KiliButton>
              
              <KiliButton
                fullWidth
                size="lg"
                variant="ghost"
                onClick={onClose}
              >
                Decline
              </KiliButton>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── COMPONENT: Guide Interest Modal ────────────────────────────────
function GuideInterestModal({ 
  alertId, 
  distanceKm,
  onSubmit, 
  onClose 
}: { 
  alertId: number
  distanceKm: number | null
  onSubmit: (message: string, eta: number | null) => void
  onClose: () => void
}) {
  const [message, setMessage] = useState('')
  const [eta, setEta] = useState<number | null>(null)

  // Calculate estimated ETA based on distance (assuming 30km/h average speed)
  const suggestedEta = distanceKm ? Math.ceil((distanceKm / 30) * 60) : null

  const handleSubmit = () => {
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }
    onSubmit(message.trim(), eta)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-gold/50 shadow-2xl"
        >
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-6xl mb-4"
            >
              🛟
            </motion.div>
            
            <h2 className="text-2xl font-black text-gold mb-2">
              Express Interest
            </h2>
            
            <p className="text-text-muted text-sm">
              Incident #{alertId}
              {distanceKm !== null && (
                <span className="ml-2">• {distanceKm.toFixed(1)} km away</span>
              )}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-2">
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe how you can help..."
                rows={3}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-2">
                Estimated Arrival Time (minutes)
              </label>
              <input
                type="number"
                value={eta || ''}
                onChange={(e) => setEta(e.target.value ? parseInt(e.target.value) : null)}
                placeholder={suggestedEta ? `Suggested: ${suggestedEta} min` : 'Enter ETA...'}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold"
              />
              {suggestedEta && !eta && (
                <p className="text-xs text-text-muted mt-1">
                  Based on {distanceKm?.toFixed(1)} km distance at 30km/h
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <KiliButton
                fullWidth
                size="lg"
                variant="primary"
                icon={<Shield size={18} />}
                onClick={handleSubmit}
                disabled={!message.trim()}
              >
                Submit Interest
              </KiliButton>
              
              <KiliButton
                fullWidth
                size="lg"
                variant="ghost"
                onClick={onClose}
              >
                Cancel
              </KiliButton>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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
  const [isHolding, setIsHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [guideAlerts, setGuideAlerts] = useState<ActiveAlert[]>([])
  const [chatRoomName, setChatRoomName] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [quickReply, setQuickReply] = useState('')
  const [guideChatMessages, setGuideChatMessages] = useState<Record<number, ChatMessage[]>>({})
  const [guideChatUnreadCount, setGuideChatUnreadCount] = useState<Record<number, number>>({})
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [showPromotedModal, setShowPromotedModal] = useState(false)
  const [promotedAlertId, setPromotedAlertId] = useState<number | null>(null)
  const [showInterestModal, setShowInterestModal] = useState(false)
  const [interestAlertId, setInterestAlertId] = useState<number | null>(null)
  const [interestMessage, setInterestMessage] = useState('')
  const [interestEta, setInterestEta] = useState<number | null>(null)
  // STEP 2: Track which alerts the guide has expressed interest in (moved to top level for WebSocket access)
  const [interestedAlerts, setInterestedAlerts] = useState<Set<number>>(new Set())

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
  const { data: activeAlerts = [], isLoading: isLoadingActive } = useQuery({
    queryKey: ['sos-active'],
    queryFn: async () => {
      const { data } = await api.get<ActiveAlert[]>('/api/sos/active/')
      return data
    },
    enabled: isGuide || isAdmin,
    refetchInterval: 15000,
  })

  // Load tourist's own alerts
  const { data: myAlerts = [], isLoading: isLoadingMyAlerts } = useQuery({
    queryKey: ['sos-my-alerts'],
    queryFn: async () => {
      const { data } = await api.get<any[]>('/api/sos/my-alerts/?include_responses=true')
      return data
    },
    enabled: !isGuide && !isAdmin,
    refetchInterval: 10000,
  })

  // STEP 2: Initialize interestedAlerts from API responses for guide state persistence
  useEffect(() => {
    if (isGuide || isAdmin) {
      const combinedAlerts = [
        ...guideAlerts,
        ...activeAlerts.filter((a) => !guideAlerts.find((g) => a.id === a.id)),
      ]
      const initialSet = new Set<number>()
      combinedAlerts.forEach((alert: ActiveAlert) => {
        if (alert.responses) {
          alert.responses.forEach((response: any) => {
            if (response.responder_id === user?.id) {
              initialSet.add(alert.id)
            }
          })
        }
      })
      setInterestedAlerts(initialSet)
    }
  }, [activeAlerts, guideAlerts, isGuide, isAdmin, user?.id])

  // State restoration for tourists
  useEffect(() => {
    if (!isGuide && !isAdmin && myAlerts.length > 0) {
      const activeAlert = myAlerts.find((a: any) =>
        a.status === 'WAITING_FOR_RESPONDER' || a.status === 'ACTIVE' || a.status === 'RESPONDING' || 
        a.status === 'ASSIGNED' || a.status === 'ON_THE_WAY' || a.status === 'ARRIVED'
      )

      if (activeAlert) {
        setActiveAlertId(activeAlert.id)
        wsRef.current.send({
          action: 'join_incident',
          alert_id: activeAlert.id,
        })

        if (activeAlert.chat_room_name) {
          setChatRoomName(activeAlert.chat_room_name)
        }

        // Fetch timeline
        fetchTimeline(activeAlert.id)
      } else {
        setActiveAlertId(null)
        setChatRoomName(null)
        setTimeline([])
      }
    }
  }, [myAlerts, isGuide, isAdmin])

  // WebSocket connection
  useEffect(() => {
    const ws = wsRef.current
    ws.connect('/ws/sos/')

    const off = ws.on((data) => {
      if (data.type === 'sos_created') {
        setActiveAlertId((data as { alert_id: number }).alert_id)
        vibrate([200, 100, 200])
      }
      if (data.type === 'sos_resolved') {
        setActiveAlertId(null)
        setChatRoomName(null)
        toast.success('SOS Resolved! ✅')
      }
      if (data.type === 'sos_cancelled') {
        setActiveAlertId(null)
        setChatRoomName(null)
        toast.info('SOS Cancelled')
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
      if (data.type === 'guide_promoted') {
        const d = data as { alert_id: number; new_primary_username: string }
        setPromotedAlertId(d.alert_id)
        setShowPromotedModal(true)
        vibrate([500, 100, 500, 100, 500])
        toast.error(`🚨 You are now Primary Responder for Incident #${d.alert_id}`)
      }
      if (data.type === 'primary_reassigned') {
        const d = data as { alert_id: number; new_primary_username: string }
        toast.info(`🔄 Primary reassigned to ${d.new_primary_username}`)
        // Refresh alerts to get updated data
        if (isGuide || isAdmin) {
          // Trigger refetch by invalidating query
        }
      }
      if (data.type === 'timeline_update') {
        const d = data as { alert_id: number; timeline: TimelineEvent[] }
        if (activeAlertId === d.alert_id) {
          setTimeline(d.timeline)
        }
      }
      // STEP 2: Handle interest registration confirmation for guides
      if (data.type === 'sos_interest_registered') {
        const d = data as { alert_id: number; responder_id: number }
        if (isGuide || isAdmin) {
          // Update interested alerts state
          setInterestedAlerts((prev: Set<number>) => new Set([...prev, d.alert_id]))
          toast.success('✅ Interest registered')
        }
      }
      // STEP 2: Handle responder interest updates for tourist and admin
      if (data.type === 'sos_responder_interest') {
        const d = data as { alert_id: number; responder_count: number; responder: { id: number; username: string } }
        
        // Update guide/admin alerts with new responder count
        if (isGuide || isAdmin) {
          setGuideAlerts((prev: ActiveAlert[]) => 
            prev.map((alert: ActiveAlert) => 
              alert.id === d.alert_id 
                ? { ...alert, responder_count: d.responder_count }
                : alert
            )
          )
        }
        
        // Refresh timeline to show new interest event
        if (activeAlertId === d.alert_id) {
          fetchTimeline(d.alert_id)
        }
      }
    })

    return () => {
      off()
      ws.disconnect()
    }
  }, [])

  // Chat WebSocket
  useEffect(() => {
    if (!chatRoomName) return

    const chatWs = chatWsRef.current
    chatWs.connect(`/ws/chat/${chatRoomName}/`)

    const off = chatWs.on((data) => {
      if (data.type === 'message') {
        const msg = data as unknown as ChatMessage
        setChatMessages((prev) => [...prev, msg])
        if (msg.sender_id !== user?.id) {
          setChatUnreadCount((prev) => prev + 1)
          vibrate([50])
        }
      }
    })

    return () => {
      off()
      chatWs.disconnect()
    }
  }, [chatRoomName, user?.id])

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
      toast.error('GPS not available. Try again.')
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
    toast.success('🆘 SOS Sent! Searching for responders...')
  }, [severity, message])

  const goToChat = (chatRoomName: string) => {
    router.push(`/chat?room=${chatRoomName}`)
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

  // ── GUIDE VIEW - Phase 1 Only ───────────────────────────────────
  if (isGuide || isAdmin) {
    const combinedAlerts = [
      ...guideAlerts,
      ...activeAlerts.filter((a) => !guideAlerts.find((g) => a.id === a.id)),
    ]

    const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null)
    const selectedAlert = combinedAlerts.find((a) => a.id === selectedAlertId)

    return (
      <div className="h-dvh flex flex-col bg-bg-base pt-safe pb-safe">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-5"
        >
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-black text-text-primary">
              Nearby Incidents
            </h1>
            {combinedAlerts.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-3 py-1 bg-kili-red text-white text-xs font-bold rounded-full"
              >
                {combinedAlerts.length}
              </motion.div>
            )}
          </div>
          <p className="text-text-muted text-sm">
            Tourists requiring assistance
          </p>
        </motion.div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoadingActive ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gold" />
              <p className="text-text-muted text-sm">Loading incidents...</p>
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
                <p className="font-bold text-text-primary">No active incidents</p>
                <p className="text-text-muted text-sm mt-1">Tanzania is safe 🌍</p>
              </div>
            </motion.div>
          ) : selectedAlert ? (
            // Incident Detail View
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="px-4 pb-4"
            >
              <motion.button
                onClick={() => setSelectedAlertId(null)}
                className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Incidents
              </motion.button>

              <motion.div
                className="rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-xl border-2 border-white/20 shadow-2xl p-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 45, 45, 0.15) 0%, rgba(255, 45, 45, 0.05) 100%)',
                  borderColor: 'rgba(255, 45, 45, 0.4)'
                }}
              >
                {/* STEP 2: Show INTERESTED status or I'm Interested button */}
                {interestedAlerts.has(selectedAlert.id) ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 mb-4"
                  >
                    <div className="rounded-2xl p-4 bg-yellow-500/10 border border-yellow-500/30">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🟡</span>
                        <p className="text-sm font-bold text-yellow-400">
                          INTEREST REGISTERED
                        </p>
                      </div>
                      <p className="text-xs text-text-muted">
                        Waiting For Dispatch Decision
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 mb-4"
                  >
                    <KiliButton
                      fullWidth
                      size="lg"
                      variant="primary"
                      icon={<Shield size={18} />}
                      onClick={() => {
                        // STEP 2: Update state immediately for instant UI feedback
                        setInterestedAlerts((prev: Set<number>) => new Set([...prev, selectedAlert.id]))
                        // Send interest response via WebSocket
                        wsRef.current.send({
                          action: 'respond_sos',
                          alert_id: selectedAlert.id,
                          message: 'I am interested',
                          eta_minutes: 5,
                        })
                        toast.success('✅ Interest registered')
                      }}
                    >
                      I'm Interested
                    </KiliButton>
                  </motion.div>
                )}

                {/* Incident Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <KiliAvatar
                      src={selectedAlert.user?.avatar}
                      name={selectedAlert.user?.first_name || selectedAlert.user?.username || 'Unknown'}
                      size="md"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-text-primary">
                        {selectedAlert.user?.first_name || selectedAlert.user?.username}
                      </p>
                      <p className="text-xs text-text-muted">
                        SOS #{selectedAlert.id} • {timeAgo(selectedAlert.created_at)}
                      </p>
                      {selectedAlert.distance_km !== undefined && selectedAlert.distance_km !== null && (
                        <p className="text-xs text-text-muted">
                          Distance: {selectedAlert.distance_km} km
                        </p>
                      )}
                    </div>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-lg font-bold text-sm border"
                    style={{
                      backgroundColor: SEV_CONFIG[selectedAlert.severity]?.bg || 'rgba(255,45,45,0.12)',
                      color: SEV_CONFIG[selectedAlert.severity]?.color || '#FF2D2D',
                      borderColor: SEV_CONFIG[selectedAlert.severity]?.color || '#FF2D2D',
                    }}
                  >
                    {SEV_CONFIG[selectedAlert.severity]?.label || selectedAlert.severity}
                  </div>
                </div>

                {/* Tourist Assistance Message */}
                <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
                  <p className="text-text-primary text-sm font-medium">
                    Tourist needs assistance
                  </p>
                  {selectedAlert.message && (
                    <p className="text-text-muted text-xs mt-2">
                      {selectedAlert.message}
                    </p>
                  )}
                </div>

                {/* Timeline */}
                {selectedAlert.timeline && selectedAlert.timeline.length > 0 && (
                  <TimelineSection timeline={selectedAlert.timeline} />
                )}
              </motion.div>
            </motion.div>
          ) : (
            // Incident List View
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 pb-4 space-y-4"
            >
            {combinedAlerts
              .sort((a, b) => {
                const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
                return (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
              })
              .map((alert, index) => {
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 backdrop-blur-xl border-2 border-white/20 shadow-2xl p-5"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 45, 45, 0.15) 0%, rgba(255, 45, 45, 0.05) 100%)',
                      borderColor: 'rgba(255, 45, 45, 0.4)'
                    }}
                  >
                    {/* Incident Info */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full bg-kili-red/20 flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-kili-red" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-text-primary">
                              🚨 SOS #{alert.id}
                            </p>
                            {/* STEP 2: Show INTERESTED badge if guide has expressed interest */}
                            {interestedAlerts.has(alert.id) && (
                              <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-[10px] font-bold text-yellow-400">
                                ✅ INTERESTED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted">
                            {timeAgo(alert.created_at)}
                          </p>
                          {alert.distance_km !== undefined && alert.distance_km !== null && (
                            <p className="text-xs text-text-muted">
                              Distance: {alert.distance_km} km
                            </p>
                          )}
                        </div>
                      </div>
                      <div
                        className="px-3 py-1.5 rounded-lg font-bold text-sm border"
                        style={{
                          backgroundColor: SEV_CONFIG[alert.severity]?.bg || 'rgba(255,45,45,0.12)',
                          color: SEV_CONFIG[alert.severity]?.color || '#FF2D2D',
                          borderColor: SEV_CONFIG[alert.severity]?.color || '#FF2D2D',
                        }}
                      >
                        {SEV_CONFIG[alert.severity]?.label || alert.severity}
                      </div>
                    </div>

                    {/* View Button */}
                    <KiliButton
                      fullWidth
                      size="lg"
                      variant="outline"
                      onClick={() => setSelectedAlertId(alert.id)}
                    >
                      VIEW
                    </KiliButton>
                  </motion.div>
                )
              })}
          </motion.div>
        )}
        </div>
      </div>
    )
  }

  // ── TOURIST VIEW ───────────────────────────────────
  const activeAlert = myAlerts.find((a: any) => a.id === activeAlertId)
  const stage = activeAlert ? getIncidentStage(activeAlert) : 'STAGE_0'

  return (
    <div className="h-dvh flex flex-col bg-bg-base pt-safe pb-safe">
      {stage === 'STAGE_0' ? (
        <TouristStage0
          severity={severity}
          setSeverity={setSeverity}
          message={message}
          setMessage={setMessage}
          isHolding={isHolding}
          holdProgress={holdProgress}
          startHold={startHold}
          stopHold={stopHold}
          myAlerts={myAlerts}
          setShowHistory={setShowHistory}
        />
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="px-4 py-5">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl font-black text-text-primary mb-1">
                🚑 Emergency Incident Center
              </h1>
              <p className="text-text-muted text-sm">
                Incident #{activeAlert?.id}
              </p>
            </motion.div>
          </div>

          <div className="px-4 pb-24 space-y-4">
            {/* Active Rescue Team Card (Hero Section) */}
            <ActiveRescueTeamCard alert={activeAlert} />

            {/* Incident Status Card */}
            <IncidentStatusCard alert={activeAlert} />

            {/* Rescue Progress Tracker */}
            <RescueProgressTracker />

            {/* Rescue Confidence Card */}
            <RescueConfidenceCard alert={activeAlert} />

            {/* Timeline Section */}
            <TimelineSection timeline={timeline} />
          </div>
        </div>
      )}
    </div>
  )
}