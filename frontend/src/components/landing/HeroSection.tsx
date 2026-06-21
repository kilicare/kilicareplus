'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import heroData from '@/data/hero.json'

const TRUST_BADGES = heroData.trust_badges
const EXPERIENCE_STRIP = heroData.experience_strip || []

export function HeroSection() {
  const heroBackground = heroData.background_image
  const heroVideo = heroData.background_video

  return (
    <>
      <section
        className="relative min-h-screen flex flex-col items-center justify-center
          overflow-hidden pt-20 pb-12"
      >
      {/* Video background */}
      {heroVideo ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.8 }}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: heroBackground 
              ? `url(${heroBackground}) center/cover no-repeat` 
              : 'linear-gradient(160deg,#0A0A12 0%,#0A0A12 50%,#0A0A12 100%)'
          }}
        />
      )}


      <motion.div
        className="relative z-10 landing-container landing-container-2xl text-center"
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
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
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          {heroData.badge}
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-hero font-bold leading-none
            tracking-tight mb-6"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <span className="text-white">{heroData.title.line1}</span>
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
            {heroData.title.line2}
          </span>
          <br />
          <span className="text-white">{heroData.title.line3}</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-subsection max-w-3xl mx-auto mb-8
            leading-relaxed font-medium"
          style={{ 
            color: 'rgba(255,255,255,0.9)',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)'
          }}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          {heroData.subtitle}
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <Link
            href={heroData.cta_primary.link}
            className="group flex items-center gap-2 px-6 sm:px-8 md:px-10 lg:px-12 py-3 sm:py-4 md:py-5 rounded-2xl
              text-black font-semibold text-base sm:text-lg md:text-xl transition-all hover:scale-105
              active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#F5A623,#E8892A)',
              boxShadow: '0 4px 14px 0 rgba(245,166,35,0.39), 0 0 20px rgba(245,166,35,0.2)',
            }}
          >
            {heroData.cta_primary.text}
            <ArrowRight
              size={20}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
          <Link
            href={heroData.cta_secondary.link}
            className="flex items-center gap-2 px-6 sm:px-8 md:px-10 lg:px-12 py-3 sm:py-4 md:py-5 rounded-2xl
              text-white font-medium text-base sm:text-lg md:text-xl transition-all hover:scale-105
              active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {heroData.cta_secondary.text}
          </Link>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className="flex items-center justify-center gap-4 sm:gap-6 mb-12 flex-wrap"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {TRUST_BADGES.map((badge, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all hover:bg-white/5"
              style={{ 
                color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <span style={{ color: '#F5A623' }}>{badge.icon}</span>
              {badge.label}
            </div>
          ))}
        </motion.div>

      </motion.div>

      {/* Bottom gradient fade to blend with next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #050508, transparent)'
        }}
      />
    </section>

    {/* Experience Strip */}
    {EXPERIENCE_STRIP.length > 0 && (
      <section className="relative py-8 overflow-hidden bg-bg-base">
        <div className="landing-container landing-container-2xl relative">
          <div className="flex gap-3 sm:gap-4 md:gap-5 lg:gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {EXPERIENCE_STRIP.map((item, i) => (
              <motion.div
                key={i}
                className="flex-shrink-0 relative group cursor-pointer"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="w-36 h-24 sm:w-40 sm:h-28 md:w-44 md:h-32 lg:w-48 lg:h-32 xl:w-52 xl:h-36 rounded-2xl overflow-hidden relative ring-1 ring-white/10 group-hover:ring-gold/50 transition-all"
                  style={{
                    background: `url(${item.image}) center/cover no-repeat`
                  }}
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20" />
                  <div className="absolute top-2 right-2">
                    <span className="text-xs">📍</span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-xs sm:text-sm font-semibold text-white drop-shadow-lg">
                      {item.label}
                    </p>
                  </div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{
                    background: 'linear-gradient(135deg, rgba(245,166,35,0.1) 0%, transparent 50%)'
                  }} />
                </div>
              </motion.div>
            ))}
          </div>
          {/* Subtle gradient fade indicator */}
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:hidden pointer-events-none" style={{
            background: 'linear-gradient(to left, rgba(5,5,8,1) 0%, transparent 100%)'
          }} />
        </div>
      </section>
    )}
    </>
  )
}