'use client'
import { motion, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { useIsMounted } from '@/hooks/useIsMounted'
import { useSafeScroll } from '@/hooks/useSafeScroll'
import { ConfigService } from '@/services/config.service'

const PILLS = [
  { icon: '🦁', label: 'Serengeti' },
  { icon: '🏔️', label: 'Kilimanjaro' },
  { icon: '🏖️', label: 'Zanzibar' },
  { icon: '🌊', label: 'Pemba Island' },
  { icon: '🦒', label: 'Ngorongoro' },
  { icon: '🐘', label: 'Tarangire' },
]

const TRUST_BADGES = [
  { icon: '🛡️', label: 'SOS Salama 24/7' },
  { icon: '⭐', label: '4.8★ Rating' },
  { icon: '⚡', label: 'AI-Powered' },
]

export function HeroSection() {
  const { ref, scroll } = useSafeScroll(['start start', 'end start'])
  const y       = useTransform(scroll.scrollYProgress, [0, 1], ['0%', '30%'])
  const opacity = useTransform(scroll.scrollYProgress, [0, 0.7], [1, 0])
  const [heroBackground, setHeroBackground] = useState<string>('')
  const mounted = useIsMounted()

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await ConfigService.getLandingPageConfig()
        if (data.cta_background_image) {
          setHeroBackground(data.cta_background_image)
        }
      } catch (error) {
        console.warn('Failed to fetch landing page config, using default background')
      }
    }

    fetchConfig()
  }, [])

  // Prevent hydration mismatch by rendering skeleton on server
  if (!mounted) {
    return (
      <section
        className="relative min-h-screen flex flex-col items-center justify-center
          overflow-hidden pt-20 pb-12 px-4"
        style={{
          background: 'linear-gradient(160deg,#050508 0%,#0A0A12 50%,#050508 100%)'
        }}
      >
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="h-12 w-64 mx-auto mb-8 bg-gray-800/50 rounded-full animate-pulse" />
          <div className="h-20 w-full mb-6 bg-gray-800/50 rounded animate-pulse" />
          <div className="h-20 w-3/4 mx-auto mb-8 bg-gray-800/50 rounded animate-pulse" />
          <div className="h-14 w-48 mx-auto bg-gray-800/50 rounded-2xl animate-pulse" />
        </div>
      </section>
    )
  }

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center
        overflow-hidden pt-20 pb-12 px-4"
      style={{
        background: heroBackground 
          ? `url(${heroBackground}) center/cover no-repeat` 
          : 'linear-gradient(160deg,#050508 0%,#0A0A12 50%,#050508 100%)'
      }}
    >
      {/* Dark overlay when using image background */}
      {heroBackground && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(160deg,rgba(5,5,8,0.6) 0%,rgba(10,10,18,0.5) 50%,rgba(5,5,8,0.6) 100%)'
          }}
        />
      )}
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
          className="text-xl sm:text-2xl lg:text-3xl max-w-3xl mx-auto mb-8
            leading-relaxed font-semibold"
          style={{ color: 'rgba(255,255,255,0.9)' }}
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