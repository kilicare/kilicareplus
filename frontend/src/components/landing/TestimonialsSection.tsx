'use client'
import { motion } from 'framer-motion'
import testimonialsData from '@/data/testimonials.json'

interface Testimonial {
  id: number
  name: string
  role: string
  avatar: string
  color: string
  rating: number
  text: string
  location: string
  profile_url?: string
}

const TESTIMONIALS: Testimonial[] = testimonialsData.testimonials

export function TestimonialsSection() {
  const testimonials = TESTIMONIALS
  const testimonialsBackground = testimonialsData.background_image

  return (
    <section
      className="py-20 lg:py-28 px-4 relative overflow-hidden"
      style={{
        background: testimonialsBackground 
          ? `url(${testimonialsBackground}) center/cover no-repeat` 
          : 'linear-gradient(180deg,#0A0A12 0%,#050508 100%)'
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
      {testimonialsBackground && (
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(5,5,8,0.0)'
          }}
        />
      )}
      <div className="max-w-7xl mx-auto">
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
            {testimonialsData.section_label}
          </p>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            {testimonialsData.title}
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg,#F5A623,#FFD700)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {testimonialsData.title_highlight}
            </span>
          </h2>
          <div className="flex items-center justify-center gap-2">
            {'★★★★★'.split('').map((s, i) => (
              <span key={i} style={{ color: '#F5A623', fontSize: 24 }}>{s}</span>
            ))}
            <span className="text-white/60 text-sm ml-2">{testimonialsData.rating_display}</span>
          </div>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              className="relative rounded-3xl p-6 overflow-hidden"
              style={{
                background: `linear-gradient(135deg,${t.color}06,rgba(10,10,18,0.95))`,
                border: `1px solid ${t.color}18`,
              }}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{
                y: -3,
                borderColor: `${t.color}35`,
              }}
            >
              {/* Quote mark */}
              <div
                className="absolute top-4 right-4 text-6xl font-black opacity-10
                  leading-none pointer-events-none"
                style={{ color: t.color }}
              >
                "
              </div>

              {/* Rating */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <span key={i} style={{ color: '#F5A623' }}>★</span>
                ))}
              </div>

              {/* Text */}
              <p
                className="text-base leading-relaxed mb-5 relative z-10 font-semibold"
                style={{ color: 'rgba(255,255,255,0.95)' }}
              >
                "{t.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                {t.avatar && (t.avatar.startsWith('http') || t.avatar.startsWith('/')) ? (
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-11 h-11 rounded-2xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center
                      text-base font-black text-black flex-shrink-0"
                    style={{ background: `linear-gradient(135deg,${t.color},${t.color}cc)` }}
                  >
                    {t.avatar}
                  </div>
                )}
                <div>
                  <p className="font-inter text-base font-semibold text-white">{t.name}</p>
                  <p
                    className="font-inter text-sm font-medium"
                    style={{ color: 'rgba(255,255,255,0.85)' }}
                  >
                    {t.role}
                  </p>
                  <p
                    className="font-inter text-xs font-semibold mt-0.5"
                    style={{ color: t.color }}
                  >
                    📍 {t.location}
                  </p>
                </div>
              </div>
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