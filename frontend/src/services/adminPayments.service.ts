import api from '@/core/api/axios'

export interface AdminSubscription {
  id: number
  user: {
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
    role: string
  }
  plan: {
    id: number
    name: string
    display_name: string
    price_weekly: number | null
    price_monthly: number | null
  }
  status: 'ACTIVE' | 'TRIAL' | 'CANCELLED' | 'EXPIRED'
  billing_cycle: 'weekly' | 'monthly' | 'free'
  start_date: string
  end_date: string
  trial_end_date: string | null
  auto_renew: boolean
  mpesa_subscription_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  cancelled_at: string | null
  is_currently_active: boolean
}

export interface AdminPayment {
  id: number
  subscription: {
    id: number
    user: {
      username: string
      email: string
    }
    plan: {
      display_name: string
    }
  }
  amount: number
  currency: string
  mpesa_transaction_code: string | null
  mpesa_checkout_request_id: string | null
  stripe_payment_intent_id: string | null
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  paid_at: string | null
  created_at: string
}

export interface AdminRevenueStats {
  total_this_month: number
  subscription_revenue_this_month: number
  booking_fees_this_month: number
  active_subscriptions: number
  total_subscriptions: number
  trial_subscriptions: number
  cancelled_subscriptions: number
  revenue_by_plan: {
    plan_name: string
    revenue: number
    count: number
  }[]
  monthly_revenue: {
    month: string
    revenue: number
  }[]
}

export const adminPaymentsService = {
  // Get all subscriptions with filtering
  async getSubscriptions(params?: {
    status?: string
    billing_cycle?: string
    plan?: string
    search?: string
    page?: number
  }): Promise<{ results: AdminSubscription[]; count: number; next: string | null; previous: string | null }> {
    const { data } = await api.get('/api/admin/subscriptions/', { params })
    return data
  },

  // Get subscription details
  async getSubscription(id: number): Promise<AdminSubscription> {
    const { data } = await api.get(`/api/admin/subscriptions/${id}/`)
    return data
  },

  // Manual subscription activation
  async activateSubscription(data: {
    user_id: number
    plan_name: string
    billing_cycle: 'weekly' | 'monthly'
  }): Promise<AdminSubscription> {
    const response = await api.post('/api/admin/subscriptions/activate/', data)
    return response.data
  },

  // Cancel subscription
  async cancelSubscription(id: number): Promise<void> {
    await api.post(`/api/admin/subscriptions/${id}/cancel/`)
  },

  // Extend subscription
  async extendSubscription(id: number, days: number): Promise<AdminSubscription> {
    const { data } = await api.post(`/api/admin/subscriptions/${id}/extend/`, { days })
    return data
  },

  // Get payment history
  async getPayments(params?: {
    status?: string
    subscription_id?: number
    search?: string
    page?: number
  }): Promise<{ results: AdminPayment[]; count: number; next: string | null; previous: string | null }> {
    const { data } = await api.get('/api/admin/payments/', { params })
    return data
  },

  // Get payment details
  async getPayment(id: number): Promise<AdminPayment> {
    const { data } = await api.get(`/api/admin/payments/${id}/`)
    return data
  },

  // Refund payment
  async refundPayment(id: number, reason: string): Promise<AdminPayment> {
    const { data } = await api.post(`/api/admin/payments/${id}/refund/`, { reason })
    return data
  },

  // Get revenue stats
  async getRevenueStats(): Promise<AdminRevenueStats> {
    const { data } = await api.get('/api/admin/payments/revenue-stats/')
    return data
  },

  // Get subscription plans
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getPlans(): Promise<any[]> {
    const { data } = await api.get('/api/subscriptions/plans/')
    return data
  },

  // Update plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updatePlan(id: number, planData: any): Promise<any> {
    const { data } = await api.put(`/api/admin/subscriptions/plans/${id}/`, planData)
    return data
  },

  // Create plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createPlan(planData: any): Promise<any> {
    const { data } = await api.post('/api/admin/subscriptions/plans/', planData)
    return data
  },

  // Delete plan
  async deletePlan(id: number): Promise<void> {
    await api.delete(`/api/admin/subscriptions/plans/${id}/`)
  },
}
