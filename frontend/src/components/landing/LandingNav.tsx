'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { href: '#features',    label: 'Vipengele' },
  { href: '#how-it-works',label: 'Jinsi Inavyofanya Kazi' },
  { href: '#pricing',     label: 'Bei' },
  { href: '#download',    label: 'Pakua' },
]

export function LandingNav() {
  const [scrolled,    setScrolled]    = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? 'rgba(5,5,8,0.92)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled
            ? '1px solid rgba(245,166,35,0.12)'
            : 'none',
        }}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center
                  text-base font-black text-black"
                style={{ background: 'linear-gradient(135deg,#F5A623,#E8892A)' }}
              >
                K
              </div>
              <span className="text-white font-black text-lg tracking-tight">
                KilicareGO
                <span style={{ color: '#F5A623' }}>+</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium transition-colors duration-200"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#F5A623')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
                style={{ color: 'rgba(255,255,255,0.8)' }}
              >
                Ingia
              </Link>
              <Link
                href="/register"
                className="text-sm font-black px-5 py-2.5 rounded-xl text-black
                  transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#F5A623,#E8892A)' }}
              >
                Anza Bure 🚀
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center
                justify-center"
              style={{ background: 'rgba(255,255,255,0.06)' }}
              aria-label="Menu"
            >
              {mobileOpen
                ? <X size={20} className="text-white" />
                : <Menu size={20} className="text-white" />
              }
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="absolute top-0 right-0 bottom-0 w-72 flex flex-col p-6 pt-20"
              style={{
                background: 'rgba(10,10,15,0.98)',
                borderLeft: '1px solid rgba(245,166,35,0.15)',
                backdropFilter: 'blur(20px)',
              }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            >
              <div className="space-y-1 mb-8">
                {NAV_LINKS.map((link, i) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center py-3 px-4 rounded-xl text-sm font-medium"
                    style={{ color: 'rgba(255,255,255,0.75)' }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    {link.label}
                  </motion.a>
                ))}
              </div>

              <div className="space-y-3 mt-auto">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-full py-3 rounded-xl
                    text-sm font-bold border text-white"
                  style={{ borderColor: 'rgba(255,255,255,0.15)' }}
                >
                  Ingia
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-full py-3 rounded-xl
                    text-sm font-black text-black"
                  style={{ background: 'linear-gradient(135deg,#F5A623,#E8892A)' }}
                >
                  Anza Bure 🚀
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}