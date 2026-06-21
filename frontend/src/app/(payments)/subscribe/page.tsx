'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, Star, Zap, Crown, Phone, Loader2, X } from 'lucide-react'
import {
  subscriptionsService,
  type SubscriptionPlan,
} from '@/services/subscriptions.service'
import { KiliButton } from '@/components/ui/KiliButton'
import { ConfettiBlast } from '@/components/ui/ConfettiBlast'
import { useAuthStore } from '@/stores/auth.store'
import { formatCurrency, parseApiError } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── M-Pesa Payment Modal ────────────────────────────
function MPesaModal({
  plan,
  billingCycle,
  onClose,
  onSuccess,
}: {
  plan: SubscriptionPlan
  billingCycle: 'weekly' | 'monthly'
  onClose: () => void
  onSuccess: () => void
}) {
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'input' | 'waiting' | 'success'>('input')
  const [checkoutId, setCheckoutId] = useState('')
  const [confetti, setConfetti] = useState(false)

  const amount =
    billingCycle === 'weekly'
      ? plan.price_weekly!
      : plan.price_monthly!

  const pushMut = useMutation({
    mutationFn: () =>
      subscriptionsService.initiateSTKPush(
        phone, plan.name, billingCycle, amount
      ),
    onSuccess: (data) => {
      if (data.success) {
        setCheckoutId(data.checkout_request_id)
        setStep('waiting')
        // Poll for confirmation every 3s
        const poll = setInterval(async () => {
          try {
            const result = await subscriptionsService.queryPayment(
              data.checkout_request_id
            )
            if (result.ResultCode === '0') {
              clearInterval(poll)
              setStep('success')
              setConfetti(true)
              // Activate subscription
              await subscriptionsService.activate(
                plan.name, billingCycle
              )
              setTimeout(onSuccess, 2000)
            } else if (result.ResultCode !== undefined &&
              result.ResultCode !== '1032') {
              clearInterval(poll)
              toast.error('Malipo imeshindwa. Jaribu tena.')
              setStep('input')
            }
          } catch {
            // keep polling
          }
        }, 3000)
        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(poll), 120000)
      } else {
        toast.error(data.message)
      }
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: '#1A1A24',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      >
        <ConfettiBlast trigger={confetti} />

        {/* Gold line */}
        <div
          className="h-1"
          style={{
            background: 'linear-gradient(90deg, transparent, #F5A623, transparent)',
          }}
        />

        <div className="p-6">
          {step === 'input' && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-text-primary">
                    Lipa na M-Pesa
                  </h2>
                  <p className="text-text-muted text-sm mt-0.5">
                    {plan.display_name} — {' '}
                    <span className="text-gold font-bold">
                      {formatCurrency(amount)} /{billingCycle === 'weekly' ? 'wiki' : 'mwezi'}
                    </span>
                  </p>
                </div>
                <button onClick={onClose}>
                  <X size={20} className="text-text-muted" />
                </button>
              </div>

              {/* Amount display */}
              <div
                className="rounded-2xl p-4 mb-5 text-center"
                style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)' }}
              >
                <p className="text-3xl font-black text-gold">
                  {formatCurrency(amount)}
                </p>
                <p className="text-text-muted text-sm mt-1">
                  {billingCycle === 'weekly' ? 'Kila Wiki' : 'Kila Mwezi'}
                </p>
              </div>

              {/* Phone input */}
              <div className="mb-4">
                <label className="text-sm font-medium text-text-secondary block mb-2">
                  Namba ya M-Pesa
                </label>
                <div
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(10,10,15,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Phone size={18} className="text-gold flex-shrink-0" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0712 345 678"
                    className="flex-1 bg-transparent text-text-primary text-base outline-none"
                    inputMode="tel"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1.5">
                  Tumia namba yako ya Safaricom
                </p>
              </div>

              <KiliButton
                fullWidth
                size="lg"
                loading={pushMut.isPending}
                disabled={phone.length < 9}
                onClick={() => pushMut.mutate()}
              >
                Lipa TZS {amount.toLocaleString()}
              </KiliButton>
            </>
          )}

          {step === 'waiting' && (
            <div className="text-center py-6">
              <motion.div
                className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
                style={{ background: 'rgba(245,166,35,0.12)', border: '2px solid rgba(245,166,35,0.4)' }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Phone size={36} className="text-gold" />
              </motion.div>
              <h3 className="text-xl font-black text-text-primary mb-2">
                Angalia Simu Yako
              </h3>
              <p className="text-text-muted text-sm leading-relaxed mb-4">
                Tumekutumia ujumbe wa M-Pesa kwenye{' '}
                <span className="text-gold font-bold">{phone}</span>.
                Thibitisha malipo ili kuendelea.
              </p>
              <div className="flex items-center justify-center gap-2 text-text-muted text-xs">
                <Loader2 size={14} className="animate-spin" />
                Inasubiri uthibitisho...
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-6">
              <motion.div
                className="text-7xl mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                🎉
              </motion.div>
              <h3 className="text-2xl font-black text-text-primary mb-2">
                Umefanikiwa!
              </h3>
              <p className="text-text-muted text-sm">
                {plan.display_name} umewashwa!
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Plan Card ───────────────────────────────────────
function PlanCard({
  plan,
  billingCycle,
  currentPlanName,
  onSelect,
  onTrial,
}: {
  plan: SubscriptionPlan
  billingCycle: 'weekly' | 'monthly'
  currentPlanName?: string
  onSelect: (plan: SubscriptionPlan) => void
  onTrial: (plan: SubscriptionPlan) => void
}) {
  const isCurrent = plan.name === currentPlanName
  const isFree = plan.name === 'FREE'
  const price =
    billingCycle === 'weekly' ? plan.price_weekly : plan.price_monthly

  const FEATURES = [
    {
      key: 'max_experiences',
      label: `Uzoefu ${plan.max_experiences === 9999 ? 'Unlimited' : plan.max_experiences}`,
      show: true,
    },
    { key: 'has_analytics', label: 'Analytics', show: plan.has_analytics },
    {
      key: 'has_featured_placement',
      label: 'Featured Placement',
      show: plan.has_featured_placement,
    },
    {
      key: 'has_verified_badge',
      label: 'Verified Badge ✓',
      show: plan.has_verified_badge,
    },
    {
      key: 'has_booking_system',
      label: 'Booking System',
      show: plan.has_booking_system,
    },
    {
      key: 'has_ai_unlimited',
      label: 'AI Unlimited',
      show: plan.has_ai_unlimited,
    },
    {
      key: 'has_offline_mode',
      label: 'Offline Mode',
      show: plan.has_offline_mode,
    },
    {
      key: 'has_predictions_all',
      label: 'Predictions Zote',
      show: plan.has_predictions_all,
    },
  ].filter((f) => f.show)

  const isPopular = plan.is_popular

  return (
    <motion.div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: isPopular
          ? 'linear-gradient(135deg, rgba(245,166,35,0.08), rgba(10,10,15,1))'
          : 'rgba(26,26,36,0.8)',
        border: isPopular
          ? '2px solid rgba(245,166,35,0.5)'
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isPopular ? '0 0 30px rgba(245,166,35,0.15)' : 'none',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
    >
      {/* Popular badge */}
      {isPopular && (
        <div
          className="absolute top-0 right-6 px-3 py-1 text-xs font-black text-black rounded-b-xl"
          style={{ background: 'linear-gradient(135deg, #F5A623, #E8892A)' }}
        >
          ⭐ POPULAR
        </div>
      )}

      {/* Current badge */}
      {isCurrent && (
        <div
          className="absolute top-0 left-6 px-3 py-1 text-xs font-bold text-kili-green rounded-b-xl"
          style={{
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)',
          }}
        >
          ✓ Current
        </div>
      )}

      <div className="p-6 pt-8">
        {/* Plan name */}
        <h3 className="text-2xl font-black text-text-primary mb-1">
          {plan.display_name}
        </h3>
        <p className="text-text-muted text-sm mb-4">{plan.description}</p>

        {/* Price */}
        <div className="mb-5">
          {isFree ? (
            <p className="text-3xl font-black text-text-primary">
              BURE
            </p>
          ) : price ? (
            <>
              <p className="text-3xl font-black text-gold">
                TZS {price.toLocaleString()}
              </p>
              <p className="text-text-muted text-sm">
                /{billingCycle === 'weekly' ? 'wiki' : 'mwezi'}
                {plan.savings_percent > 0 && billingCycle === 'monthly' && (
                  <span className="ml-2 text-kili-green font-bold text-xs">
                    Hifadhi {plan.savings_percent}%
                  </span>
                )}
              </p>
            </>
          ) : (
            <p className="text-text-muted text-sm">
              Hakuna bei kwa mzunguko huu
            </p>
          )}
        </div>

        {/* Features */}
        <div className="space-y-2 mb-6">
          {FEATURES.map((f) => (
            <div key={f.key} className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isPopular
                    ? 'rgba(245,166,35,0.2)'
                    : 'rgba(16,185,129,0.15)',
                }}
              >
                <Check
                  size={11}
                  className={isPopular ? 'text-gold' : 'text-kili-green'}
                />
              </div>
              <span className="text-sm text-text-secondary">{f.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.15)' }}
            >
              <Check size={11} className="text-kili-green" />
            </div>
            <span className="text-sm text-text-secondary">
              Mwonekano {plan.visibility_multiplier}x
            </span>
          </div>
        </div>

        {/* CTA */}
        {isFree ? (
          <KiliButton
            variant="ghost"
            fullWidth
            disabled
          >
            Unaendelea bure
          </KiliButton>
        ) : isCurrent ? (
          <KiliButton variant="outline" fullWidth disabled>
            ✓ Imewashwa
          </KiliButton>
        ) : (
          <div className="space-y-2">
            {price && (
              <KiliButton
                fullWidth
                size="lg"
                onClick={() => onSelect(plan)}
              >
                Lipa TZS {price.toLocaleString()}
              </KiliButton>
            )}
            {plan.trial_days > 0 && (
              <KiliButton
                variant="ghost"
                fullWidth
                onClick={() => onTrial(plan)}
              >
                Jaribu Bure Siku {plan.trial_days}
              </KiliButton>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main Subscribe Page ─────────────────────────────
export default function SubscribePage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly'>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: subscriptionsService.getPlans,
    staleTime: 1000 * 60 * 10,
  })

  const { data: currentSub } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionsService.getMySubscription,
    staleTime: 1000 * 60 * 5,
  })

  const trialMut = useMutation({
    mutationFn: (planName: string) =>
      subscriptionsService.startTrial(planName),
    onSuccess: () => {
      toast.success('Trial imeanza! Furahia siku 14 za bure! 🎉')
      setShowConfetti(true)
      qc.invalidateQueries({ queryKey: ['my-subscription'] })
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  const visiblePlans = plans.filter((p) => {
    if (user?.role === 'TOURIST') {
      return ['FREE', 'TOURIST_PREMIUM', 'SPORTS_PREMIUM'].includes(p.name)
    }
    return true
  })

  return (
    <div className="min-h-dvh bg-bg-base pt-safe pb-safe">
      <ConfettiBlast trigger={showConfetti} />

      {/* Header */}
      <div className="px-5 pt-8 pb-6 text-center">
        <motion.h1
          className="text-3xl font-black text-text-primary mb-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Chagua Mpango Wako{' '}
          <span className="text-gradient-gold">✨</span>
        </motion.h1>
        <p className="text-text-muted text-sm">
          Panda kiwango chako na Kilicare+
        </p>

        {/* Billing toggle */}
        <div
          className="inline-flex items-center mt-5 rounded-2xl p-1"
          style={{ background: 'rgba(26,26,36,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {(['monthly', 'weekly'] as const).map((cycle) => (
            <motion.button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background:
                  billingCycle === cycle
                    ? 'linear-gradient(135deg, #F5A623, #E8892A)'
                    : 'transparent',
                color: billingCycle === cycle ? '#000' : '#8B8BA7',
              }}
            >
              {cycle === 'monthly' ? '📅 Mwezi' : '📆 Wiki'}
              {cycle === 'monthly' && (
                <span className="ml-1 text-[10px] opacity-80">
                  Nafuu zaidi
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Plans grid */}
      <div className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto pb-10">
        {visiblePlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            currentPlanName={currentSub?.plan?.name}
            onSelect={setSelectedPlan}
            onTrial={(p) => trialMut.mutate(p.name)}
          />
        ))}
      </div>

      {/* M-Pesa Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <MPesaModal
            plan={selectedPlan}
            billingCycle={billingCycle}
            onClose={() => setSelectedPlan(null)}
            onSuccess={() => {
              setSelectedPlan(null)
              setShowConfetti(true)
              qc.invalidateQueries({ queryKey: ['my-subscription'] })
              toast.success(`${selectedPlan.display_name} umewashwa! 🎉`)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}