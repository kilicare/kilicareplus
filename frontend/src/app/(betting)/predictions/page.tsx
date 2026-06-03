'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  TrendingUp, Zap, Target, MessageCircle, History, BarChart3,
  Lock, Play, ArrowRight, Brain, Loader2, Send, Calendar,
} from 'lucide-react'
import api from '@/core/api/axios'
import { KiliButton } from '@/components/ui/KiliButton'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import { Modern3DPredictionCard } from '@/components/betting/Modern3DPredictionCard'
import { ModernGenerateForm } from '@/components/betting/ModernGenerateForm'
import { PredictionWelcomeCard } from '@/components/betting/PredictionWelcomeCard'

// Types
type Mode = 'today' | 'generate' | 'ai-chat' | 'history' | 'analytics'

interface Prediction {
  home_win_prob?: number
  draw_prob?: number
  away_win_prob?: number
  confidence?: number
  value_bet?: string
  [key: string]: any
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// Mode Switcher
function ModeSwitcher({ mode, onChangeMode, isPremium }: any) {
  const modes = [
    { key: 'today', label: '📅 Today', icon: Calendar },
    { key: 'generate', label: '✨ Generate', icon: Zap },
    { key: 'ai-chat', label: '🤖 AI Chat', icon: Brain },
    { key: 'history', label: '📜 History', icon: History },
    { key: 'analytics', label: '📊 Analytics', icon: BarChart3 },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
      {modes.map((m: any) => (
        <motion.button
          key={m.key}
          onClick={() => onChangeMode(m.key)}
          className={cn(
            'px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all',
            mode === m.key
              ? 'bg-gold text-black'
              : 'bg-white/5 text-text-secondary hover:bg-white/10'
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {m.label}
        </motion.button>
      ))}
    </div>
  )
}

// Dynamic Data Visualizer
function DataVisualizer({ data }: { data: any }) {
  if (!data || typeof data !== 'object') return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Object.entries(data).map(([key, value]: any) => {
        // Skip null/undefined
        if (value === null || value === undefined) return null

        // Probability bars (0-1 or 0-100)
        if (typeof value === 'number' && value >= 0 && value <= 100) {
          return (
            <motion.div
              key={key}
              className="p-3 rounded-xl bg-white/5 border border-white/10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-xs text-text-muted mb-1 capitalize">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-6 rounded-lg bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-gold to-gold-dim flex items-center justify-end pr-2"
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  >
                    {value > 20 && (
                      <span className="text-xs font-bold text-black">{value}%</span>
                    )}
                  </motion.div>
                </div>
                {value <= 20 && (
                  <span className="text-sm font-bold text-gold">{value}%</span>
                )}
              </div>
            </motion.div>
          )
        }

        // Text values
        if (typeof value === 'string') {
          return (
            <motion.div
              key={key}
              className="p-3 rounded-xl bg-white/5 border border-white/10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-xs text-text-muted capitalize mb-1">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="text-sm font-bold text-gold">{value}</div>
            </motion.div>
          )
        }

        // Numeric values
        if (typeof value === 'number') {
          return (
            <motion.div
              key={key}
              className="p-3 rounded-xl bg-white/5 border border-white/10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-xs text-text-muted capitalize mb-1">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="text-lg font-black text-text-primary">
                {value.toFixed(2)}
              </div>
            </motion.div>
          )
        }

        return null
      })}
    </div>
  )
}

// Today's Predictions
function TodayMode({ isPremium }: any) {
  const [league, setLeague] = useState('EPL')

  const { data: pred, isLoading } = useQuery({
    queryKey: ['predictions', league],
    queryFn: async () => {
      const { data } = await api.get(`/api/predictions/today/?league=${league}`)
      return data
    },
    staleTime: 1000 * 60 * 5,
  })

  const LEAGUES = [
    { key: 'EPL', label: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { key: 'LA_LIGA', label: 'La Liga', flag: '🇪🇸' },
    { key: 'BUNDESLIGA', label: 'Bundesliga', flag: '🇩🇪' },
  ]

  const matches = pred?.matches || []

  return (
    <div className="space-y-4">
      {/* League Filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {LEAGUES.map((lg) => (
          <motion.button
            key={lg.key}
            onClick={() => setLeague(lg.key)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all border-2',
              league === lg.key
                ? 'bg-gold border-gold text-black shadow-lg shadow-gold/30'
                : 'bg-white/5 border-white/20 text-text-muted hover:border-white/40'
            )}
          >
            {lg.flag} {lg.label}
          </motion.button>
        ))}
      </div>

      {/* Matches Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
          {[1, 2, 3].map((i) => (
            <Modern3DPredictionCard key={i} isLoading={true} index={i - 1} homeTeam="" awayTeam="" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 px-6"
        >
          <div className="max-w-md mx-auto">
            <Brain size={48} className="mx-auto mb-6 opacity-40 text-gold" />
            <p className="text-2xl font-black bg-gradient-to-r from-text-primary to-gold bg-clip-text text-transparent mb-3">
              📊 No Matches Today
            </p>
            <div className="space-y-3 text-text-muted">
              <p className="text-base">
                Hakuna mechi ya {league} zinazocheza leo
              </p>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm space-y-2">
                <p className="text-white/70">
                  <span className="font-semibold">Sababu zinazowezekana:</span>
                </p>
                <ul className="text-left space-y-1 text-white/60">
                  <li>• ✓ Ligi hiyo imekamilisha mechi za leo</li>
                  <li>• ✓ Hakuna mechi zilizocheza leo</li>
                  
                </ul>
              </div>
              <p className="text-xs text-white/50 mt-4">
                💡 Jaribu ligi nyingine au rudi baadaye
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {matches.map((match: any, idx: number) => (
            <Modern3DPredictionCard
              key={match.id}
              index={idx}
              homeTeam={match.home_team}
              awayTeam={match.away_team}
              league={match.league}
              homeWin={match.home_win_prob ? match.home_win_prob * 100 : 0}
              draw={match.draw_prob ? match.draw_prob * 100 : 0}
              awayWin={match.away_win_prob ? match.away_win_prob * 100 : 0}
              confidence={match.confidence ? match.confidence * 100 : 0}
              btts={match.btts_prob ? match.btts_prob * 100 : 0}
              over25={match.over_25_prob ? match.over_25_prob * 100 : 0}
              valueMarket={match.value_bet}
              explanations={match.explanations}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}

// Generate Prediction
function GenerateMode() {
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [league, setLeague] = useState('EPL')
  const [prediction, setPrediction] = useState<Prediction | null>(null)

  const mut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/predictions/generate/', {
        home_team: home,
        away_team: away,
        league,
      })
      return data
    },
    onSuccess: (data) => {
      setPrediction(data.prediction)
      toast.success('Prediction generated!')
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.error || 'Error generating prediction')
    },
  })

  const handleGenerate = async () => {
    await mut.mutateAsync()
  }

  return (
    <div className="space-y-6">
      <ModernGenerateForm 
        onSubmit={async (homeTeam, awayTeam, selectedLeague) => {
          setHome(homeTeam)
          setAway(awayTeam)
          setLeague(selectedLeague)
          await mut.mutateAsync()
        }}
        isLoading={mut.isPending}
      />

      {/* Result Card */}
      {prediction && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="pt-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
            <Modern3DPredictionCard
              homeTeam={home}
              awayTeam={away}
              league={league}
              homeWin={prediction.home_win_prob ? prediction.home_win_prob * 100 : 0}
              draw={prediction.draw_prob ? prediction.draw_prob * 100 : 0}
              awayWin={prediction.away_win_prob ? prediction.away_win_prob * 100 : 0}
              confidence={prediction.confidence ? prediction.confidence * 100 : 0}
              btts={prediction.btts_prob ? prediction.btts_prob * 100 : 0}
              over25={prediction.over_25_prob ? prediction.over_25_prob * 100 : 0}
              valueMarket={prediction.value_bet}
              index={0}
            />
          </div>
        </motion.div>
      )}
    </div>
  )
}

// AI Chat Mode (Now FREE for everyone!)
function AIChatMode() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [currentPrediction, setCurrentPrediction] = useState<any>(null)
  const messagesEnd = useRef<HTMLDivElement>(null)
  
