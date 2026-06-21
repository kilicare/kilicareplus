'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Smartphone, Globe, Download } from 'lucide-react'
import downloadData from '@/data/download.json'

export function DownloadSection() {
  const downloadBackground = downloadData.background_image

  return (
    <section
      id="download"
      className="section-padding relative overflow-hidden"
      style={{
        background: downloadBackground 
          ? `url(${downloadBackground}) center/cover no-repeat` 
          : '#050508'
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
      {downloadBackground && (
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(5,5,8,0.6)'
          }}
        />
      )}
      {/* Glow */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%,rgba(245,166,35,0.4),transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="landing-container landing-container-2xl text-center relative">
        <motion.div
          initial={false}
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
            {downloadData.badge}
          </div>

          <h2 className="text-hero font-bold text-white mb-6 leading-tight">
            {downloadData.title}
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg,#F5A623,#FFD700)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {downloadData.title_highlight}
            </span>
          </h2>

          <p
            className="text-base sm:text-lg md:text-xl lg:text-2xl mb-12 max-w-2xl mx-auto font-medium"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            {downloadData.subtitle}
          </p>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-10">
            {downloadData.options.map((opt, i) => (
              <motion.div
                key={opt.label}
                className="rounded-2xl p-5"
                style={{
                  background: `${opt.color}08`,
                  border: `1px solid ${opt.color}20`,
                }}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="mb-3" style={{ color: opt.color }}>
                  {opt.icon === 'Smartphone' ? <Smartphone size={24} /> : opt.icon === 'Globe' ? <Globe size={24} /> : null}
                </div>
                <p className="font-inter font-semibold text-white mb-1">{opt.label}</p>
                <p className="font-inter text-xs font-normal" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {opt.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Main CTA */}
          <Link
            href={downloadData.cta.link}
            className="font-inter inline-flex items-center gap-3 px-10 py-5 rounded-2xl
              text-black font-semibold text-xl transition-all hover:scale-105
              active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#F5A623,#E8892A)',
              boxShadow: '0 0 60px rgba(245,166,35,0.4)',
            }}
          >
            <Download size={24} />
            {downloadData.cta.text}
          </Link>

          <p
            className="text-xs mt-4"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            {downloadData.note}
          </p>
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