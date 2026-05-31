import api from '@/core/api/axios'

export interface ShowcaseMedia {
  id: number
  file: string
  file_url: string | null
  is_primary: boolean
  order: number
}

export interface ShowcaseItem {
  id: number
  owner_username: string
  title: string
  description: string
  price: number
  currency: string
  is_negotiable: boolean
  stock_count: number | null
  category: string
  is_available: boolean
  views: number
  media: ShowcaseMedia[]
  primary_image: ShowcaseMedia | null
  created_at: string
}

export interface VirtualShowcase {
  id: number
  owner_username: string
  owner_avatar: string | null
  owner_verified: boolean
  owner_trust: number
  title: string
  description: string | null
  banner_url: string | null
  theme_color: string
  is_active: boolean
  total_views: number
  items: ShowcaseItem[]
  item_count: number
  created_at: string
}

export interface ShowcaseOrder {
  id: number
  item_title: string
  buyer_username: string
  seller_username: string
  quantity: number
  unit_price: number
  total_amount: number
  platform_fee: number
  seller_payout: number
  status: string
  escrow_held: boolean
  escrow_released_at: string | null
  delivery_notes: string | null
  mpesa_transaction_code: string | null
  dispute_reason: string | null
  created_at: string
  updated_at: string
}

export const showcaseService = {
  async getAll(): Promise<VirtualShowcase[]> {
    const { data } = await api.get<VirtualShowcase[]>('/api/showcase/')
    return data
  },

  async getByUsername(username: string): Promise<VirtualShowcase> {
    const { data } = await api.get<VirtualShowcase>(`/api/showcase/${username}/`)
    return data
  },

  async getMyShowcase(): Promise<VirtualShowcase> {
    const { data } = await api.get<VirtualShowcase>('/api/showcase/my-showcase/')
    return data
  },

  async createShowcase(formData: FormData): Promise<VirtualShowcase> {
    const { data } = await api.post<VirtualShowcase>(
      '/api/showcase/my-showcase/', formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },

  async updateShowcase(formData: FormData): Promise<VirtualShowcase> {
    const { data } = await api.put<VirtualShowcase>(
      '/api/showcase/my-showcase/', formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },

  async addItem(formData: FormData): Promise<ShowcaseItem> {
    const { data } = await api.post<ShowcaseItem>(
      '/api/showcase/my-showcase/items/', formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },

  async updateItem(itemId: number, formData: FormData): Promise<ShowcaseItem> {
    const { data } = await api.put<ShowcaseItem>(
      `/api/showcase/my-showcase/items/${itemId}/`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },

  async deleteItem(itemId: number) {
    await api.delete(`/api/showcase/my-showcase/items/${itemId}/`)
  },

  async createOrder(itemId: number, quantity: number): Promise<ShowcaseOrder> {
    const { data } = await api.post<ShowcaseOrder>(
      '/api/showcase/orders/create/',
      { item_id: itemId, quantity }
    )
    return data
  },

  async orderAction(
    orderId: number,
    action: 'complete' | 'dispute' | 'cancel' | 'delivered',
    data?: Record<string, string>
  ) {
    const { data: res } = await api.put(
      `/api/showcase/orders/${orderId}/${action}/`,
      data || {}
    )
    return res
  },

  async getMyOrders(): Promise<ShowcaseOrder[]> {
    const { data } = await api.get<ShowcaseOrder[]>(
      '/api/showcase/orders/my-orders/'
    )
    return data
  },

  async getMySales(): Promise<ShowcaseOrder[]> {
    const { data } = await api.get<ShowcaseOrder[]>(
      '/api/showcase/orders/my-sales/'
    )
    return data
  },
}