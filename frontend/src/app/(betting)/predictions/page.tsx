'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  TrendingUp, Target, MessageCircle, History,
  Lock, Play, ArrowRight, Brain, Loader2, Send, Calendar, Trash2, Check, X,
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
type Mode = 'today' | 'ai-chat' | 'history'

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
    { key: 'ai-chat', label: '🤖 AI Chat', icon: Brain },
    { key: 'history', label: '📜 History', icon: History },
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

// AI Chat Mode (Now FREE for everyone!)
function AIChatMode() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [currentPrediction, setCurrentPrediction] = useState<any>(null)
  const messagesEnd = useRef<HTMLDivElement>(null)
  
  const mut = useMutation({
    mutationFn: async (query: string) => {
      // Check if query looks like a match (contains "vs", "versus", "v ", etc.)
      const matchKeywords = ['vs', 'versus', 'v ', 'against', 'dhidi ya', '-']
      const isMatchQuery = matchKeywords.some(kw => query.toLowerCase().includes(kw))
      
      if (isMatchQuery) {
        // Match query - use betting prediction
        const { data } = await api.post('/api/ai/betting/predict/', {
          query,
        })
        return { type: 'prediction', data }
      } else {
        // General betting question - use regular AI chat with betting context
        const { data } = await api.post('/api/ai/chat/', {
          message: query,
          context: 'betting',
          lang: 'en',
        })
        return { type: 'betting-tips', data }
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
      } else if (result.type === 'betting-tips') {
        // Display betting advice/tips
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: input },
          { 
            role: 'assistant', 
            type: 'betting-tips', 
            content: result.data.reply || result.data.tips || result.data.message 
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

  const [showLegend, setShowLegend] = useState(true)

  const handleSend = () => {
    if (!input.trim()) return
    mut.mutate(input)
  }

  return (
    <div className="flex flex-col h-[700px] gap-4">
      {/* Legend Bar - Always Visible */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: showLegend ? 1 : 0.5, 
          height: showLegend ? 'auto' : 0 
        }}
        className={`overflow-hidden bg-gold/5 border border-gold/20 rounded-xl p-3 transition-all ${
          showLegend ? 'block' : 'hidden'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="font-bold text-gold">🏠 Home %</span>
              <p className="text-text-muted">Home win chance</p>
            </div>
            <div>
              <span className="font-bold text-gold">⚪ Draw %</span>
              <p className="text-text-muted">Draw chance</p>
            </div>
            <div>
              <span className="font-bold text-gold">⚽⚽ BTTS</span>
              <p className="text-text-muted">Both score</p>
            </div>
            <div>
              <span className="font-bold text-gold">📈 Over 2.5</span>
              <p className="text-text-muted">3+ goals</p>
            </div>
          </div>
          <motion.button
            onClick={() => setShowLegend(!showLegend)}
            whileTap={{ scale: 0.9 }}
            className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gold/10"
          >
            {showLegend ? '▼' : '▶'}
          </motion.button>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col items-center justify-center space-y-6 py-12"
          >
            {/* Modern Welcome Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-md bg-gradient-to-br from-gold/10 via-white/5 to-gold/5 border border-gold/30 rounded-2xl p-8 space-y-6 shadow-lg shadow-gold/10"
            >
              {/* Icon & Title */}
              <div className="text-center space-y-3">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-5xl flex justify-center"
                >
                  🤖
                </motion.div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-text-primary to-gold bg-clip-text text-transparent">
                  AI Betting Assistant
                </h2>
                <p className="text-text-muted text-sm leading-relaxed">
                  Professional match predictions & betting insights powered by advanced AI
                </p>
              </div>

              {/* Quick Examples */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gold uppercase tracking-widest">Try asking:</p>
                <div className="space-y-2">
                  {[
                    'Chelsea vs Arsenal',
                    'Bayern Munich vs Dortmund',
                    'Best bets for EPL today',
                  ].map((example, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => {
                        setInput(example)
                        setTimeout(() => handleSend(), 50)
                      }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full text-left px-4 py-2 rounded-lg bg-white/5 hover:bg-gold/10 border border-white/10 hover:border-gold/30 text-sm text-text-primary transition-all group"
                    >
                      <span className="text-gold">→</span> {example}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Features Badges */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
                <div className="text-center">
                  <div className="text-2xl mb-1">📊</div>
                  <p className="text-xs text-text-muted">Live Data</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🎯</div>
                  <p className="text-xs text-text-muted">Accurate</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">⚡</div>
                  <p className="text-xs text-text-muted">Instant</p>
                </div>
              </div>
            </motion.div>

            {/* Info Box */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full max-w-md bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center text-sm text-blue-100"
            >
              <p className="font-semibold mb-1">💡 Pro Tip</p>
              <p className="text-xs opacity-90">
                Get realistic match predictions with confidence levels and betting recommendations
              </p>
            </motion.div>
          </motion.div>
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

          if (msg.type === 'betting-tips') {
            return (
              <motion.div
                key={idx}
                className="flex justify-start"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="px-4 py-3 rounded-2xl bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/30 max-w-lg text-sm text-text-primary">
                  <div className="flex gap-2">
                    <span className="text-lg flex-shrink-0">💡</span>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
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

// History Mode - Now using AI Chat betting analytics endpoints
function HistoryMode() {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  
  const { data: history, isLoading, refetch } = useQuery({
    queryKey: ['betting-prediction-history'],
    queryFn: async () => {
      const { data } = await api.get('/api/ai/betting/history/?limit=50')
      return data
    },
  })

  // Delete single prediction mutation (soft delete via analytics)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/ai/betting/prediction/${id}/delete/`)
    },
    onSuccess: () => {
      toast.success('Prediction deleted')
      refetch()
      setConfirmDelete(null)
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.error || 'Failed to delete prediction')
    },
  })

  // Delete multiple predictions mutation (soft delete via analytics)
  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Delete all selected predictions (soft delete)
      await Promise.all(ids.map(id => api.delete(`/api/ai/betting/prediction/${id}/delete/`)))
    },
    onSuccess: () => {
      toast.success(`${selectedIds.length} predictions deleted`)
      refetch()
      setSelectedIds([])
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.error || 'Failed to delete predictions')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    )
  }

  const preds = history?.predictions || []
  const isSelectingMultiple = selectedIds.length > 0

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedIds.length === preds.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(preds.map((p: any) => p.id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    await deleteMultipleMutation.mutateAsync(selectedIds)
  }

  return (
    <div className="space-y-4">
      {/* Selection toolbar */}
      <AnimatePresence>
        {isSelectingMultiple && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-4 rounded-lg bg-red-500/10 border border-red-500/50 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-400" />
              <span className="text-sm font-medium text-red-300">
                {selectedIds.length} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <KiliButton
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds([])}
                disabled={deleteMultipleMutation.isPending}
              >
                <X className="w-4 h-4" />
              </KiliButton>
              <KiliButton
                size="sm"
                onClick={handleDeleteSelected}
                loading={deleteMultipleMutation.isPending}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/50"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </KiliButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Predictions grid */}
      <div className="space-y-4">
        {preds.length > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleSelectAll}
            className="text-xs font-medium text-white/60 hover:text-white/80 transition-colors px-3 py-1 rounded hover:bg-white/10"
          >
            {selectedIds.length === preds.length ? 'Deselect All' : 'Select All'}
          </motion.button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
          {preds.map((p: any, idx: number) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group"
            >
              {/* Selection checkbox */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleToggleSelect(p.id)}
                className={`absolute -left-4 top-4 z-10 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                  selectedIds.includes(p.id)
                    ? 'bg-gold border-gold'
                    : 'border-white/30 hover:border-gold'
                }`}
              >
                {selectedIds.includes(p.id) && (
                  <Check className="w-4 h-4 text-slate-900" />
                )}
              </motion.button>

              {/* Prediction card */}
              <div className="relative">
                <Modern3DPredictionCard
                  key={p.id}
                  index={idx}
                  homeTeam={p.home_team}
                  awayTeam={p.away_team}
                  league={p.league}
                  homeWin={
                    p.prediction?.home_win_prob ? p.prediction.home_win_prob * 100 : 0
                  }
                  draw={p.prediction?.draw_prob ? p.prediction.draw_prob * 100 : 0}
                  awayWin={
                    p.prediction?.away_win_prob ? p.prediction.away_win_prob * 100 : 0
                  }
                  confidence={
                    p.prediction?.confidence ? p.prediction.confidence * 100 : 0
                  }
                  btts={p.prediction?.btts_prob ? p.prediction.btts_prob * 100 : 0}
                  over25={p.prediction?.over_25_prob ? p.prediction.over_25_prob * 100 : 0}
                  valueMarket={p.prediction?.value_bet}
                  explanations={p.explanations}
                />

                {/* Delete button - shown on hover */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      confirmDelete === p.id ? setConfirmDelete(null) : setConfirmDelete(p.id)
                    }
                    className="relative w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 flex items-center justify-center transition-all group/btn"
                  >
                    <Trash2 className="w-5 h-5 text-red-400 group-hover/btn:text-red-300" />
                  </motion.button>
                </motion.div>
              </div>

              {/* Delete confirmation */}
              <AnimatePresence>
                {confirmDelete === p.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 rounded-2xl bg-slate-900/95 backdrop-blur-sm border border-red-500/50 flex flex-col items-center justify-center gap-3 p-4 z-20"
                  >
                    <Trash2 className="w-8 h-8 text-red-400" />
                    <p className="text-sm text-white font-medium text-center">
                      Delete {p.home_team} vs {p.away_team}?
                    </p>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setConfirmDelete(null)}
                        disabled={deleteMutation.isPending}
                        className="px-3 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => deleteMutation.mutate(p.id)}
                        disabled={deleteMutation.isPending}
                        className="px-3 py-1 text-xs font-medium rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-colors disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Delete'
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {preds.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center p-12 rounded-lg bg-white/5 border border-white/10"
        >
          <History className="w-12 h-12 text-white/30 mb-4" />
          <p className="text-white/60 text-sm">No predictions yet</p>
          <p className="text-white/40 text-xs mt-1">
            Generate predictions to see them here
          </p>
        </motion.div>
      )}
    </div>
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
        </AnimatePresence>
      </div>
    </div>
  )
}
