'use client'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useRef } from 'react'
import { ArrowRight, Star, Shield, Zap } from 'lucide-react'

const PILLS = [
  { icon: '🦁', label: 'Serengeti' },
  { icon: '🏔️', label: 'Kilimanjaro' },
  { icon: '🏖️', label: 'Zanzibar' },
  { icon: '🌊', label: 'Pemba Island' },
  { icon: '🦒', label: 'Ngorongoro' },
  { icon: '🐘', label: 'Tarangire' },
]

const TRUST_BADGES = [
  { icon: <Shield size={14} />, label: 'SOS Salama 24/7' },
  { icon: <Star   size={14} />, label: '4.8★ Rating' },
  { icon: <Zap    size={14} />, label: 'AI-Powered' },
]

export function HeroSection() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const y       = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center
        overflow-hidden pt-20 pb-12 px-4"
      style={{ background: 'linear-gradient(160deg,#050508 0%,#0A0A12 50%,#050508 100%)' }}
    >
      {/* Animated background grid */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(245,166,35,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,166,35,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Glow orbs */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245,166,35,0.4) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full
          opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 max-w-5xl mx-auto text-center"
      >
        {/* Top badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8
            text-xs font-bold uppercase tracking-widest"
          style={{
            background: 'rgba(245,166,35,0.1)',
            border: '1px solid rgba(245,166,35,0.3)',
            color: '#F5A623',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          🇹🇿 Tanzania's First Tourism Super-App
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-5xl sm:text-6xl lg:text-8xl font-black leading-none
            tracking-tight mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <span className="text-white">Gundua</span>
          <br />
          <span
            className="relative"
            style={{
              background: 'linear-gradient(135deg,#F5A623 0%,#FFD700 40%,#F5A623 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Tanzania
          </span>
          <br />
          <span className="text-white">Bila Mipaka</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-lg sm:text-xl lg:text-2xl max-w-3xl mx-auto mb-8
            leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.65)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          Unganika na{' '}
          <span className="text-gold font-bold">guides wa kuzaliwa Tanzania</span>,
          chunguza uzoefu wa kipekee, pata msaada wa AI, na kaa salama popote
          ulipo — kutoka Kilimanjaro hadi Zanzibar.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <Link
            href="/register"
            className="group flex items-center gap-2 px-8 py-4 rounded-2xl
              text-black font-black text-lg transition-all hover:scale-105
              active:scale-95 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg,#F5A623,#E8892A)',
              boxShadow: '0 0 40px rgba(245,166,35,0.4)',
            }}
          >
            Anza Safari Yako — Bure
            <ArrowRight
              size={20}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl
              text-white font-bold text-lg transition-all hover:scale-105
              active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            Tayari una akaunti? Ingia
          </Link>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className="flex items-center justify-center gap-6 mb-12 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {TRUST_BADGES.map((badge, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-xs font-medium"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <span style={{ color: '#F5A623' }}>{badge.icon}</span>
              {badge.label}
            </div>
          ))}
        </motion.div>

        {/* Destination pills */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {PILLS.map((pill, i) => (
            <motion.div
              key={pill.label}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm
                font-medium"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.07 }}
              whileHover={{
                background: 'rgba(245,166,35,0.12)',
                borderColor: 'rgba(245,166,35,0.3)',
                color: '#F5A623',
                scale: 1.05,
              }}
            >
              <span>{pill.icon}</span>
              {pill.label}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Phone mockup */}
      <motion.div
        className="relative z-10 mt-16 max-w-sm mx-auto"
        initial={{ opacity: 0, y: 60, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.6, type: 'spring', stiffness: 100 }}
      >
        <div
          className="rounded-[3rem] overflow-hidden border-2 relative"
          style={{
            borderColor: 'rgba(245,166,35,0.3)',
            boxShadow: `
              0 0 0 1px rgba(245,166,35,0.1),
              0 40px 80px rgba(0,0,0,0.8),
              0 0 60px rgba(245,166,35,0.15)
            `,
            background: '#0A0A12',
          }}
        >
          {/* Phone screen simulation */}
          <div className="aspect-[9/19] relative overflow-hidden">
            {/* Status bar */}
            <div
              className="flex items-center justify-between px-6 pt-3 pb-2 text-[11px]
                font-bold text-white/80"
              style={{ background: 'rgba(10,10,20,0.95)' }}
            >
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <span>●●●</span>
                <span>WiFi</span>
                <span>100%</span>
              </div>
            </div>

            {/* App content simulation */}
            <div
              className="flex-1 relative"
              style={{ background: 'linear-gradient(160deg,#050508,#0A0A15)' }}
            >
              {/* Simulated feed cards */}
              <div className="p-3 space-y-2">
                {/* Card 1 — Serengeti moment */}
                <div
                  className="rounded-2xl overflow-hidden relative"
                  style={{ height: 200, background: 'rgba(245,166,35,0.08)' }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(135deg,rgba(245,166,35,0.2),rgba(10,10,20,0.8))',
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col justify-end p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center
                          text-xs font-black text-black"
                        style={{ background: '#F5A623' }}
                      >
                        J
                      </div>
                      <span className="text-white text-xs font-bold">@john_safari</span>
                    </div>
                    <p className="text-white/80 text-[11px]">🦁 Serengeti — incredible!</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-white/60 text-[10px]">❤️ 234</span>
                      <span className="text-white/60 text-[10px]">💬 18</span>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 text-2xl">🦁</div>
                </div>

                {/* Quick stats row */}
                <div className="flex gap-2">
                  {[
                    { emoji: '🆘', label: 'SOS Safe', color: '#FF2D2D' },
                    { emoji: '🤖', label: 'AI Guide', color: '#F5A623' },
                    { emoji: '⭐', label: '4.8 Rating', color: '#10B981' },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="flex-1 rounded-xl p-2 text-center"
                      style={{ background: `${s.color}12`, border: `1px solid ${s.color}25` }}
                    >
                      <div className="text-sm">{s.emoji}</div>
                      <p className="text-[9px] font-bold" style={{ color: s.color }}>
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Prediction card mini */}
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.15)' }}
                >
                  <p className="text-[10px] text-white/50 mb-1">🎯 KilicareBet</p>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-xs font-bold">Simba SC</span>
                    <span className="text-gold text-[10px] font-black">71% WIN</span>
                    <span className="text-white text-xs font-bold">Yanga SC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom nav simulation */}
            <div
              className="flex items-center justify-around px-4 py-3 border-t"
              style={{
                background: 'rgba(10,10,20,0.95)',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              {['📸','🗺️','🆘','💬','🛂'].map((icon, i) => (
                <div
                  key={i}
                  className={`text-base ${i === 2 ? 'scale-125' : ''}`}
                  style={{
                    background: i === 2 ? 'rgba(255,45,45,0.2)' : 'transparent',
                    borderRadius: i === 2 ? '50%' : 0,
                    padding: i === 2 ? '4px' : 0,
                  }}
                >
                  {icon}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Phone glow */}
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(245,166,35,0.4) 0%, transparent 70%)',
            filter: 'blur(30px)',
            transform: 'translateY(20px) scale(0.9)',
          }}
        />
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col
          items-center gap-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Scroll chini
        </span>
        <div
          className="w-5 h-8 rounded-full border flex items-start justify-center pt-1.5"
          style={{ borderColor: 'rgba(255,255,255,0.2)' }}
        >
          <div
            className="w-1 h-2 rounded-full"
            style={{ background: '#F5A623' }}
          />
        </div>
      </motion.div>
    </section>
  )
}