  const mut = useMutation({
    mutationFn: async (query: string) => {
      // Try betting prediction first (if query looks like a match request)
      const matchKeywords = ['vs', 'versus', 'v ', 'against', 'dhidi ya', '-']
      const isMatchQuery = matchKeywords.some(kw => query.toLowerCase().includes(kw))
      
      if (isMatchQuery) {
        const { data } = await api.post('/api/ai/betting/predict/', {
          query,
        })
        return { type: 'prediction', data }
      } else {
        // Regular AI chat
        const { data } = await api.post('/api/ai/chat/', {
          message: query,
          context: 'betting',
          lang: 'en',
        })
        return { type: 'chat', data }
      }
    },
    onSuccess: (result) => {
      if (result.type === 'prediction') {
        const { home_team, away_team, league, prediction, explanations } = result.data
        setCurrentPrediction(result.data)
        setMessages((prev) => [
          ...prev,
          {
            role: 'user',
            content: input,
          },
          {
            role: 'assistant',
            type: 'prediction',
            content: `📊 Match Prediction: **${home_team} vs ${away_team}** (${league})`,
            data: {
              home_team,
              away_team,
              league,
              prediction,
              explanations,
            },
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: input },
          { role: 'assistant', type: 'chat', content: result.data.reply },
        ])
      }
      setInput('')
      setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    },
    onError: (e: any) => {
      const error = e.response?.data?.error || e.message || 'Error'
      toast.error(error)
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: input },
        { role: 'assistant', type: 'error', content: `❌ ${error}` },
      ])
      setInput('')
    },
  })

  const handleSend = () => {
    if (!input.trim()) return
    mut.mutate(input)
  }

  return (
    <div className="flex flex-col h-[700px] gap-4">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <Brain size={48} className="mx-auto mb-4 opacity-50" />
            <p className="mb-2">🤖 AI Betting Assistant</p>
            <p className="text-sm">Try: "Chelsea vs Arsenal" or "Who wins Man City vs Liverpool?"</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          if (msg.role === 'user') {
            return (
              <motion.div
                key={idx}
                className="flex justify-end"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="px-4 py-2 rounded-2xl bg-gold text-black max-w-xs text-sm">
                  {msg.content}
                </div>
              </motion.div>
            )
          }

          if (msg.type === 'error') {
            return (
              <motion.div
                key={idx}
                className="flex justify-start"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="px-4 py-2 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 max-w-lg text-sm">
                  {msg.content}
                </div>
              </motion.div>
            )
          }

          if (msg.type === 'prediction') {
            const { home_team, away_team, league, prediction, explanations } = msg.data
            const home_win = prediction.home_win_prob ? prediction.home_win_prob * 100 : 0
            const draw = prediction.draw_prob ? prediction.draw_prob * 100 : 0
            const away_win = prediction.away_win_prob ? prediction.away_win_prob * 100 : 0
            const confidence = prediction.confidence ? prediction.confidence * 100 : 0

            return (
              <motion.div
                key={idx}
                className="flex justify-start"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-full max-w-md">
                  <Modern3DPredictionCard
                    homeTeam={home_team}
                    awayTeam={away_team}
                    league={league}
                    homeWin={home_win}
                    draw={draw}
                    awayWin={away_win}
                    confidence={confidence}
                    btts={prediction.btts_prob ? prediction.btts_prob * 100 : 0}
                    over25={prediction.over_25_prob ? prediction.over_25_prob * 100 : 0}
                    valueMarket={prediction.value_bet}
                    riskLevel={explanations?.risk_level}
                    explanations={explanations}
                  />
                </div>
              </motion.div>
            )
          }

          return (
            <motion.div
              key={idx}
              className="flex justify-start"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 max-w-lg text-sm text-text-primary">
                {msg.content}
              </div>
            </motion.div>
          )
        })}

        {mut.isPending && (
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
              <Loader2 size={16} className="animate-spin text-gold" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-2">
        <input
          type="text"
          placeholder='Try: "Chelsea vs Arsenal" or "Who wins Man City?"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={mut.isPending}
          className="flex-1 px-4 py-2 bg-transparent text-text-primary placeholder-text-muted outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || mut.isPending}
          className="p-2 rounded-lg bg-gold/20 hover:bg-gold/30 text-gold disabled:opacity-50 transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

// History Mode
function HistoryMode() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['prediction-history'],
    queryFn: async () => {
      const { data } = await api.get('/api/predictions/history/?limit=50')
      return data
    },
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  const preds = history?.predictions || []

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
      {preds.map((p: any, idx: number) => (
        <Modern3DPredictionCard
          key={p.id}
          index={idx}
          homeTeam={p.home_team}
          awayTeam={p.away_team}
          league={p.league}
          homeWin={p.prediction?.home_win_prob ? p.prediction.home_win_prob * 100 : 0}
          draw={p.prediction?.draw_prob ? p.prediction.draw_prob * 100 : 0}
          awayWin={p.prediction?.away_win_prob ? p.prediction.away_win_prob * 100 : 0}
          confidence={p.prediction?.confidence ? p.prediction.confidence * 100 : 0}
          btts={p.prediction?.btts_prob ? p.prediction.btts_prob * 100 : 0}
          over25={p.prediction?.over_25_prob ? p.prediction.over_25_prob * 100 : 0}
          valueMarket={p.prediction?.value_bet}
          explanations={p.explanations}
        />
      ))}
    </div>
  )
}

