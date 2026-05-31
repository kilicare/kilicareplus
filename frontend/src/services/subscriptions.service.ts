import api from '@/core/api/axios'

export interface SubscriptionPlan {
  id: number
  name: string
  display_name: string
  description: string
  price_weekly: number | null
  price_monthly: number | null
  max_experiences: number
  max_showcase_items: number
  has_verified_badge: boolean
  has_booking_system: boolean
  has_analytics: boolean
  has_featured_placement: boolean
  visibility_multiplier: number
  has_ai_unlimited: boolean
  has_offline_mode: boolean
  has_predictions_all: boolean
  has_whatsapp_alerts: boolean
  trial_days: number
  is_popular: boolean
  savings_percent: number
  sort_order: number
}

export interface UserSubscription {
  id: number
  plan: SubscriptionPlan
  status: string
  billing_cycle: string
  start_date: string
  end_date: string
  trial_end_date: string | null
  auto_renew: boolean
  days_remaining: number
  is_active: boolean
  features: Record<string, boolean | number>
}

export const subscriptionsService = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    const { data } = await api.get<SubscriptionPlan[]>(
      '/api/subscriptions/plans/'
    )
    return data
  },

  async getMySubscription(): Promise<UserSubscription | null> {
    const { data } = await api.get('/api/subscriptions/my-subscription/')
    return data
  },

  async startTrial(planName: string) {
    const { data } = await api.post(
      '/api/subscriptions/start-trial/',
      { plan_name: planName }
    )
    return data
  },

  async activate(
    planName: string,
    billingCycle: string,
    mpesaCode?: string
  ) {
    const { data } = await api.post('/api/subscriptions/activate/', {
      plan_name: planName,
      billing_cycle: billingCycle,
      mpesa_transaction_code: mpesaCode,
    })
    return data
  },

  async cancel() {
    const { data } = await api.post('/api/subscriptions/cancel/')
    return data
  },

  async initiateSTKPush(
    phone: string,
    planName: string,
    billingCycle: string,
    amount: number
  ) {
    const { data } = await api.post('/api/payments/mpesa/stk-push/', {
      phone,
      plan_name: planName,
      billing_cycle: billingCycle,
      amount,
    })
    return data
  },

  async queryPayment(checkoutRequestId: string) {
    const { data } = await api.post('/api/payments/mpesa/query/', {
      checkout_request_id: checkoutRequestId,
    })
    return data
  },
}