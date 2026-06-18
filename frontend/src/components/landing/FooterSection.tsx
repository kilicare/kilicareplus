'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'

const LINKS = {
  'Products': [
    { label: 'Experience Feed',  href: '/register' },
    { label: 'AI Companion',     href: '/register' },
    { label: 'Safety Network',   href: '/register' },
    { label: 'Booking System',   href: '/register' },
    { label: 'Kilicare Play',    href: '/register' },
    { label: 'Culture Gallery',  href: '/register' },
  ],
  'Users': [
    { label: 'Travelers',     href: '/register' },
    { label: 'Local Guides',  href: '/register' },
    { label: 'B2B Partners',  href: '/register' },
    { label: 'Pricing',       href: '/#pricing' },
  ],
  'Company': [
    { label: 'About Us',      href: '#' },
    { label: 'Blog',          href: '#' },
    { label: 'Careers',       href: '#' },
    { label: 'Contact',       href: 'mailto:info@kilicarego.com' },
  ],
  'Legal': [
    { label: 'Privacy Policy',    href: '#' },
    { label: 'Terms of Service',   href: '#' },
    { label: 'TBL Compliance',     href: '#' },
    { label: 'Data Protection',    href: '#' },
  ],
};

const SOCIALS = [
  { label: 'Twitter/X', href: '#', emoji: '🐦' },
  { label: 'Instagram', href: '#', emoji: '📸' },
  { label: 'Facebook',  href: '#', emoji: '👤' },
  { label: 'YouTube',   href: '#', emoji: '▶️' },
  { label: 'WhatsApp',  href: '#', emoji: '💬' },
];

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
              <span className="text-white font-bold text-lg">
                KilicareGO<span style={{ color: '#F5A623' }}>+</span>
              </span>
            </Link>
            <p
              className="text-sm leading-relaxed mb-5"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              Tanzania Real-World Experience Network. Connecting people to real life Tanzania through locals, experiences, and safety.
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
              <p className="font-inter text-xs font-semibold uppercase tracking-widest mb-4 text-white">
                {section}
              </p>
              <div className="space-y-2.5">
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="font-inter block text-sm transition-colors duration-200"
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
          <p className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © 2026 KilicareGO+ · Dar es Salaam, Tanzania 🇹🇿
          </p>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            {[
              { emoji: '🔒', label: 'SSL Secured' },
              { emoji: '💳', label: 'M-Pesa Daraja' },
              { emoji: '🤖', label: 'Smart AI' },
              { emoji: '🗺️', label: 'Smart Maps' },
            ].map((b) => (
              <div
                key={b.label}
                className="font-inter flex items-center gap-1.5 text-xs"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <span>{b.emoji}</span>
                {b.label}
              </div>
            ))}
          </div>

          <p className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Built with 🇹🇿 in Tanzania
          </p>
        </div>
      </div>
    </footer>
  )
}