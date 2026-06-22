'use client'
// Force dynamic rendering to prevent static pre-rendering during build
// This ensures auth state is evaluated at runtime, not build time
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  DollarSign, TrendingUp, Users, CreditCard, Calendar,
  Filter, Search, MoreVertical, ChevronRight, Check, X,
  RefreshCw, Plus, Trash2, Edit, Eye, Download,
} from 'lucide-react'
import { adminPaymentsService, type AdminSubscription, type AdminPayment, type AdminRevenueStats } from '@/services/adminPayments.service'
import { KiliButton } from '@/components/ui/KiliButton'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatCount, cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'

// ── Stats Card ───────────────────────────────────────
function StatsCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: any
  label: string
  value: string | number
  trend?: string
  color: string
}) {
  return (
    <motion.div
      className="rounded-3xl p-5 relative overflow-hidden"
      style={{
        background: 'rgba(26,26,36,0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20"
        style={{ background: color }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={18} style={{ color }} />
          <p className="text-xs text-text-muted">{label}</p>
        </div>
        <p className="text-2xl font-black text-text-primary">{value}</p>
        {trend && (
          <p className="text-xs text-text-muted mt-1">{trend}</p>
        )}
      </div>
    </motion.div>
  )
}

// ── Subscription Row ───────────────────────────────
function SubscriptionRow({
  sub,
  onActivate,
  onCancel,
  onExtend,
}: {
  sub: AdminSubscription
  onActivate: (id: number) => void
  onCancel: (id: number) => void
  onExtend: (id: number) => void
}) {
  const [showActions, setShowActions] = useState(false)

  const statusColors = {
    ACTIVE: 'text-kili-green bg-kili-green/10 border-kili-green/20',
    TRIAL: 'text-gold bg-gold/10 border-gold/20',
    CANCELLED: 'text-red-400 bg-red-400/10 border-red-400/20',
    EXPIRED: 'text-text-muted bg-text-muted/10 border-text-muted/20',
  }

  return (
    <motion.div
      className="rounded-2xl p-4 border"
      style={{
        background: 'rgba(26,26,36,0.6)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-bold text-text-primary text-sm">
              {sub.user.first_name} {sub.user.last_name}
            </p>
            <span className="text-xs text-text-muted">@{sub.user.username}</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                statusColors[sub.status]
              )}
            >
              {sub.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-text-muted">Plan</p>
              <p className="text-text-primary font-medium">{sub.plan.display_name}</p>
            </div>
            <div>
              <p className="text-text-muted">Billing</p>
              <p className="text-text-primary font-medium capitalize">{sub.billing_cycle}</p>
            </div>
            <div>
              <p className="text-text-muted">Start Date</p>
              <p className="text-text-primary font-medium">
                {new Date(sub.start_date).toLocaleDateString('sw-TZ')}
              </p>
            </div>
            <div>
              <p className="text-text-muted">End Date</p>
              <p className="text-text-primary font-medium">
                {new Date(sub.end_date).toLocaleDateString('sw-TZ')}
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <MoreVertical size={16} className="text-text-muted" />
          </button>

          <AnimatePresence>
            {showActions && (
              <motion.div
                className="absolute right-0 top-full mt-1 w-40 rounded-xl overflow-hidden z-10"
                style={{
                  background: 'rgba(10,10,15,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {sub.status !== 'ACTIVE' && sub.status !== 'TRIAL' && (
                  <button
                    onClick={() => {
                      onActivate(sub.id)
                      setShowActions(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-white/5 flex items-center gap-2"
                  >
                    <Check size={14} className="text-kili-green" />
                    Activate
                  </button>
                )}
                {(sub.status === 'ACTIVE' || sub.status === 'TRIAL') && (
                  <>
                    <button
                      onClick={() => {
                        onExtend(sub.id)
                        setShowActions(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-white/5 flex items-center gap-2"
                    >
                      <Calendar size={14} className="text-gold" />
                      Extend
                    </button>
                    <button
                      onClick={() => {
                        onCancel(sub.id)
                        setShowActions(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-white/5 flex items-center gap-2"
                    >
                      <X size={14} className="text-red-400" />
                      Cancel
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ── Payment Row ─────────────────────────────────────
function PaymentRow({ payment }: { payment: AdminPayment }) {
  const statusColors = {
    PENDING: 'text-gold bg-gold/10 border-gold/20',
    COMPLETED: 'text-kili-green bg-kili-green/10 border-kili-green/20',
    FAILED: 'text-red-400 bg-red-400/10 border-red-400/20',
    REFUNDED: 'text-text-muted bg-text-muted/10 border-text-muted/20',
  }

  return (
    <motion.div
      className="rounded-2xl p-4 border"
      style={{
        background: 'rgba(26,26,36,0.6)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-bold text-text-primary text-sm">
              {payment.subscription.user.username}
            </p>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                statusColors[payment.status]
              )}
            >
              {payment.status}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-text-muted">Amount</p>
              <p className="text-text-primary font-medium">
                {formatCurrency(payment.amount)}
              </p>
            </div>
            <div>
              <p className="text-text-muted">Plan</p>
              <p className="text-text-primary font-medium">
                {payment.subscription.plan.display_name}
              </p>
            </div>
            <div>
              <p className="text-text-muted">Date</p>
              <p className="text-text-primary font-medium">
                {timeAgo(payment.created_at)}
              </p>
            </div>
          </div>
          {payment.mpesa_transaction_code && (
            <div className="mt-2">
              <p className="text-[10px] text-text-muted">M-Pesa Code</p>
              <p className="text-xs text-text-primary font-mono">
                {payment.mpesa_transaction_code}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Admin Payments Page ───────────────────────
export default function AdminPaymentsPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'payments'>('overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Revenue stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-revenue-stats'],
    queryFn: adminPaymentsService.getRevenueStats,
    staleTime: 1000 * 60 * 5,
  })

  // Subscriptions
  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-subscriptions', statusFilter, search],
    queryFn: () => adminPaymentsService.getSubscriptions({
      status: statusFilter || undefined,
      search: search || undefined,
    }),
    staleTime: 1000 * 60,
  })

  // Payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['admin-payments', statusFilter, search],
    queryFn: () => adminPaymentsService.getPayments({
      status: statusFilter || undefined,
      search: search || undefined,
    }),
    staleTime: 1000 * 60,
  })

  // Actions
  const activateMut = useMutation({
    mutationFn: (data: { user_id: number; plan_name: string; billing_cycle: 'weekly' | 'monthly' }) =>
      adminPaymentsService.activateSubscription(data),
    onSuccess: () => {
      toast.success('Subscription activated successfully')
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      qc.invalidateQueries({ queryKey: ['admin-revenue-stats'] })
    },
    onError: (e) => toast.error('Failed to activate subscription'),
  })

  const cancelMut = useMutation({
    mutationFn: (id: number) => adminPaymentsService.cancelSubscription(id),
    onSuccess: () => {
      toast.success('Subscription cancelled')
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      qc.invalidateQueries({ queryKey: ['admin-revenue-stats'] })
    },
    onError: (e) => toast.error('Failed to cancel subscription'),
  })

  const extendMut = useMutation({
    mutationFn: ({ id, days }: { id: number; days: number }) =>
      adminPaymentsService.extendSubscription(id, days),
    onSuccess: () => {
      toast.success('Subscription extended by 30 days')
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] })
    },
    onError: (e) => toast.error('Failed to extend subscription'),
  })

  return (
    <div className="min-h-dvh bg-bg-base pt-safe pb-safe overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-black text-text-primary">
          💰 Payments & Subscriptions
        </h1>
        <p className="text-text-muted text-sm mt-0.5">
          Manage revenue, subscriptions, and payments
        </p>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 p-1 rounded-2xl"
          style={{ background: 'rgba(26,26,36,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {(['overview', 'subscriptions', 'payments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all capitalize',
                activeTab === tab
                  ? 'text-black'
                  : 'text-text-muted hover:text-text-primary'
              )}
              style={{
                background: activeTab === tab ? 'linear-gradient(135deg, #F5A623, #E8892A)' : 'transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="px-5 space-y-4 pb-10">
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i} className="h-32 rounded-3xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatsCard
                  icon={DollarSign}
                  label="Revenue This Month"
                  value={formatCurrency(stats?.total_this_month || 0)}
                  color="#F5A623"
                />
                <StatsCard
                  icon={Users}
                  label="Active Subscriptions"
                  value={stats?.active_subscriptions || 0}
                  color="#3B82F6"
                />
                <StatsCard
                  icon={CreditCard}
                  label="Total Subscriptions"
                  value={stats?.total_subscriptions || 0}
                  color="#10B981"
                />
                <StatsCard
                  icon={TrendingUp}
                  label="Trial Subscriptions"
                  value={stats?.trial_subscriptions || 0}
                  color="#8B5CF6"
                />
              </div>

              {/* Revenue by Plan */}
              <div className="rounded-3xl p-5"
                style={{ background: 'rgba(26,26,36,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <h3 className="font-bold text-text-primary mb-4">Revenue by Plan</h3>
                <div className="space-y-3">
                  {stats?.revenue_by_plan?.map((item) => (
                    <div key={item.plan_name} className="flex items-center justify-between">
                      <p className="text-sm text-text-secondary">{item.plan_name}</p>
                      <div className="text-right">
                        <p className="text-sm font-bold text-text-primary">
                          {formatCurrency(item.revenue)}
                        </p>
                        <p className="text-xs text-text-muted">{item.count} subs</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="px-5 space-y-4 pb-10">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-text-primary outline-none"
                style={{ background: 'rgba(26,26,36,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm text-text-primary outline-none"
              style={{ background: 'rgba(26,26,36,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          {/* Subscriptions List */}
          {subsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : subsData?.results?.length === 0 ? (
            <EmptyState
              icon="💳"
              title="Hakuna subscriptions"
              subtitle="Hakuna subscriptions zilizopatikana"
            />
          ) : (
            <div className="space-y-3">
              {subsData?.results?.map((sub) => (
                <SubscriptionRow
                  key={sub.id}
                  sub={sub}
                  onActivate={(id) => {
                    // In a real app, you'd show a modal to select plan and billing cycle
                    toast.info('Manual activation requires plan selection')
                  }}
                  onCancel={(id) => cancelMut.mutate(id)}
                  onExtend={(id) => extendMut.mutate({ id, days: 30 })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="px-5 space-y-4 pb-10">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search payment..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-text-primary outline-none"
                style={{ background: 'rgba(26,26,36,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm text-text-primary outline-none"
              style={{ background: 'rgba(26,26,36,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          {/* Payments List */}
          {paymentsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : paymentsData?.results?.length === 0 ? (
            <EmptyState
              icon="💰"
              title="Hakuna payments"
              subtitle="Hakuna payments zilizopatikana"
            />
          ) : (
            <div className="space-y-3">
              {paymentsData?.results?.map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
