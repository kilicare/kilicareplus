'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { href: '#features',    label: 'Features',    icon: '⚡' },
  { href: '#how-it-works',label: 'How It Works',icon: '🔄' },
  { href: '#pricing',     label: 'Pricing',     icon: '💰' },
  { href: '#download',    label: 'Download',    icon: '📱' },
]

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 landing-nav">
        <div className="landing-container landing-container-2xl">
          <div className="flex items-center justify-between h-16 sm:h-18 md:h-20 lg:h-20 xl:h-22">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="landing-nav-logo">
                K
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                KilicareGO
                <span className="landing-nav-plus">+</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="landing-nav-link"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3 xl:gap-4">
              <Link
                href="/login"
                className="landing-nav-signin"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="landing-nav-cta"
              >
                Get Started Free 🚀
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden landing-nav-menu-btn"
              aria-label="Menu"
            >
              {mobileOpen
                ? <X size={20} className="text-white" />
                : <Menu size={20} className="text-white" />
              }
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="landing-nav-overlay" onClick={() => setMobileOpen(false)}>
          <div
            className="landing-nav-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with close button */}
            <div className="landing-nav-drawer-header">
              <button
                onClick={() => setMobileOpen(false)}
                className="landing-nav-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation links */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="landing-nav-drawer-link"
                  >
                    <span className="text-lg">{link.icon}</span>
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="landing-nav-drawer-footer">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="landing-nav-drawer-signin"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="landing-nav-drawer-cta"
              >
                Get Started Free 🚀
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}