import api from '@/core/api/axios'

export interface Booking {
  id: number
  tourist_username: string
  tourist_avatar: string | null
  guide_username: string
  guide_avatar: string | null
  guide_trust: number
  experience_title: string | null
  title: string
  description: string | null
  scheduled_date: string
  scheduled_time: string
  duration_hours: number
  location: string
  participants: number
  amount: number
  platform_fee: number
  guide_payout: number
  currency: string
  status: string
  payment_method: string
  mpesa_code: string | null
  escrow_released_at: string | null
  special_requests: string | null
  has_review: boolean
  created_at: string
  updated_at: string
}

export const bookingsService = {
  async create(data: {
    guide_id: number
    experience_id?: number
    title?: string
    description?: string
    scheduled_date: string
    scheduled_time: string
    duration_hours?: number
    location: string
    participants?: number
    amount: number
    special_requests?: string
  }): Promise<Booking> {
    const { data: res } = await api.post<Booking>('/api/bookings/', data)
    return res
  },

  async getMyBookings(): Promise<Booking[]> {
    const { data } = await api.get<Booking[]>('/api/bookings/my-bookings/')
    return data
  },

  async getGuideBookings(): Promise<Booking[]> {
    const { data } = await api.get<Booking[]>('/api/bookings/guide-bookings/')
    return data
  },

  async getOne(id: number): Promise<Booking> {
    const { data } = await api.get<Booking>(`/api/bookings/${id}/`)
    return data
  },

  async action(
    id: number,
    action: 'confirm' | 'start' | 'complete' | 'cancel' | 'dispute',
    data?: Record<string, string>
  ) {
    const { data: res } = await api.put(
      `/api/bookings/${id}/${action}/`,
      data || {}
    )
    return res
  },

  async addReview(id: number, rating: number, review: string) {
    const { data } = await api.post(`/api/bookings/${id}/review/`, {
      rating, review,
    })
    return data
  },
}