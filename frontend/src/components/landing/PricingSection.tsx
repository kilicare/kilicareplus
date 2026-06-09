'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { useState, useEffect } from 'react'

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return (window as any).NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  }
  return (globalThis as any).process?.env?.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
}

const PLANS = [
  {
    name:      'Tourist',
    emoji:     '🌍',
    price:     'Bure',
    period:    '',
    color:     '#10B981',
    popular:   false,
    features: [
      'Feed ya Moments bila kikomo',
      'AI Guide mazungumzo 20/siku',
      'Ramani na Tips zote',
      'SOS ya dharura 24/7',
      'Messaging na guides',
      'Passport + Badges',
      'Predictions 2 bure/siku',
    ],
    cta:   'Anza Bure Sasa',
    href:  '/register',
  },
  {
    name:      'Pro Guide',
    emoji:     '⭐',
    price:     '25,000',
    period:    '/mwezi',
    color:     '#F5A623',
    popular:   true,
    features: [
      'Kila kitu cha Tourist',
      'Experiences bila kikomo',
      'Verified Badge ✓',
      'Booking System na Escrow',
      'Analytics ya kina',
      'Featured Placement 10x',
      'Virtual Showcase (500 items)',
      'AI Unlimited',
    ],
    cta:   'Jaribu Siku 14 Bure',
    href:  '/register',
  },
  {
    name:      'Sports Premium',
    emoji:     '🎯',
    price:     '3,000',
    period:    '/mwezi',
    color:     '#8B5CF6',
    popular:   false,
    features: [
      'Kila kitu cha Tourist',
      'Predictions zote (EPL, La Liga, BL)',
      'Value Bet signals zote',
      'WhatsApp alerts',
      'BTTS + Over 2.5 analysis',
      'ELO comparison tool',
    ],
    cta:   'Jaribu Siku 14 Bure',
    href:  '/register',
  },
]

export function PricingSection() {
  const [pricingBackground, setPricingBackground] = useState<string>('')

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/admin-ops/landing-page/config/`)
        if (response.ok) {
          const data = await response.json()
          if (data.pricing_background_image) {
            setPricingBackground(data.pricing_background_image)
          }
        }
      } catch (error) {
        console.warn('Failed to fetch landing page config, using default background')
      }
    }

    fetchConfig()
  }, [])

  return (
    <section
      id="pricing"
      className="py-20 lg:py-28 px-4 relative overflow-hidden"
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
            background: 'rgba(5,5,8,0.6)'
          }}
        />
      )}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: '#F5A623' }}
          >
            Bei
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Bei Wazi, Thamani Halisi
          </h2>
          <p
            className="text-xl max-w-xl mx-auto font-semibold"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            Anza bure. Panda kiwango unapohitaji zaidi.
            Malipo ya M-Pesa — rahisi na ya haraka.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {plan.popular && (
                <div
                  className="absolute top-0 right-6 px-4 py-1.5 text-xs font-black
                    text-black rounded-b-xl"
                  style={{ background: plan.color }}
                >
                  ⭐ POPULAR
                </div>
              )}

              <div className="mb-5">
                <div className="text-3xl mb-2">{plan.emoji}</div>
                <h3 className="text-xl font-black text-white mb-0.5">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  {plan.price === 'Bure' ? (
                    <span
                      className="text-3xl font-black"
                      style={{ color: plan.color }}
                    >
                      BURE
                    </span>
                  ) : (
                    <>
                      <span
                        className="text-3xl font-black"
                        style={{ color: plan.color }}
                      >
                        TZS {plan.price}
                      </span>
                      <span
                        className="text-sm font-medium"
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
                      className="text-base leading-snug font-semibold"
                      style={{ color: 'rgba(255,255,255,0.9)' }}
                    >
                      {f}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href={plan.href}
                className="flex items-center justify-center w-full py-3.5
                  rounded-2xl text-sm font-black transition-all hover:scale-105
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
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          B2B dashboard na Enterprise plans zinapatikana.{' '}
          <a href="mailto:business@kilicarego.com" style={{ color: '#F5A623' }}>
            Wasiliana nasi
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