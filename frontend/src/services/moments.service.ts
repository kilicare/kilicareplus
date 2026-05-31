import api from '@/core/api/axios'

export interface Moment {
  id: number
  posted_by_username: string
  posted_by_avatar: string | null
  posted_by_role: string
  posted_by_verified: boolean
  media: string
  media_url: string | null
  thumbnail_url: string | null
  audio: string | null
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
  comment_count: number
  is_liked: boolean
  is_saved: boolean
  trust_score: number
  visibility: string
  created_at: string
}

export interface Comment {
  id: number
  username: string
  avatar_url: string | null
  text: string
  created_at: string
}

export interface FeedResponse {
  results: Moment[]
  count: number
  page: number
  has_next: boolean
}

export const momentsService = {
  async getFeed(page = 1): Promise<FeedResponse> {
    const { data } = await api.get<FeedResponse>(
      `/api/moments/feed/?page=${page}`
    )
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

  async comment(id: number, text: string): Promise<Comment> {
    const { data } = await api.post<Comment>(`/api/moments/${id}/comment/`, { text })
    return data
  },

  async getComments(id: number): Promise<Comment[]> {
    const { data } = await api.get<Comment[]>(`/api/moments/${id}/comments/`)
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