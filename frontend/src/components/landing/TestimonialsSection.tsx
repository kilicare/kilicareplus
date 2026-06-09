'use client'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return (window as any).NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  }
  return (globalThis as any).process?.env?.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
}

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

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: 'Sarah Mitchell',
    role: 'Travel Blogger, USA 🇺🇸',
    avatar: 'S',
    color: '#F5A623',
    rating: 5,
    text: 'KilicareGO+ changed how I explore Tanzania. The AI guide answered every question in perfect English, and the SOS feature gave me peace of mind hiking Kilimanjaro. Absolutely world-class app!',
    location: 'Kilimanjaro Trek',
  },
  {
    id: 2,
    name: 'Abdullah Al-Rashid',
    role: 'Adventure Tourist, UAE 🇦🇪',
    avatar: 'A',
    color: '#10B981',
    rating: 5,
    text: 'Nilipata guide bora kabisa kupitia app hii. Booking ilikuwa rahisi, malipo ya M-Pesa yalifanya kazi vizuri, na uzoefu wa Serengeti ulikuwa bora zaidi ya ndoto yangu.',
    location: 'Serengeti Safari',
  },
  {
    id: 3,
    name: 'Amara Diallo',
    role: 'Local Guide, Zanzibar 🇹🇿',
    avatar: 'A',
    color: '#3B82F6',
    rating: 5,
    text: 'As a local guide, KilicareGO+ transformed my business. I get 10x more bookings, the escrow system protects me and my clients, and the analytics show me where to improve.',
    location: 'Zanzibar Tours',
  },
  {
    id: 4,
    name: 'Chen Wei',
    role: 'Digital Nomad, China 🇨🇳',
    avatar: 'C',
    color: '#8B5CF6',
    rating: 5,
    text: 'The moment feed is amazing — I could see real experiences from other tourists before booking. The KilicareBet predictions were surprisingly accurate for Tanzania Premier League!',
    location: 'Dar es Salaam',
  },
  {
    id: 5,
    name: 'Fatima Nkrumah',
    role: 'Business Traveler, Ghana 🇬🇭',
    avatar: 'F',
    color: '#EC4899',
    rating: 5,
    text: 'Safari bora kabisa Afrika! Nimesafiri nchi 23 lakini Tanzania na KilicareGO+ ilikuwa tofauti kabisa. App inaelewa utamaduni wetu na lugha yetu.',
    location: 'Arusha & Zanzibar',
  },
  {
    id: 6,
    name: 'Marco Rossi',
    role: 'Photographer, Italy 🇮🇹',
    avatar: 'M',
    color: '#F59E0B',
    rating: 5,
    text: 'The Moments feed helped me find incredible photography spots. Connected with a local guide through chat, booked instantly via M-Pesa. Shot the most beautiful wildlife photos of my career.',
    location: 'Ngorongoro Crater',
  },
]

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(FALLBACK_TESTIMONIALS)
  const [loading, setLoading] = useState(true)
  const [testimonialsBackground, setTestimonialsBackground] = useState<string>('')

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/admin-ops/public-testimonials/')
        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0) {
            setTestimonials(data)
          }
        }
      } catch (error) {
        console.warn('Failed to fetch testimonials, using fallback:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchConfig = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/admin-ops/landing-page/config/`)
        if (response.ok) {
          const data = await response.json()
          if (data.testimonials_background_image) {
            setTestimonialsBackground(data.testimonials_background_image)
          }
        }
      } catch (error) {
        console.warn('Failed to fetch landing page config, using default background')
      }
    }

    fetchTestimonials()
    fetchConfig()
  }, [])

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
            background: 'rgba(5,5,8,0.6)'
          }}
        />
      )}
      <div className="max-w-7xl mx-auto">
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
            Wanachosema Watumiaji
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Watu Wa Kweli,
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg,#F5A623,#FFD700)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Uzoefu Wa Kweli
            </span>
          </h2>
          <div className="flex items-center justify-center gap-2">
            {'★★★★★'.split('').map((s, i) => (
              <span key={i} style={{ color: '#F5A623', fontSize: 24 }}>{s}</span>
            ))}
            <span className="text-white/60 text-sm ml-2">4.8 / 5.0 (1,247 reviews)</span>
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
              initial={{ opacity: 0, y: 30 }}
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
                  <p className="text-base font-black text-white">{t.name}</p>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: 'rgba(255,255,255,0.85)' }}
                  >
                    {t.role}
                  </p>
                  <p
                    className="text-xs font-bold mt-0.5"
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