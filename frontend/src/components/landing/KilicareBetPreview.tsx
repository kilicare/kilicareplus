'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import kilicarebetData from '@/data/kilicarebet.json'

const SAMPLE_MATCHES = kilicarebetData.matches

function ProbBar({
  label, prob, color,
}: { label: string; prob: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/70 w-16 flex-shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 h-5 rounded-lg overflow-hidden bg-white/5">
        <motion.div
          className="h-full rounded-lg flex items-center justify-end pr-2"
          style={{ background: color, width: `${prob}%` }}
          initial={false}
          whileInView={{ width: `${prob}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <span className="text-xs font-black text-white">{prob}%</span>
        </motion.div>
      </div>
    </div>
  )
}

export function KilicareBetPreview() {
  const kilicarebetBackground = kilicarebetData.background_image

  return (
    <section
      className="py-20 lg:py-28 px-4 relative overflow-hidden"
      style={{
        background: kilicarebetBackground 
          ? `url(${kilicarebetBackground}) center/cover no-repeat` 
          : '#050508'
      }}
    >
      {/* Top gradient fade to blend with previous section */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, #050508, transparent)'
        }}
      />
      {/* Dark overlay when using image background */}
      {kilicarebetBackground && (
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(5,5,8,0.0)'
          }}
        />
      )}

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Description */}
          <motion.div
            initial={false}
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
                {kilicarebetData.badge}
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              {kilicarebetData.title}
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg,#F5A623,#FFD700)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {kilicarebetData.title_highlight}
              </span>
            </h2>

            <p
              className="text-xl mb-6 leading-relaxed font-semibold"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            >
              {kilicarebetData.subtitle}
            </p>

            <div className="space-y-3 mb-8">
              {kilicarebetData.features.map((item, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3"
                  initial={false}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                >
                  <span>{item.icon}</span>
                  <span
                    className="font-inter text-base font-medium"
                    style={{ color: 'rgba(255,255,255,0.9)' }}
                  >
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={kilicarebetData.cta.link}
                className="font-inter flex items-center gap-2 px-8 py-4 rounded-xl
                  text-black font-semibold text-base transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#F5A623,#E8892A)' }}
              >
                {kilicarebetData.cta.text}
              </Link>
              <p className="font-inter text-sm font-normal" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {kilicarebetData.cta_note}
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
                  background: 'rgba(30,30,40,0.95)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
                initial={false}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
              >
                {/* League + time */}
                <div
                  className="flex items-center justify-between px-4 py-2 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <span className="text-xs font-bold text-white/80">
                    {match.league}
                  </span>
                  <span className="text-xs text-white/70">{match.time}</span>
                </div>

                <div className="p-4">
                  {/* Teams */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-black text-white text-base">{match.home}</p>
                    <span className="text-xl">⚔️</span>
                    <p className="font-black text-white text-base">{match.away}</p>
                  </div>

                  {/* Prob bars */}
                  <div className="space-y-1.5 mb-4">
                    <ProbBar label={match.home} prob={match.homeProb} color="rgba(16,185,129,0.8)" />
                    <ProbBar label="Draw"       prob={match.drawProb} color="rgba(245,166,35,0.7)" />
                    <ProbBar label={match.away} prob={match.awayProb} color="rgba(59,130,246,0.8)" />
                  </div>

                  {/* Over + BTTS */}
                  <div className="flex gap-2 mb-3">
                    <div
                      className="flex-1 rounded-xl py-2 text-center"
                      style={{ background: 'rgba(59,130,246,0.12)' }}
                    >
                      <p className="text-xs text-white/70">⚽ Over 2.5</p>
                      <p className="text-base font-black text-blue-400">{match.overProb}%</p>
                    </div>
                    <div
                      className="flex-1 rounded-xl py-2 text-center"
                      style={{ background: 'rgba(139,92,246,0.12)' }}
                    >
                      <p className="text-xs text-white/70">🔵 BTTS</p>
                      <p className="text-base font-black" style={{ color: '#8B5CF6' }}>{match.btts}%</p>
                    </div>
                  </div>

                  {/* Value bet */}
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{
                      background: 'rgba(245,166,35,0.12)',
                      border: '1px solid rgba(245,166,35,0.3)',
                    }}
                  >
                    <div>
                      <p className="text-xs text-white/70">💎 Value Bet</p>
                      <p className="text-sm font-black text-gold">{match.valueBet}</p>
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
              className="text-xs text-center font-medium"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              {kilicarebetData.disclaimer}
            </p>
          </div>
        </div>
      </div>
      {/* Bottom gradient fade to blend with next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #050508, transparent)'
        }}
      />
    </section>
  )
}