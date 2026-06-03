'use client'
import { motion } from 'framer-motion'
import { Info, TrendingUp, AlertCircle, Zap } from 'lucide-react'
import { useState } from 'react'

export function PredictionWelcomeCard() {
  const [isExpanded, setIsExpanded] = useState(false)

  const predictions = [
    { emoji: '🏠', label: 'Home Win', code: 'H' },
    { emoji: '🤝', label: 'Draw', code: 'D' },
    { emoji: '✈️', label: 'Away Win', code: 'A' },
    { emoji: '⚽⚽', label: 'BTTS', code: 'BTTS' },
    { emoji: '📈', label: 'Over 2.5 Goals', code: 'O2.5' },
    { emoji: '📊', label: 'H2H Analysis', code: 'H2H' },
  ]

  const futureFeatures = [
    { emoji: '🏥', label: 'Injury Updates', desc: 'Player fitness & availability' },
    { emoji: '💰', label: 'Live Odds', desc: 'Real-time market data' },
    { emoji: '⚠️', label: 'Weather Impact', desc: 'Conditions analysis' },
    { emoji: '🔥', label: 'Form Streaks', desc: 'Recent performance trends' },
    { emoji: '📰', label: 'Team News', desc: 'Breaking updates' },
    { emoji: '📱', label: 'Bet Tracking', desc: 'Your slip history' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, height: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <div className="relative group cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        {/* Glowing background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />

        {/* Main card */}
        <motion.div
          layout
          className="relative overflow-hidden bg-gradient-to-br from-slate-800/60 via-slate-900/60 to-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 hover:border-white/20 transition-all duration-300"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <motion.div layout className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10">
                <Zap className="text-blue-400" size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Welcome to Smart Betting 🎯
                </h2>
                <p className="text-sm text-white/60 mt-2">
                  AI-powered predictions with detailed analysis
                </p>
              </div>
            </motion.div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-white/40"
            >
              <AlertCircle size={20} />
            </motion.div>
          </div>

          {/* Current predictions - Always visible */}
          <div className="mb-6">
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-green-400" />
              What We Predict
            </p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {predictions.map((pred, idx) => (
                <motion.div
                  key={pred.code}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-3 rounded-lg bg-gradient-to-br from-white/5 to-white/2 border border-white/10 hover:border-white/30 text-center transition-all hover:bg-white/10 group/pred"
                >
                  <div className="text-2xl mb-1 group-hover/pred:scale-125 transition-transform">{pred.emoji}</div>
                  <p className="text-xs font-semibold text-white/80">{pred.code}</p>
                  <p className="text-xs text-white/50 hidden group-hover/pred:block">{pred.label}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Methodology */}
          <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-blue-300 flex items-start gap-2">
              <Info size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                Our predictions use <strong>historical match data</strong>, ELO ratings, and advanced analytics to analyze past performance, team strengths, and head-to-head records.
              </span>
            </p>
          </div>

          {/* Expandable section */}
          <motion.div
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-6 pt-4 border-t border-white/10">
              {/* Disclaimer */}
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-xs font-bold text-yellow-400 uppercase mb-2 flex items-center gap-2">
                  <AlertCircle size={14} />
                  Important Disclaimer
                </p>
                <ul className="text-xs text-yellow-200/80 space-y-1 list-disc list-inside">
                  <li>Predictions are based on historical data and algorithms</li>
                  <li>No prediction is 100% accurate - betting carries risk</li>
                  <li>Always bet responsibly within your budget</li>
                  <li>Use predictions as analysis tools, not guarantees</li>
                  <li>Team form, injuries & news can affect outcomes</li>
                </ul>
              </div>

              {/* Coming soon features */}
              <div>
                <p className="text-xs font-bold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  🚀 Coming Soon (Better Predictions)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {futureFeatures.map((feat, idx) => (
                    <motion.div
                      key={feat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/30 hover:border-green-400/60 group/feat transition-all"
                    >
                      <p className="text-2xl mb-2 group-hover/feat:scale-125 transition-transform">{feat.emoji}</p>
                      <p className="text-xs font-semibold text-green-300">{feat.label}</p>
                      <p className="text-xs text-green-200/60 mt-1">{feat.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* How it works */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-white/70 uppercase tracking-wider">📊 How It Works</p>
                <div className="space-y-2 text-xs text-white/60">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/30 border border-blue-500 flex items-center justify-center text-blue-300 font-bold text-xs">1</div>
                    <p><span className="text-blue-300 font-semibold">Pick Teams:</span> Select home & away teams</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 border border-purple-500 flex items-center justify-center text-purple-300 font-bold text-xs">2</div>
                    <p><span className="text-purple-300 font-semibold">Analysis:</span> AI crunches historical data & metrics</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500/30 border border-pink-500 flex items-center justify-center text-pink-300 font-bold text-xs">3</div>
                    <p><span className="text-pink-300 font-semibold">Results:</span> Get probabilities & recommendations</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Expand button - mobile friendly */}
          <motion.div
            initial={false}
            animate={{ height: isExpanded ? 0 : 'auto', opacity: isExpanded ? 0 : 1, marginTop: isExpanded ? 0 : 4 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden pt-4 border-t border-white/10"
          >
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full py-2 text-xs font-semibold text-white/70 hover:text-white/100 transition-colors flex items-center justify-center gap-2"
            >
              <span>Learn more about our predictions</span>
              <motion.div animate={{ x: 2 }} transition={{ repeat: Infinity, duration: 1, repeatType: 'reverse' }}>
                →
              </motion.div>
            </button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}
