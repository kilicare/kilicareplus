'use client'
import { motion } from 'framer-motion'
import { TrendingUp, AlertCircle, Target, Zap } from 'lucide-react'

interface PredictionCardProps {
  homeTeam: string
  awayTeam: string
  league?: string
  homeWin?: number
  draw?: number
  awayWin?: number
  confidence?: number
  valueMarket?: string
  riskLevel?: string
  btts?: number
  over25?: number
  explanations?: any
  isLoading?: boolean
  index?: number
}

export function Modern3DPredictionCard({
  homeTeam,
  awayTeam,
  league = 'EPL',
  homeWin = 0,
  draw = 0,
  awayWin = 0,
  confidence = 0,
  valueMarket,
  riskLevel,
  btts = 0,
  over25 = 0,
  explanations,
  isLoading = false,
  index = 0,
}: PredictionCardProps) {
  // Determine winner outcome
  const outcomes = [
    { name: 'Home', value: homeWin, color: 'from-blue-600 to-blue-400', icon: '🏠' },
    { name: 'Draw', value: draw, color: 'from-gray-600 to-gray-400', icon: '⚪' },
    { name: 'Away', value: awayWin, color: 'from-red-600 to-red-400', icon: '✈️' },
  ]

  const topOutcome = outcomes.reduce((a, b) => (a.value > b.value ? a : b))
  const confidenceColor = confidence > 75 ? 'text-green-400' : confidence > 50 ? 'text-yellow-400' : 'text-orange-400'

  if (isLoading) {
    return (
      <motion.div
        className="h-64 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 animate-pulse"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateX: -10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      whileHover={{ y: -8, rotateX: 5 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 100 }}
      className="group relative h-full"
      style={{ perspective: '1000px' }}
    >
      {/* Glowing background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

      {/* Main card */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/15 shadow-2xl p-6 h-full flex flex-col gap-4">
        {/* Top section: Teams & Confidence */}
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">{league}</p>
            <p className="text-xs text-white/40">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          </div>

          {/* Confidence badge with glow */}
          <motion.div
            animate={{ boxShadow: confidence > 75 ? '0 0 20px rgba(74, 222, 128, 0.6)' : confidence > 50 ? '0 0 20px rgba(234, 179, 8, 0.6)' : '0 0 20px rgba(249, 115, 22, 0.6)' }}
            className={`px-3 py-1.5 rounded-lg font-bold text-sm backdrop-blur-xl border ${
              confidence > 75
                ? 'bg-green-500/20 border-green-400/50 text-green-300'
                : confidence > 50
                  ? 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300'
                  : 'bg-orange-500/20 border-orange-400/50 text-orange-300'
            }`}
          >
            {Math.round(confidence)}%
          </motion.div>
        </div>

        {/* Teams section */}
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {/* Home Team */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-center p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-400/30 backdrop-blur-sm hover:border-blue-400/60 transition-colors"
            >
              <p className="text-2xl mb-1">🏠</p>
              <p className="text-xs font-bold text-white/80 truncate">{homeTeam}</p>
              <p className="text-lg font-black text-blue-300 mt-1">{Math.round(homeWin)}%</p>
            </motion.div>

            {/* Draw */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-center p-3 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-600/10 border border-gray-400/30 backdrop-blur-sm hover:border-gray-400/60 transition-colors"
            >
              <p className="text-2xl mb-1">⚪</p>
              <p className="text-xs font-bold text-white/80">Draw</p>
              <p className="text-lg font-black text-gray-300 mt-1">{Math.round(draw)}%</p>
            </motion.div>

            {/* Away Team */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-center p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-400/30 backdrop-blur-sm hover:border-red-400/60 transition-colors"
            >
              <p className="text-2xl mb-1">✈️</p>
              <p className="text-xs font-bold text-white/80 truncate">{awayTeam}</p>
              <p className="text-lg font-black text-red-300 mt-1">{Math.round(awayWin)}%</p>
            </motion.div>
          </div>
        </div>

        {/* VS Divider */}
        <div className="flex items-center gap-3 opacity-60">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/30" />
          <span className="text-xs font-bold text-white/40">vs</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/30" />
        </div>

        {/* Secondary markets */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
            <p className="text-xs text-white/60 flex items-center gap-1">
              <span>⚽⚽</span> BTTS
            </p>
            <p className="font-bold text-white text-lg mt-1">{Math.round(btts)}%</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
            <p className="text-xs text-white/60 flex items-center gap-1">
              <span>📈</span> Over 2.5
            </p>
            <p className="font-bold text-white text-lg mt-1">{Math.round(over25)}%</p>
          </div>
        </div>

        {/* Explanations section */}
        {explanations && (
          <div className="space-y-2 pt-3 border-t border-white/10">
            {explanations.match_analysis && (
              <motion.div className="flex gap-2 text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Target size={14} className="text-gold flex-shrink-0 mt-0.5" />
                <p className="text-white/80 leading-tight">{explanations.match_analysis}</p>
              </motion.div>
            )}
            {explanations.best_market && (
              <motion.div className="flex gap-2 text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <TrendingUp size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-white/80 leading-tight">{explanations.best_market}</p>
              </motion.div>
            )}
            {riskLevel && (
              <motion.div className="flex gap-2 text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <AlertCircle size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-white/80 leading-tight">{riskLevel}</p>
              </motion.div>
            )}
          </div>
        )}

        {/* Best value bet recommendation */}
        {valueMarket && (
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-3 rounded-lg bg-gradient-to-r from-gold/30 to-gold/10 border border-gold/50 backdrop-blur-sm cursor-pointer group/btn"
          >
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-gold group-hover/btn:animate-pulse" />
                <span className="text-xs font-bold text-white/90">Best Bet</span>
              </div>
              <span className="text-sm font-black text-gold">{valueMarket}</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
