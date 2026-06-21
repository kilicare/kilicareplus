'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronRight, TrendingUp, Users, Activity, DollarSign, Star, CreditCard } from 'lucide-react'
import api from '@/core/api/axios'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { formatCurrency, formatCount } from '@/lib/utils'

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-platform-stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin-ops/platform-stats/')
      return data
    },
    staleTime: 1000 * 60,
  })

  const { data: revenue } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin-ops/revenue/')
      return data
    },
    staleTime: 1000 * 60,
  })

  const { data: sos } = useQuery({
    queryKey: ['admin-sos-stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin-ops/sos/statistics/')
      return data
    },
    staleTime: 1000 * 30,
  })

  const QUICK_LINKS = [
    { href: '/admin/users',      label: 'Watumiaji',   icon: Users,    color: '#3B82F6' },
    { href: '/admin/payments',   label: 'Payments',   icon: CreditCard, color: '#10B981' },
    { href: '/admin/moderation', label: 'Moderation',  icon: Activity, color: '#F5A623' },
    { href: '/admin/sos-monitor',label: 'SOS Monitor', icon: TrendingUp, color: '#EF4444' },
    { href: '/admin/landing-page', label: 'Landing Page', icon: DollarSign, color: '#F59E0B' },
    { href: '/admin/testimonials', label: 'Testimonials', icon: Star, color: '#EC4899' },
  ]

  return (
    <div className="min-h-dvh bg-bg-base pt-safe pb-safe overflow-y-auto no-scrollbar">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-black text-text-primary">
          ⚙️ Admin Dashboard
        </h1>
        <p className="text-text-muted text-sm mt-0.5">
          Kilicare+ Operations
        </p>
      </div>

      {/* Revenue Card */}
      <div className="px-5 mb-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(245,166,35,0.12), rgba(10,10,15,0.95))',
            border: '1px solid rgba(245,166,35,0.25)',
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, #F5A623, transparent)' }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={20} className="text-gold" />
              <p className="text-sm text-text-muted">Mapato Mwezi Huu</p>
            </div>
            <p className="text-3xl font-black text-gold">
              {formatCurrency(revenue?.total_this_month || 0)}
            </p>
            <div className="flex gap-4 mt-4">
              <div className="flex-1 p-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] text-text-muted mb-1">Subscriptions</p>
                <p className="text-sm font-bold text-text-primary">
                  {formatCurrency(revenue?.subscription_revenue_this_month || 0)}
                </p>
              </div>
              <div className="flex-1 p-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] text-text-muted mb-1">Bookings</p>
                <p className="text-sm font-bold text-text-primary">
                  {formatCurrency(revenue?.booking_fees_this_month || 0)}
                </p>
              </div>
              <div className="flex-1 p-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] text-text-muted mb-1">Active Subs</p>
                <p className="text-sm font-bold text-text-primary">
                  {revenue?.active_subscriptions || 0}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Platform stats */}
      {isLoading ? (
        <div className="px-5 grid grid-cols-2 gap-3 mb-5">
          {[0,1,2,3].map((i) => <SkeletonCard key={i} className="h-28" rounded="xl" />)}
        </div>
      ) : (
        <div className="px-5 grid grid-cols-2 gap-3 mb-5">
          {[
            { label:'Watumiaji',  value: stats?.users_total    || 0, icon: Users,    color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
            { label:'Guides',     value: stats?.guides_total   || 0, icon: Activity, color: '#F5A623', bg: 'rgba(245,166,35,0.12)' },
            { label:'Moments',    value: stats?.moments_total  || 0, icon: TrendingUp, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
            { label:'Bookings',   value: stats?.bookings_total || 0, icon: DollarSign, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-20"
                style={{ background: `radial-gradient(circle, ${s.color}, transparent)` }}
              />
              <div className="relative z-10">
                <s.icon size={20} className="mb-2" style={{ color: s.color }} />
                <p className="text-xl font-black" style={{ color: s.color }}>
                  {formatCount(s.value)}
                </p>
                <p className="text-xs text-text-muted">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* SOS stats */}
      {sos && sos.active > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="px-5 mb-5">
          <Link href="/admin/sos-monitor">
            <div className="rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20"
                style={{ background: 'radial-gradient(circle, #EF4444, transparent)' }}
              />
              <div className="relative z-10 w-2 h-2 rounded-full bg-kili-red animate-pulse" />
              <p className="text-sm font-bold text-kili-red">
                {sos.active} SOS Active | {sos.critical_active} Critical
              </p>
              <ChevronRight size={16} className="text-kili-red ml-auto" />
            </div>
          </Link>
        </motion.div>
      )}

      {/* Quick links */}
      <div className="px-5 space-y-3 pb-8">
        {QUICK_LINKS.map((link, i) => (
          <Link key={link.href} href={link.href}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + (i * 0.1) }}
              className="flex items-center gap-4 rounded-2xl p-4 relative overflow-hidden"
              style={{ background: 'rgba(26,26,36,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
              whileHover={{ scale: 1.02, borderColor: `${link.color}40` }}
              whileTap={{ scale: 0.98 }}>
              <div className="p-2 rounded-xl"
                style={{ background: `${link.color}15`, border: `1px solid ${link.color}30` }}>
                <link.icon size={20} style={{ color: link.color }} />
              </div>
              <span className="flex-1 font-bold text-text-primary">{link.label}</span>
              <ChevronRight size={16} className="text-text-muted" />
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  )
}