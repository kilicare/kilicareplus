'use client'
import { motion } from 'framer-motion'

const STEPS = [
  {
    step:   '01',
    icon:   '📱',
    title:  'Unda Akaunti Yako',
    desc:   'Jiandikishe kama Tourist au Local Guide. Uthibitisho wa haraka — tayari kwa sekunde 30.',
    color:  '#F5A623',
  },
  {
    step:   '02',
    icon:   '🔍',
    title:  'Gundua Tanzania',
    desc:   'Tazama Feed, angalia Ramani, soma Tips za usalama. AI yako ya Tanzania iko tayari.',
    color:  '#10B981',
  },
  {
    step:   '03',
    icon:   '🤝',
    title:  'Unganika na Guides',
    desc:   'Pata guide verified, ongea naye, weka booking salama na malipo salama ya M-Pesa.',
    color:  '#3B82F6',
  },
  {
    step:   '04',
    icon:   '🌟',
    title:  'Furahia Tanzania',
    desc:   'Safari yako inaanza! Shiriki moments, pata badges, na uwe ambassador wa Tanzania.',
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
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: '#F5A623' }}
          >
            Hatua za Kuanza
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Jinsi Inavyofanya Kazi
          </h2>
          <p
            className="text-lg max-w-xl mx-auto font-semibold"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            Rahisi kama 1-2-3-4. Dakika chache tu na uko tayari kugundua Tanzania.
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
                initial={{ opacity: 0, y: 30 }}
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

                <h3 className="text-lg font-black text-white mb-2">
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed font-semibold"
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
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl
              text-black font-black text-lg transition-all hover:scale-105
              active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#F5A623,#E8892A)',
              boxShadow: '0 0 30px rgba(245,166,35,0.3)',
            }}
          >
            Anza Sasa — Ni Bure 🇹🇿
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