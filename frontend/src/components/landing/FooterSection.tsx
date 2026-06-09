'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'

const LINKS = {
  'Bidhaa': [
    { label: 'Feed ya Moments',  href: '/register' },
    { label: 'AI Guide',          href: '/register' },
    { label: 'SOS Salama',        href: '/register' },
    { label: 'Booking System',    href: '/register' },
    { label: 'KilicareBet',       href: '/register' },
    { label: 'Virtual Showcase',  href: '/register' },
  ],
  'Watumiaji': [
    { label: 'Watalii',    href: '/register' },
    { label: 'Local Guides', href: '/register' },
    { label: 'B2B Partners', href: '/register' },
    { label: 'Bei',          href: '/#pricing' },
  ],
  'Kampuni': [
    { label: 'Kuhusu Sisi',   href: '#' },
    { label: 'Blog',           href: '#' },
    { label: 'Fanya Kazi Nasi', href: '#' },
    { label: 'Wasiliana',       href: 'mailto:info@kilicarego.com' },
  ],
  'Kisheria': [
    { label: 'Sera ya Faragha', href: '#' },
    { label: 'Masharti ya Matumizi', href: '#' },
    { label: 'TBL Compliance',   href: '#' },
    { label: 'Ulinzi wa Data',   href: '#' },
  ],
}

const SOCIALS = [
  { label: 'Twitter/X', href: '#', emoji: '🐦' },
  { label: 'Instagram', href: '#', emoji: '📸' },
  { label: 'Facebook',  href: '#', emoji: '👤' },
  { label: 'YouTube',   href: '#', emoji: '▶️' },
  { label: 'WhatsApp',  href: '#', emoji: '💬' },
]

export function FooterSection() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{ background: '#030305' }}
    >
      {/* Top border */}
      <div
        className="h-px w-full"
        style={{
          background: 'linear-gradient(90deg,transparent,rgba(245,166,35,0.3),transparent)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Top row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 mb-14">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center
                  text-base font-black text-black"
                style={{ background: 'linear-gradient(135deg,#F5A623,#E8892A)' }}
              >
                K
              </div>
              <span className="text-white font-black text-lg">
                KilicareGO<span style={{ color: '#F5A623' }}>+</span>
              </span>
            </Link>
            <p
              className="text-sm leading-relaxed mb-5"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              Tanzania's First Tourism Super-App. Tunaunganisha watalii na maeneo
              ya kipekee ya Afrika Mashariki.
            </p>
            {/* Socials */}
            <div className="flex gap-2 flex-wrap">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center
                    text-base transition-all hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  {s.emoji}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="text-xs font-black uppercase tracking-widest mb-4 text-white">
                {section}
              </p>
              <div className="space-y-2.5">
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block text-sm transition-colors duration-200"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#F5A623')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')
                    }
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between
            gap-4 pt-8 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © 2026 KilicareGO+ · Dar es Salaam, Tanzania 🇹🇿
          </p>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            {[
              { emoji: '🔒', label: 'SSL Secured' },
              { emoji: '💳', label: 'M-Pesa Daraja' },
              { emoji: '🤖', label: 'Groq AI' },
              { emoji: '🗺️', label: 'Mapbox' },
            ].map((b) => (
              <div
                key={b.label}
                className="flex items-center gap-1.5 text-xs"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <span>{b.emoji}</span>
                {b.label}
              </div>
            ))}
          </div>

          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Built with 🇹🇿 in Tanzania
          </p>
        </div>
      </div>
    </footer>
  )
}