// Analytics Mode
function AnalyticsMode() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['prediction-analytics'],
    queryFn: async () => {
      const { data } = await api.get('/api/predictions/analytics/')
      return data
    },
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/30 backdrop-blur-xl text-center group cursor-pointer"
        >
          <p className="text-4xl font-black text-gold group-hover:scale-110 transition-transform">
            {analytics?.total_predictions || 0}
          </p>
          <p className="text-sm text-white/70 mt-2">Total Predictions</p>
          <p className="text-xs text-gold/60 mt-1">📊</p>
        </motion.div>
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-green-500/30 to-green-600/10 border border-green-400/30 backdrop-blur-xl text-center group cursor-pointer"
        >
          <p className="text-4xl font-black text-green-400 group-hover:scale-110 transition-transform">
            {analytics?.with_feedback || 0}
          </p>
          <p className="text-sm text-white/70 mt-2">With Results</p>
          <p className="text-xs text-green-400/60 mt-1">✅</p>
        </motion.div>
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/30 to-blue-600/10 border border-blue-400/30 backdrop-blur-xl text-center group cursor-pointer"
        >
          <p className="text-4xl font-black text-blue-400 group-hover:scale-110 transition-transform">
            {analytics?.accuracy_rate?.toFixed(1) || 0}%
          </p>
          <p className="text-sm text-white/70 mt-2">Accuracy</p>
          <p className="text-xs text-blue-400/60 mt-1">🎯</p>
        </motion.div>
      </motion.div>

      {/* League breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 border border-white/15 backdrop-blur-xl"
      >
        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-gold" />
          By League
        </h3>
        <div className="space-y-3">
          {Object.entries(analytics?.by_league || {}).map(([league, count]: any, idx: number) => (
            <motion.div
              key={league}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors group"
            >
              <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{league}</span>
              <motion.span
                whileHover={{ scale: 1.1 }}
                className="text-lg font-black text-gold bg-gold/20 px-3 py-1 rounded-lg"
              >
                {count}
              </motion.span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function PredictionsPage() {
  const { user } = useAuthStore()
  const [mode, setMode] = useState<Mode>('today')
  const [showWelcome, setShowWelcome] = useState(true)

  const { data: userInfo } = useQuery({
    queryKey: ['user-predictions-info'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me/')
      return data
    },
  })

  const isPremium = userInfo?.has_predictions === true

  return (
    <div className="min-h-dvh bg-bg-base overflow-y-auto no-scrollbar pb-safe">
      {/* Header */}
      <motion.div
        className="px-5 pt-safe pt-6 pb-4 sticky top-0 bg-bg-base/80 backdrop-blur-xl border-b border-white/10 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-black bg-gradient-to-r from-text-primary to-gold bg-clip-text text-transparent">
            🎯 Predictions Pro
          </h1>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowWelcome(!showWelcome)}
              className={`px-3 py-1.5 rounded-full font-semibold text-xs transition-all ${
                showWelcome
                  ? 'bg-red-500/30 border border-red-400 text-red-300'
                  : 'bg-white/5 border border-white/20 text-white/60 hover:border-white/40'
              }`}
            >
              {showWelcome ? '✓ Disclaimer' : '? Disclaimer'}
            </motion.button>
            {isPremium && (
              <div className="px-3 py-1.5 rounded-full bg-gold/10 border border-gold/30">
                <span className="text-xs font-bold text-gold">✨ PREMIUM</span>
              </div>
            )}
          </div>
        </div>

        {/* Mode Switcher */}
        <ModeSwitcher
          mode={mode}
          onChangeMode={setMode}
          isPremium={isPremium}
        />
      </motion.div>

      {/* Content */}
      <div className="px-5 py-6 pb-32 lg:pb-8">
        {/* Welcome Card with disclaimer - Toggle via button */}
        <AnimatePresence>
          {showWelcome && <PredictionWelcomeCard />}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {mode === 'today' && (
            <motion.div
              key="today"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TodayMode isPremium={isPremium} />
            </motion.div>
          )}
          {mode === 'generate' && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GenerateMode />
            </motion.div>
          )}
          {mode === 'ai-chat' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AIChatMode />
            </motion.div>
          )}
          {mode === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <HistoryMode />
            </motion.div>
          )}
          {mode === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AnalyticsMode />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
