import api from '@/core/api/axios'

export interface Moment {
  id: number
  posted_by_username: string
  posted_by_avatar_url: string | null
  posted_by_role: string
  posted_by_verified: boolean
  media_url: string | null
  thumbnail_url: string | null
  audio_url: string | null
  media_type: 'image' | 'video'
  caption: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  views: number
  shares: number
  trending_score: number
  like_count: number
  is_liked: boolean
  is_saved: boolean
  trust_score: number
  visibility: string
  created_at: string
}

export interface FeedResponse {
  results: Moment[]
  count: number
  page: number
  has_next: boolean
}

export const momentsService = {
  async getFeed(page = 1, sessionId?: string): Promise<FeedResponse> {
    const url = sessionId 
      ? `/api/moments/feed/?page=${page}&session_id=${sessionId}`
      : `/api/moments/feed/?page=${page}`
    const { data } = await api.get<FeedResponse>(url)
    return data
  },

  async getTrending(): Promise<Moment[]> {
    const { data } = await api.get<Moment[]>('/api/moments/trending/')
    return data
  },

  async create(formData: FormData): Promise<Moment> {
    const { data } = await api.post<Moment>('/api/moments/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async getOne(id: number): Promise<Moment> {
    const { data } = await api.get<Moment>(`/api/moments/${id}/`)
    return data
  },

  async like(id: number) {
    const { data } = await api.post(`/api/moments/${id}/like/`)
    return data
  },

  async save(id: number) {
    const { data } = await api.post(`/api/moments/${id}/save/`)
    return data
  },

  async getMyMoments(): Promise<Moment[]> {
    const { data } = await api.get<Moment[]>('/api/moments/my-moments/')
    return data
  },

  async getSaved(): Promise<Moment[]> {
    const { data } = await api.get<Moment[]>('/api/moments/saved/')
    return data
  },

  async delete(id: number) {
    await api.delete(`/api/moments/${id}/delete/`)
  },
}
