'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { CreditCard, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { subscriptionsService } from '@/services/subscriptions.service'
import { KiliButton } from '@/components/ui/KiliButton'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { KiliBadge } from '@/components/ui/KiliBadge'
import { formatCurrency } from '@/lib/utils'
import { parseApiError } from '@/lib/utils'

export default function BillingPage() {
  const qc = useQueryClient()

  const { data: sub, isLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionsService.getMySubscription,
    staleTime: 1000 * 60 * 5,
  })

  const cancelMut = useMutation({
    mutationFn: subscriptionsService.cancel,
    onSuccess: () => {
      toast.success('Subscription imefutwa. Unaendelea hadi siku ya mwisho.')
      qc.invalidateQueries({ queryKey: ['my-subscription'] })
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  return (
    <div className="min-h-dvh bg-bg-base pt-safe pb-safe overflow-y-auto no-scrollbar px-5">
      <div className="pt-6 pb-5">
        <h1 className="text-2xl font-black text-text-primary mb-0.5">
          💳 Bili na Malipo
        </h1>
        <p className="text-text-muted text-sm">
          Simamia subscription na historia ya malipo yako
        </p>
      </div>

      {/* Current plan */}
      <div className="mb-5">
        <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
          Plan ya Sasa
        </h2>
        {isLoading ? (
          <SkeletonCard className="h-40" rounded="xl" />
        ) : (
          <motion.div
            className="rounded-3xl p-5"
            style={{
              background:
                sub?.plan?.name === 'PRO_GUIDE'
                  ? 'linear-gradient(135deg, rgba(245,166,35,0.1), rgba(10,10,15,0.95))'
                  : 'rgba(26,26,36,0.9)',
              border:
                sub?.plan?.name === 'PRO_GUIDE'
                  ? '1px solid rgba(245,166,35,0.3)'
                  : '1px solid rgba(255,255,255,0.08)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xl font-black text-text-primary">
                  {sub?.plan?.display_name || 'Free'}
                </p>
                <p className="text-text-muted text-sm mt-0.5">
                  {sub?.billing_cycle === 'monthly'
                    ? 'Malipo ya kila mwezi'
                    : sub?.billing_cycle === 'weekly'
                    ? 'Malipo ya kila wiki'
                    : 'Bure'}
                </p>
              </div>
              <KiliBadge
                variant={
                  (sub?.status as 'ACTIVE' | 'TRIAL' | 'EXPIRED') || 'ACTIVE'
                }
                size="sm"
              />
            </div>

            {/* Dates */}
            {sub?.end_date && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Inaanza</span>
                  <span className="text-text-primary font-medium">
                    {new Date(sub.start_date).toLocaleDateString('sw-TZ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Inaisha</span>
                  <span className="text-text-primary font-medium">
                    {new Date(sub.end_date).toLocaleDateString('sw-TZ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Siku zimebaki</span>
                  <span className="text-gold font-black">
                    {sub.days_remaining}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Link href="/subscribe" className="flex-1">
                <KiliButton fullWidth size="sm">
                  Badilisha Plan
                </KiliButton>
              </Link>
              {sub && sub.status !== 'FREE' && sub.auto_renew && (
                <KiliButton
                  variant="danger"
                  size="sm"
                  loading={cancelMut.isPending}
                  onClick={() => {
                    if (confirm('Una uhakika wa kufuta subscription?'))
                      cancelMut.mutate()
                  }}
                >
                  Futa
                </KiliButton>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Features */}
      {sub?.features && (
        <div className="mb-5">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
            Vipengele vya Plan Yako
          </h2>
          <div
            className="rounded-2xl p-4 space-y-2.5"
            style={{
              background: 'rgba(26,26,36,0.8)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {[
              {
                label: `Uzoefu ${sub.features.max_experiences === 9999 ? 'Unlimited' : sub.features.max_experiences}`,
                active: true,
              },
              { label: 'Analytics',        active: !!sub.features.has_analytics },
              { label: 'Verified Badge',   active: !!sub.features.has_verified_badge },
              { label: 'Booking System',   active: !!sub.features.has_booking_system },
              { label: 'Featured Listing', active: !!sub.features.has_featured_placement },
              { label: 'AI Unlimited',     active: !!sub.features.has_ai_unlimited },
              { label: 'Predictions Zote', active: !!sub.features.has_predictions_all },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                {f.active ? (
                  <CheckCircle size={14} className="text-kili-green flex-shrink-0" />
                ) : (
                  <XCircle size={14} className="text-text-disabled flex-shrink-0" />
                )}
                <span
                  className="text-sm"
                  style={{
                    color: f.active ? 'var(--text-primary)' : 'var(--text-disabled)',
                  }}
                >
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      <Link href="/subscribe">
        <motion.div
          className="rounded-3xl p-4 flex items-center gap-4 mb-5 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, rgba(245,166,35,0.08), rgba(10,10,15,0.9))',
            border: '1px solid rgba(245,166,35,0.2)',
          }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="text-3xl">⭐</div>
          <div className="flex-1">
            <p className="font-bold text-text-primary text-sm">
              Panda kwa Pro Guide
            </p>
            <p className="text-text-muted text-xs mt-0.5">
              TZS 25,000/mwezi · Verified badge · Booking system
            </p>
          </div>
          <ChevronRight size={16} className="text-gold" />
        </motion.div>
      </Link>
    </div>
  )
}