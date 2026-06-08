'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'

const SAMPLE_MATCHES = [
  {
    home:     'Simba SC',
    away:     'Young Africans',
    league:   '🇹🇿 TPL',
    homeProb: 71,
    drawProb: 20,
    awayProb: 9,
    overProb: 68,
    btts:     54,
    signal:   '🔥 STRONG',
    signalColor: '#F5A623',
    valueBet: 'SIMBA WIN',
    confidence: 71,
    time: '18:00',
  },
  {
    home:     'Man City',
    away:     'Arsenal',
    league:   '🏴󠁧󠁢󠁥󠁮󠁧󠁿 EPL',
    homeProb: 54,
    drawProb: 25,
    awayProb: 21,
    overProb: 65,
    btts:     60,
    signal:   '⚡ MEDIUM',
    signalColor: '#3B82F6',
    valueBet: 'MAN CITY WIN',
    confidence: 54,
    time: '15:00',
  },
  {
    home:     'Real Madrid',
    away:     'Barcelona',
    league:   '🇪🇸 La Liga',
    homeProb: 47,
    drawProb: 27,
    awayProb: 26,
    overProb: 58,
    btts:     62,
    signal:   '👀 WEAK',
    signalColor: '#10B981',
    valueBet: 'REAL MADRID WIN',
    confidence: 47,
    time: '20:00',
  },
]

function ProbBar({
  label, prob, color,
}: { label: string; prob: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/50 w-16 flex-shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 h-5 rounded-lg overflow-hidden bg-white/5">
        <motion.div
          className="h-full rounded-lg flex items-center justify-end pr-2"
          style={{ background: color, width: `${prob}%` }}
          initial={{ width: 0 }}
          whileInView={{ width: `${prob}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <span className="text-[9px] font-black text-white">{prob}%</span>
        </motion.div>
      </div>
    </div>
  )
}

export function KilicareBetPreview() {
  return (
    <section
      className="py-20 lg:py-28 px-4 relative overflow-hidden"
      style={{ background: '#050508' }}
    >
      {/* Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[600px] h-[300px] opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse,rgba(245,166,35,0.8),transparent)',
          filter: 'blur(80px)',
        }}
      />

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Description */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                text-xs font-black uppercase tracking-widest mb-6"
              style={{
                background: 'rgba(245,166,35,0.1)',
                border: '1px solid rgba(245,166,35,0.3)',
                color: '#F5A623',
              }}
            >
              🎯 NEW — KilicareBet Elite V4
            </div>

            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
              AI Predictions
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg,#F5A623,#FFD700)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Zinazobadilisha Mchezo
              </span>
            </h2>

            <p
              className="text-lg mb-6 leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              Per-league XGBoost models na ELO rating system. EPL, La Liga, Bundesliga
              na Tanzania Premier League — kila ligi ina modeli yake maalum.
            </p>

            <div className="space-y-3 mb-8">
              {[
                { icon: '🏆', label: 'Per-League Models (EPL / La Liga / Bundesliga)' },
                { icon: '📊', label: 'ELO Rating System — consistent across leagues' },
                { icon: '⚽', label: 'Over 2.5, BTTS na Value Bet signals' },
                { icon: '🔥', label: 'STRONG / MEDIUM / WEAK / SKIP categories' },
                { icon: '💰', label: 'Affiliate links (Sportpesa, Betway, 1xBet)' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                >
                  <span>{item.icon}</span>
                  <span
                    className="text-sm"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/register"
                className="flex items-center gap-2 px-6 py-3 rounded-xl
                  text-black font-black text-sm transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#F5A623,#E8892A)' }}
              >
                Pata Predictions Bure
              </Link>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Mechi 2 bure/siku. Sports Premium TZS 3,000/mwezi.
              </p>
            </div>
          </motion.div>

          {/* Right: Match cards */}
          <div className="space-y-4">
            {SAMPLE_MATCHES.map((match, i) => (
              <motion.div
                key={match.home}
                className="rounded-3xl overflow-hidden"
                style={{
                  background: 'rgba(20,20,30,0.9)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
              >
                {/* League + time */}
                <div
                  className="flex items-center justify-between px-4 py-2 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                >
                  <span className="text-xs font-bold text-white/50">
                    {match.league}
                  </span>
                  <span className="text-xs text-white/40">{match.time}</span>
                </div>

                <div className="p-4">
                  {/* Teams */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-black text-white text-sm">{match.home}</p>
                    <span className="text-lg">⚔️</span>
                    <p className="font-black text-white text-sm">{match.away}</p>
                  </div>

                  {/* Prob bars */}
                  <div className="space-y-1.5 mb-4">
                    <ProbBar label={match.home} prob={match.homeProb} color="rgba(16,185,129,0.7)" />
                    <ProbBar label="Draw"       prob={match.drawProb} color="rgba(245,166,35,0.6)" />
                    <ProbBar label={match.away} prob={match.awayProb} color="rgba(59,130,246,0.7)" />
                  </div>

                  {/* Over + BTTS */}
                  <div className="flex gap-2 mb-3">
                    <div
                      className="flex-1 rounded-xl py-2 text-center"
                      style={{ background: 'rgba(59,130,246,0.08)' }}
                    >
                      <p className="text-[10px] text-white/50">⚽ Over 2.5</p>
                      <p className="text-sm font-black text-blue-400">{match.overProb}%</p>
                    </div>
                    <div
                      className="flex-1 rounded-xl py-2 text-center"
                      style={{ background: 'rgba(139,92,246,0.08)' }}
                    >
                      <p className="text-[10px] text-white/50">🔵 BTTS</p>
                      <p className="text-sm font-black" style={{ color: '#8B5CF6' }}>{match.btts}%</p>
                    </div>
                  </div>

                  {/* Value bet */}
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{
                      background: 'rgba(245,166,35,0.08)',
                      border: '1px solid rgba(245,166,35,0.2)',
                    }}
                  >
                    <div>
                      <p className="text-[9px] text-white/40">💎 Value Bet</p>
                      <p className="text-xs font-black text-gold">{match.valueBet}</p>
                    </div>
                    <span
                      className="text-xs font-black px-2 py-1 rounded-lg"
                      style={{
                        background: `${match.signalColor}18`,
                        color: match.signalColor,
                      }}
                    >
                      {match.signal}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Disclaimer */}
            <p
              className="text-[10px] text-center"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              ⚠️ Predictions ni kwa burudani tu. 18+ pekee. Fuata sheria za Tanzania.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}