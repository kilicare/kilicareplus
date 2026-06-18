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
      className="py-20 lg:py-28 px-4 relative overflow-hidden"
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

      <div className="max-w-7xl mx-auto relative">
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
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p
            className="text-lg max-w-xl mx-auto font-medium"
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
              hidden lg:block"
            style={{
              background:
                'linear-gradient(90deg,transparent,rgba(245,166,35,0.3),transparent)',
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                className="relative flex flex-col items-center text-center"
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
              >
                {/* Step icon circle */}
                <motion.div
                  className="relative w-28 h-28 rounded-3xl flex items-center
                    justify-center mb-6"
                  style={{
                    background: `linear-gradient(135deg,${step.color}18,rgba(10,10,18,0.9))`,
                    border: `2px solid ${step.color}30`,
                  }}
                  whileHover={{ scale: 1.05, borderColor: `${step.color}60` }}
                >
                  <span className="text-5xl">{step.icon}</span>
                  {/* Step number */}
                  <div
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full
                      flex items-center justify-center text-xs font-black text-black"
                    style={{ background: step.color }}
                  >
                    {step.step}
                  </div>
                </motion.div>

                <h3 className="font-space-grotesk text-lg font-bold text-white mb-2">
                  {step.title}
                </h3>
                <p
                  className="font-inter text-sm leading-relaxed font-normal"
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