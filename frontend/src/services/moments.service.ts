import api from '@/core/api/axios'
import { tokenManager } from '@/core/auth/TokenManager'

export interface MediaItem {
  id: number
  media_type: 'image' | 'video' | 'audio'
  url: string
  public_id: string
  duration?: number
  width?: number
  height?: number
  file_size?: number
  created_at: string
}

export interface Moment {
  id: number
  posted_by_username: string
  posted_by_avatar_url: string | null
  posted_by_role: string
  posted_by_verified: boolean
  media_items: MediaItem[]
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

  async createWithMetadata(payload: {
    media_items_data: Array<{
      media_type: 'image' | 'video' | 'audio'
      url: string
      public_id: string
      duration?: number
      width?: number
      height?: number
      file_size?: number
    }>
    caption?: string
    location?: string
  }): Promise<Moment> {
    // Verify token exists before making request
    const token = tokenManager.getAccessToken()
    if (!token) {
      console.error('[Moments] No access token available for POST /api/moments/')
      throw new Error('Authentication required. Please log in again.')
    }
    
    console.log('[Moments] POST /api/moments/ with token:', token.substring(0, 20) + '...')
    const { data } = await api.post<Moment>('/api/moments/', payload)
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
