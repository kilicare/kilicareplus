'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Smartphone, Globe, Download } from 'lucide-react'

export function DownloadSection() {
  return (
    <section
      id="download"
      className="py-20 lg:py-28 px-4 relative overflow-hidden"
      style={{ background: '#050508' }}
    >
      {/* Glow */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%,rgba(245,166,35,0.4),transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="max-w-4xl mx-auto text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full
              text-xs font-black uppercase tracking-widest mb-8"
            style={{
              background: 'rgba(245,166,35,0.1)',
              border: '1px solid rgba(245,166,35,0.3)',
              color: '#F5A623',
            }}
          >
            📱 Progressive Web App — Sakinisha Sasa!
          </div>

          <h2 className="text-4xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Tanzania Yote
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg,#F5A623,#FFD700)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Mfukoni Mwako
            </span>
          </h2>

          <p
            className="text-lg mb-12 max-w-2xl mx-auto"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            KilicareGO+ ni Progressive Web App — sakinisha moja kwa moja kwenye
            simu yako bila kupitia App Store. Haraka, offline-ready, na lightweight.
          </p>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[
              {
                icon:  <Smartphone size={24} />,
                label: 'Android',
                desc:  'Bonyeza "Add to Home Screen" kwenye Chrome',
                color: '#10B981',
              },
              {
                icon:  <Smartphone size={24} />,
                label: 'iOS',
                desc:  'Bonyeza Share → "Add to Home Screen" kwenye Safari',
                color: '#3B82F6',
              },
              {
                icon:  <Globe size={24} />,
                label: 'Web',
                desc:  'Tumia moja kwa moja kwenye browser yoyote',
                color: '#F5A623',
              },
            ].map((opt, i) => (
              <motion.div
                key={opt.label}
                className="rounded-2xl p-5"
                style={{
                  background: `${opt.color}08`,
                  border: `1px solid ${opt.color}20`,
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="mb-3" style={{ color: opt.color }}>{opt.icon}</div>
                <p className="font-black text-white mb-1">{opt.label}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {opt.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Main CTA */}
          <Link
            href="/register"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl
              text-black font-black text-xl transition-all hover:scale-105
              active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#F5A623,#E8892A)',
              boxShadow: '0 0 60px rgba(245,166,35,0.4)',
            }}
          >
            <Download size={24} />
            Anza Safari Yako — Ni Bure 🇹🇿
          </Link>

          <p
            className="text-xs mt-4"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Hakuna App Store inahitajika · Inafanya kazi offline · 2MB tu
          </p>
        </motion.div>
      </div>
    </section>
  )
}