'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import featuresData from '@/data/features.json'

const FEATURES = featuresData.features

export function FeaturesSection() {
  const featuresBackground = featuresData.background_image

  return (
    <section
      id="features"
      className="section-padding relative"
      style={{
        background: featuresBackground 
          ? `url(${featuresBackground}) center/cover no-repeat` 
          : 'linear-gradient(180deg,#050508 0%,#0A0A12 100%)'
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
      {featuresBackground && (
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(5,5,8,0.0)'
          }}
        />
      )}
      <div className="landing-container landing-container-2xl">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: '#F5A623' }}
          >
            {featuresData.section_label}
          </p>
          <h2 className="text-section font-bold text-white mb-4">
            {featuresData.title}
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg,#F5A623,#FFD700)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {featuresData.title_highlight}
            </span>
          </h2>
          <p
            className="text-base sm:text-lg md:text-xl lg:text-2xl max-w-2xl mx-auto font-medium"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            {featuresData.subtitle}
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              className="group relative rounded-3xl p-6 cursor-pointer overflow-hidden"
              style={{
                background: `linear-gradient(135deg,${feat.color}08,rgba(10,10,18,0.9))`,
                border: `1px solid ${feat.color}18`,
              }}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{
                y: -4,
                borderColor: `${feat.color}40`,
                background: `linear-gradient(135deg,${feat.color}14,rgba(10,10,18,0.95))`,
              }}
            >
              {/* Glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100
                  transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at top left,${feat.color}15,transparent 70%)`,
                }}
              />

              {/* Tag */}
              <div className="flex items-center justify-between mb-4">
                <div
                  className="text-4xl"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.1))' }}
                >
                  {feat.icon}
                </div>
                <span
                  className="text-xs font-black px-2 py-1 rounded-lg uppercase
                    tracking-wider"
                  style={{ background: `${feat.color}18`, color: feat.color }}
                >
                  {feat.tag}
                </span>
              </div>

              <h3 className="font-space-grotesk text-lg font-bold text-white mb-2">
                {feat.title}
              </h3>
              <p
                className="font-inter text-base leading-relaxed mb-4 font-normal"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                {feat.desc}
              </p>

              <Link
                href="/register"
                className="text-xs font-bold flex items-center gap-1
                  transition-all hover:gap-2"
                style={{ color: feat.color }}
                onClick={(e) => e.stopPropagation()}
              >
                Try Now →
              </Link>
            </motion.div>
          ))}
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