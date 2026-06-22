'use client'
// Force dynamic rendering to prevent static pre-rendering during build
// This ensures auth state is evaluated at runtime, not build time
export const dynamic = 'force-dynamic'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  BarChart2, Plus, Store, Calendar,
  TrendingUp, Eye, Star, ChevronRight,
} from 'lucide-react'
import { subscriptionsService } from '@/services/subscriptions.service'
import { experiencesService } from '@/services/experiences.service'
import { KiliButton } from '@/components/ui/KiliButton'
import { SkeletonCard, SkeletonText } from '@/components/ui/SkeletonCard'
import { useAuthStore } from '@/stores/auth.store'
import { TrustScoreRing } from '@/components/ui/TrustScoreRing'
import { KiliBadge } from '@/components/ui/KiliBadge'
import { formatCount, formatCurrency } from '@/lib/utils'

function StatCard({
  icon,
  label,
  value,
  color = '#F5A623',
  sub,
}: {
  icon: string
  label: string
  value: string | number
  color?: string
  sub?: string
}) {
  return (
    <motion.div
      className="rounded-2xl p-4"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-xl font-black" style={{ color }}>
        {value}
      </p>
      <p className="text-xs font-medium text-text-secondary mt-0.5">
        {label}
      </p>
      {sub && <p className="text-[10px] text-text-muted mt-0.5">{sub}</p>}
    </motion.div>
  )
}

const QUICK_ACTIONS = [
  {
    icon: '⭐',
    label: 'Ongeza Uzoefu',
    sub: 'Add Experience',
    href: '/experiences/new',
    color: '#F5A623',
  },
  {
    icon: '🛍️',
    label: 'Showcase',
    sub: 'Manage Store',
    href: '/showcase',
    color: '#10B981',
  },
  {
    icon: '📅',
    label: 'Bookings',
    sub: 'Manage Bookings',
    href: '/bookings',
    color: '#3B82F6',
  },
  {
    icon: '📊',
    label: 'Analytics',
    sub: 'View Stats',
    href: '/analytics',
    color: '#8B5CF6',
  },
]

export default function CreatorDashboardPage() {
  const { user } = useAuthStore()

  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionsService.getMySubscription,
    staleTime: 1000 * 60 * 5,
  })

  const { data: myExps = [], isLoading: expsLoading } = useQuery({
    queryKey: ['my-experiences'],
    queryFn: experiencesService.getMyExperiences,
    staleTime: 1000 * 60 * 5,
  })

  const passport = user?.passport_info
  const totalViews = myExps.reduce((s, e) => s + e.views, 0)

  return (
    <div className="min-h-dvh bg-bg-base pt-safe pb-safe overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-text-primary">
              Dashboard 📊
            </h1>
            <p className="text-text-muted text-sm mt-0.5">
              Karibu, {user?.first_name || user?.username}!
            </p>
          </div>
          <TrustScoreRing
            score={passport?.trust_score ?? 50}
            size="md"
          />
        </div>
      </div>

      {/* Subscription Card */}
      <div className="px-5 mb-5">
        {subLoading ? (
          <SkeletonCard className="h-28" rounded="xl" />
        ) : (
          <motion.div
            className="rounded-3xl p-5"
            style={{
              background:
                sub?.plan?.name === 'PRO_GUIDE'
                  ? 'linear-gradient(135deg, rgba(245,166,35,0.12), rgba(10,10,15,0.9))'
                  : 'rgba(26,26,36,0.8)',
              border:
                sub?.plan?.name === 'PRO_GUIDE'
                  ? '1px solid rgba(245,166,35,0.3)'
                  : '1px solid rgba(255,255,255,0.08)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">
                  Plan Yako
                </p>
                <p className="text-lg font-black text-text-primary mt-0.5">
                  {sub?.plan?.display_name ?? 'Free'}
                </p>
              </div>
              <KiliBadge
                variant={
                  (sub?.status as 'ACTIVE' | 'TRIAL' | 'EXPIRED') ?? 'ACTIVE'
                }
                size="sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-text-muted">
                {sub?.days_remaining !== undefined && (
                  <span>Siku {sub.days_remaining} zimebaki</span>
                )}
              </div>
              <Link href="/subscribe">
                <KiliButton size="xs" variant="outline">
                  Panda Kiwango
                </KiliButton>
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* Stats */}
      <div className="px-5 mb-5">
        <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
          Takwimu
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon="⭐"
            label="Uzoefu"
            value={myExps.length}
            sub={`Kati ya ${sub?.features?.max_experiences ?? 2}`}
          />
          <StatCard
            icon="👁️"
            label="Maoni"
            value={formatCount(totalViews)}
            color="#3B82F6"
            sub="Jumla ya wiki hii"
          />
          <StatCard
            icon="⭐"
            label="Alama za Imani"
            value={passport?.trust_score ?? 50}
            color="#10B981"
          />
          <StatCard
            icon="🏆"
            label="Pointi"
            value={formatCount(passport?.points ?? 0)}
            color="#8B5CF6"
            sub={passport?.level}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 mb-5">
        <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
          Vitendo vya Haraka
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href}>
              <motion.div
                className="rounded-2xl p-4 cursor-pointer"
                style={{
                  background: `${action.color}08`,
                  border: `1px solid ${action.color}20`,
                }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="text-3xl block mb-2">{action.icon}</span>
                <p
                  className="text-sm font-bold"
                  style={{ color: action.color }}
                >
                  {action.label}
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {action.sub}
                </p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* My Experiences */}
      <div className="px-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">
            Uzoefu Wangu
          </h2>
          <Link href="/experiences">
            <span className="text-xs text-gold flex items-center gap-1">
              Zote <ChevronRight size={12} />
            </span>
          </Link>
        </div>

        {expsLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <SkeletonCard key={i} className="h-20" rounded="xl" />
            ))}
          </div>
        ) : myExps.length === 0 ? (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: 'rgba(26,26,36,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-4xl block mb-3">⭐</span>
            <p className="text-text-primary font-bold mb-1">
              Ongeza Uzoefu Wako wa Kwanza
            </p>
            <p className="text-text-muted text-sm mb-4">
              Waambie watalii kuhusu Tanzania yako
            </p>
            <Link href="/experiences/new">
              <KiliButton size="sm">
                <Plus size={14} /> Ongeza Uzoefu
              </KiliButton>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myExps.slice(0, 3).map((exp) => (
              <motion.div
                key={exp.id}
                className="flex items-center gap-3 rounded-2xl p-3"
                style={{
                  background: 'rgba(26,26,36,0.8)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
                whileTap={{ scale: 0.99 }}
              >
                {exp.primary_image?.file_url ? (
                  <img
                    src={exp.primary_image.file_url}
                    alt={exp.title}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                    style={{ background: 'rgba(245,166,35,0.1)' }}
                  >
                    ⭐
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">
                    {exp.title}
                  </p>
                  <p className="text-xs text-text-muted">{exp.category}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Eye size={10} /> {formatCount(exp.views)}
                    </span>
                    {exp.today_moment_active && (
                      <span className="text-xs text-kili-green font-bold">
                        ⚡ Leo!
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}