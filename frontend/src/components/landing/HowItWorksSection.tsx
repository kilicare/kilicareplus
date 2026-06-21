'use client'
import { motion } from 'framer-motion'

const STEPS = [
  {
    step:   '01',
    icon:   '📱',
    title:  'Create Your Account',
    desc:   'Sign up as a Traveler or Local Guide. Quick verification — ready in 30 seconds.',
    color:  '#F5A623',
  },
  {
    step:   '02',
    icon:   '🔍',
    title:  'Discover Tanzania',
    desc:   'Browse the experience feed, check the map, and read safety tips. Your AI Companion is ready.',
    color:  '#10B981',
  },
  {
    step:   '03',
    icon:   '🤝',
    title:  'Connect with Guides',
    desc:   'Find a verified local guide, chat with them, and book securely with M-Pesa payments.',
    color:  '#3B82F6',
  },
  {
    step:   '04',
    icon:   '🌟',
    title:  'Experience Tanzania',
    desc:   'Your journey begins! Share moments, earn badges, and become a Tanzania ambassador.',
    color:  '#8B5CF6',
  },
]

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="section-padding relative overflow-hidden"
      style={{ background: '#050508' }}
    >
      {/* Top gradient fade to blend with previous section */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, #050508, transparent)'
        }}
      />
      {/* Background decoration */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[800px] h-[400px] opacity-5 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse,rgba(245,166,35,0.6) 0%,transparent 70%)',
          filter: 'blur(20px)',
        }}
      />

      <div className="landing-container landing-container-2xl relative">
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
            Getting Started
          </p>
          <h2 className="text-section font-bold text-white mb-4">
            How It Works
          </h2>
          <p
            className="text-base sm:text-lg md:text-xl lg:text-2xl max-w-xl mx-auto font-medium"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            Simple as 1-2-3-4. Just a few minutes and you're ready to discover Tanzania.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line (desktop) */}
          <div
            className="absolute top-16 left-[12.5%] right-[12.5%] h-px
              hidden md:block"
            style={{
              background:
                'linear-gradient(90deg,transparent,rgba(245,166,35,0.3),transparent)',
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                className="relative flex flex-col items-center text-center group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -4 }}
              >
                {/* Step icon circle */}
                <motion.div
                  className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 rounded-3xl flex items-center
                    justify-center mb-6 ring-1 ring-white/10 group-hover:ring-gold/50 transition-all"
                  style={{
                    background: `linear-gradient(135deg,${step.color}20,rgba(10,10,18,0.95))`,
                    border: `2px solid ${step.color}35`,
                  }}
                  whileHover={{ scale: 1.05, borderColor: `${step.color}60` }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-5xl drop-shadow-lg">{step.icon}</span>
                  {/* Step number */}
                  <div
                    className="absolute -top-3 -right-3 w-9 h-9 rounded-full
                      flex items-center justify-center text-xs font-black text-black ring-2 ring-white/20"
                    style={{ 
                      background: step.color,
                      boxShadow: `0 0 20px ${step.color}40`
                    }}
                  >
                    {step.step}
                  </div>
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl" style={{
                    background: `radial-gradient(circle, ${step.color}15 0%, transparent 70%)`
                  }} />
                </motion.div>

                <h3 className="font-space-grotesk text-lg sm:text-xl font-bold text-white mb-2 drop-shadow-sm">
                  {step.title}
                </h3>
                <p
                  className="font-inter text-sm sm:text-base leading-relaxed font-medium"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-16"
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <a
            href="/register"
            className="font-inter inline-flex items-center gap-2 px-8 py-4 rounded-2xl
              text-black font-semibold text-lg transition-all hover:scale-105
              active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#F5A623,#E8892A)',
              boxShadow: '0 0 30px rgba(245,166,35,0.3)',
            }}
          >
            Get Started Free 🇹🇿
          </a>
        </motion.div>
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