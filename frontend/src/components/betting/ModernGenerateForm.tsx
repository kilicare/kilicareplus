'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, ArrowRight, Loader2 } from 'lucide-react'
import { KiliButton } from '@/components/ui/KiliButton'

interface ModernGenerateFormProps {
  onSubmit: (home: string, away: string, league: string) => Promise<void> | void
  isLoading?: boolean
}

export function ModernGenerateForm({ onSubmit, isLoading = false }: ModernGenerateFormProps) {
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [league, setLeague] = useState('EPL')
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (home && away) {
      await onSubmit(home, away, league)
    }
  }

  const leagues = [
    { key: 'EPL', label: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { key: 'LA_LIGA', label: 'La Liga', flag: '🇪🇸' },
    { key: 'BUNDESLIGA', label: 'Bundesliga', flag: '🇩🇪' },
    { key: 'SERIE_A', label: 'Serie A', flag: '🇮🇹' },
    { key: 'LIGUE_1', label: 'Ligue 1', flag: '🇫🇷' },
    { key: 'EREDIVISIE', label: 'Eredivisie', flag: '🇳🇱' },
  ]

  const isValid = home.trim() && away.trim()

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold to-gold-dim">
          Generate Prediction 🎯
        </h2>
        <p className="text-sm text-white/60">Pick any two teams and get instant analysis</p>
      </motion.div>

      {/* Form container */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="space-y-4">
        {/* Teams input grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Home Team */}
          <motion.div
            animate={{
              boxShadow: focusedField === 'home' ? '0 0 30px rgba(255, 215, 0, 0.3)' : '0 0 0px rgba(0, 0, 0, 0)',
            }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-transparent rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-xl" />
            <div className="relative">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider block mb-2">Home Team</label>
              <input
                type="text"
                placeholder="e.g., Manchester City"
                value={home}
                onChange={(e) => setHome(e.target.value)}
                onFocus={() => setFocusedField('home')}
                onBlur={() => setFocusedField(null)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border-2 border-white/20 text-white placeholder-white/40 outline-none transition-all focus:border-gold/60 focus:bg-slate-800/80 disabled:opacity-50"
              />
              <div className="absolute right-3 top-1/2 transform translate-y-2 text-2xl opacity-0 group-focus-within:opacity-100 transition-opacity">🏠</div>
            </div>
          </motion.div>

          {/* Away Team */}
          <motion.div
            animate={{
              boxShadow: focusedField === 'away' ? '0 0 30px rgba(239, 68, 68, 0.3)' : '0 0 0px rgba(0, 0, 0, 0)',
            }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-transparent rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-xl" />
            <div className="relative">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider block mb-2">Away Team</label>
              <input
                type="text"
                placeholder="e.g., Liverpool"
                value={away}
                onChange={(e) => setAway(e.target.value)}
                onFocus={() => setFocusedField('away')}
                onBlur={() => setFocusedField(null)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border-2 border-white/20 text-white placeholder-white/40 outline-none transition-all focus:border-red-400/60 focus:bg-slate-800/80 disabled:opacity-50"
              />
              <div className="absolute right-3 top-1/2 transform translate-y-2 text-2xl opacity-0 group-focus-within:opacity-100 transition-opacity">✈️</div>
            </div>
          </motion.div>
        </div>

        {/* League selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-white/60 uppercase tracking-wider block">Select League</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {leagues.map((lg) => (
              <motion.button
                key={lg.key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLeague(lg.key)}
                disabled={isLoading}
                className={`p-3 rounded-lg font-semibold text-sm transition-all border-2 ${
                  league === lg.key
                    ? 'bg-gold/30 border-gold text-gold shadow-lg shadow-gold/30'
                    : 'bg-white/5 border-white/20 text-white/70 hover:border-white/40'
                } disabled:opacity-50`}
              >
                <div className="text-lg mb-1">{lg.flag}</div>
                <div className="text-xs leading-tight">{lg.label.split(' ')[0]}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Submit button */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex gap-3">
        <KiliButton
          fullWidth
          size="lg"
          loading={isLoading}
          disabled={!isValid || isLoading}
          onClick={handleSubmit}
          className="relative group overflow-hidden"
        >
          <motion.div
            className="flex items-center justify-center gap-2"
            animate={isLoading ? { x: [0, 5, 0] } : { x: 0 }}
            transition={{ repeat: isLoading ? Infinity : 0, duration: 1 }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Zap size={18} />
                <span>Generate Prediction</span>
                <ArrowRight size={18} />
              </>
            )}
          </motion.div>
        </KiliButton>
      </motion.div>

      {/* Interactive feature cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-3 gap-3 pt-4"
      >
        {/* Instant */}
        <motion.div
          whileHover={{ y: -5, scale: 1.05 }}
          className="group cursor-pointer relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
          <div className="relative p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 hover:border-blue-400/60 transition-colors">
            <div className="text-2xl mb-2">⚡</div>
            <p className="font-bold text-xs text-blue-300 mb-1">Instant</p>
            <p className="text-xs text-white/50 leading-tight hidden group-hover:block">
              Get results in seconds
            </p>
          </div>
        </motion.div>

        {/* Accurate */}
        <motion.div
          whileHover={{ y: -5, scale: 1.05 }}
          className="group cursor-pointer relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
          <div className="relative p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 hover:border-green-400/60 transition-colors">
            <div className="text-2xl mb-2">📊</div>
            <p className="font-bold text-xs text-green-300 mb-1">Accurate</p>
            <p className="text-xs text-white/50 leading-tight hidden group-hover:block">
              AI-powered predictions with ELO
            </p>
          </div>
        </motion.div>

        {/* Detailed */}
        <motion.div
          whileHover={{ y: -5, scale: 1.05 }}
          className="group cursor-pointer relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
          <div className="relative p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 hover:border-purple-400/60 transition-colors">
            <div className="text-2xl mb-2">🎯</div>
            <p className="font-bold text-xs text-purple-300 mb-1">Detailed</p>
            <p className="text-xs text-white/50 leading-tight hidden group-hover:block">
              BTTS, Goals, Markets explained
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
