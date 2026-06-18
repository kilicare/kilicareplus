'use client'
import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import statsData from '@/data/stats.json'

interface Stat {
  value: number
  suffix: string
  label: string
  sublabel: string
  icon: string
  color: string
}

const STATS: Stat[] = statsData.stats

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const [display, setDisplay] = useState(0)
  const ref      = useRef(null)
  const inView   = useInView(ref, { once: true, margin: '-80px' })

  useEffect(() => {
    if (!inView) return
    const duration   = 2000
    const steps      = 60
    const increment  = value / steps
    let current      = 0
    const interval   = setInterval(() => {
      current = Math.min(current + increment, value)
      setDisplay(current)
      if (current >= value) clearInterval(interval)
    }, duration / steps)
    return () => clearInterval(interval)
  }, [inView, value])

  const formatted =
    value >= 1000
      ? `${(display / 1000).toFixed(1)}K`
      : value < 10 && suffix === '★'
      ? display.toFixed(1)
      : value === 99.9
      ? display.toFixed(1)
      : Math.round(display).toString()

  return <span ref={ref}>{formatted}{suffix}</span>
}

export function StatsSection() {
  const statsBackground = statsData.background_image

  return (
    <section
      className="py-20 lg:py-28 px-4 relative overflow-hidden"
      style={{
        background: statsBackground 
          ? `url(${statsBackground}) center/cover no-repeat` 
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
      {statsBackground && (
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(5,5,8,0.0)'
          }}
        />
      )}
      {/* Top border gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg,transparent,rgba(245,166,35,0.4),transparent)',
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Section label */}
        <motion.div
          className="text-center mb-12"
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: '#F5A623' }}
          >
            {statsData.section_label}
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white">
            {statsData.title}
          </h2>
          <p
            className="text-lg mt-3 max-w-xl mx-auto font-medium"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            {statsData.subtitle}
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="rounded-2xl p-5 text-center relative overflow-hidden"
              style={{
                background: `${stat.color}08`,
                border: `1px solid ${stat.color}20`,
              }}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{
                scale: 1.03,
                borderColor: `${stat.color}40`,
                background: `${stat.color}12`,
              }}
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              <p
                className="font-jetbrains-mono text-2xl lg:text-3xl font-bold mb-0.5"
                style={{ color: stat.color }}
              >
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="font-inter text-xs font-semibold text-white/95 leading-tight mb-0.5">
                {stat.label}
              </p>
              <p className="font-inter text-xs font-normal" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {stat.sublabel}
              </p>
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