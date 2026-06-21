'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Check } from 'lucide-react'
import pricingData from '@/data/pricing.json'

const PLANS = pricingData.plans

export function PricingSection() {
  const pricingBackground = pricingData.background_image

  return (
    <section
      id="pricing"
      className="section-padding relative overflow-hidden"
      style={{
        background: pricingBackground 
          ? `url(${pricingBackground}) center/cover no-repeat` 
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
      {pricingBackground && (
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
          className="text-center mb-14"
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: '#F5A623' }}
          >
            {pricingData.section_label}
          </p>
          <h2 className="text-section font-bold text-white mb-4">
            {pricingData.title}
          </h2>
          <p
            className="text-base sm:text-lg md:text-xl lg:text-2xl max-w-xl mx-auto font-medium"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            {pricingData.subtitle}
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              className="relative rounded-3xl p-6 overflow-hidden"
              style={{
                background: plan.popular
                  ? `linear-gradient(135deg,${plan.color}10,rgba(10,10,18,0.98))` 
                  : 'rgba(15,15,22,0.9)',
                border: plan.popular
                  ? `2px solid ${plan.color}50` 
                  : '1px solid rgba(255,255,255,0.08)',
                boxShadow: plan.popular
                  ? `0 0 50px ${plan.color}20` 
                  : 'none',
              }}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {plan.popular && (
                <div
                  className="font-inter absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 text-xs font-bold
                    text-black rounded-full shadow-lg"
                  style={{ background: plan.color }}
                >
                  ⭐ MOST POPULAR
                </div>
              )}

              <div className="mb-5">
                <div className="text-3xl mb-2">{plan.emoji}</div>
                <h3 className="font-space-grotesk text-xl font-bold text-white mb-0.5">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  {plan.price === 'Free' ? (
                    <span
                      className="font-jetbrains-mono text-3xl font-bold"
                      style={{ color: plan.color }}
                    >
                      FREE
                    </span>
                  ) : (
                    <>
                      <span
                        className="font-jetbrains-mono text-3xl font-bold"
                        style={{ color: plan.color }}
                      >
                        TZS {plan.price}
                      </span>
                      <span
                        className="font-inter text-sm font-normal"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        {plan.period}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 mb-7">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center
                        flex-shrink-0 mt-0.5"
                      style={{ background: `${plan.color}22` }}
                    >
                      <Check size={10} style={{ color: plan.color }} />
                    </div>
                    <span
                      className="font-inter text-base leading-snug font-normal"
                      style={{ color: 'rgba(255,255,255,0.9)' }}
                    >
                      {f}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href={plan.href}
                className="font-inter flex items-center justify-center w-full py-3.5
                  rounded-2xl text-sm font-semibold transition-all hover:scale-105
                  active:scale-95"
                style={
                  plan.popular
                    ? {
                        background: `linear-gradient(135deg,${plan.color},${plan.color}cc)`,
                        color: '#000',
                        boxShadow: `0 0 20px ${plan.color}30`,
                      }
                    : {
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                      }
                }
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Business plans note */}
        <motion.p
          className="text-center text-sm mt-8"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {pricingData.business_note}{' '}
          <a href="mailto:business@kilicarego.com" style={{ color: '#F5A623' }}>
            Contact Us
          </a>
        </motion.p>
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