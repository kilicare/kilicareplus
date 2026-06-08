'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'

const FEATURES = [
  {
    icon:    '📸',
    title:   'Feed ya Moments',
    desc:    'Tazama na shiriki uzoefu wa kweli wa Tanzania kwa scroll kama TikTok. Double-tap kupenda.',
    color:   '#F5A623',
    tag:     'TikTok-style',
    demo:    '/feed',
  },
  {
    icon:    '🤖',
    title:   'AI Guide ya Tanzania',
    desc:    'Zungumza na AI inayojua Tanzania yote — Kiswahili au Kiingereza. Maswali yoyote, wakati wowote.',
    color:   '#10B981',
    tag:     'Groq llama-3.3',
    demo:    '/ai',
  },
  {
    icon:    '🆘',
    title:   'SOS Dharura',
    desc:    'Shika kitufe sekunde 3 — guides wa karibu wanaarifu mara moja. Salama Tanzania yote.',
    color:   '#FF2D2D',
    tag:     'Real-time WebSocket',
    demo:    '/sos',
  },
  {
    icon:    '🗺️',
    title:   'Ramani ya Maarifa',
    desc:    'Tips za usalama, uzoefu, na maeneo — kwenye ramani ya giza ya Mapbox na markers za rangi.',
    color:   '#3B82F6',
    tag:     'Mapbox Dark',
    demo:    '/map',
  },
  {
    icon:    '📅',
    title:   'Booking na Escrow',
    desc:    'Weka booking na guide verified. Malipo kwenye escrow — salama kabisa hadi uzoefu ukamilike.',
    color:   '#8B5CF6',
    tag:     'M-Pesa Escrow',
    demo:    '/register',
  },
  {
    icon:    '🎯',
    title:   'KilicareBet Predictions',
    desc:    'AI predictions za EPL, La Liga, na Bundesliga. Per-league models za XGBoost na ELO system.',
    color:   '#F59E0B',
    tag:     'Elite V4 AI',
    demo:    '/predictions',
  },
  {
    icon:    '🛂',
    title:   'Passport ya Gamification',
    desc:    'Pata pointi, fungua badges, na panda kiwango. Leaderboard ya watalii bora Tanzania.',
    color:   '#EC4899',
    tag:     'Gamified XP',
    demo:    '/passport',
  },
  {
    icon:    '🛍️',
    title:   'Virtual Showcase',
    desc:    'Nunua bidhaa za asili za Tanzania moja kwa moja kwa mtengenezaji. Escrow ya 7% inakuhifadhi.',
    color:   '#14B8A6',
    tag:     'E-Commerce',
    demo:    '/showcase',
  },
]

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-20 lg:py-28 px-4 relative"
      style={{ background: 'linear-gradient(180deg,#050508 0%,#0A0A12 100%)' }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: '#F5A623' }}
          >
            Vipengele
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Kila Kitu Unachohitaji
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg,#F5A623,#FFD700)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Safari Nzuri
            </span>
          </h2>
          <p
            className="text-lg max-w-2xl mx-auto"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            Super-app moja inayounganisha watalii, guides, biashara, na usalama
            katika Tanzania yote — kutoka Zanzibar hadi Kilimanjaro.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              className="group relative rounded-3xl p-6 cursor-pointer overflow-hidden"
              style={{
                background: `linear-gradient(135deg,${feat.color}08,rgba(10,10,18,0.9))`,
                border: `1px solid ${feat.color}18`,
              }}
              initial={{ opacity: 0, y: 30 }}
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
                  className="text-[10px] font-black px-2 py-1 rounded-lg uppercase
                    tracking-wider"
                  style={{ background: `${feat.color}18`, color: feat.color }}
                >
                  {feat.tag}
                </span>
              </div>

              <h3 className="text-base font-black text-white mb-2">
                {feat.title}
              </h3>
              <p
                className="text-sm leading-relaxed mb-4"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {feat.desc}
              </p>

              <Link
                href="/register"
                className="text-xs font-bold flex items-center gap-1
                  opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: feat.color }}
                onClick={(e) => e.stopPropagation()}
              >
                Jaribu sasa →
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}