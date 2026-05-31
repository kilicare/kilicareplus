import api from '@/core/api/axios'

export interface Tip {
  id: number
  title: string
  description: string
  category: string
  sub_topics: string[]
  latitude: number | null
  longitude: number | null
  location_address: string | null
  creator_username: string
  creator_role: string
  creator_avatar: string | null
  trust_score: number
  upvotes: number
  is_verified: boolean
  is_upvoted: boolean
  created_at: string
}

export const tipsService = {
  async getAll(category?: string): Promise<Tip[]> {
    const params = category ? { category } : {}
    const { data } = await api.get<Tip[]>('/api/tips/', { params })
    return data
  },

  async create(data: {
    title: string
    description: string
    category: string
    sub_topics?: string[]
    latitude?: number
    longitude?: number
    location_address?: string
  }): Promise<Tip> {
    const { data: res } = await api.post<Tip>('/api/tips/create/', data)
    return res
  },

  async upvote(id: number) {
    const { data } = await api.post(`/api/tips/${id}/upvote/`)
    return data
  },

  async getNearby(lat: number, lng: number, radius = 10): Promise<Tip[]> {
    const { data } = await api.get<Tip[]>('/api/tips/nearby/', {
      params: { lat, lng, radius },
    })
    return data
  },

  async getTrending(): Promise<Tip[]> {
    const { data } = await api.get<Tip[]>('/api/tips/trending/')
    return data
  },

  async getMyTips(): Promise<Tip[]> {
    const { data } = await api.get<Tip[]>('/api/tips/my-tips/')
    return data
  },
}