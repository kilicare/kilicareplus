import api from '@/core/api/axios'

export interface ExperienceMedia {
  id: number
  file: string
  file_url: string | null
  is_primary: boolean
  order: number
}

export interface Experience {
  id: number
  guide_id: number
  guide_username: string
  guide_avatar: string | null
  guide_trust: number
  guide_verified: boolean
  title: string
  description: string
  location: string
  latitude: number | null
  longitude: number | null
  category: string
  price_range: string | null
  price_min: number | null
  price_max: number | null
  today_moment_active: boolean
  is_active: boolean
  subscription_required: string
  views: number
  media: ExperienceMedia[]
  primary_image: ExperienceMedia | null
  created_at: string
}

export const experiencesService = {
  async getAll(category?: string): Promise<Experience[]> {
    const params = category ? { category } : {}
    const { data } = await api.get<Experience[]>('/api/experiences/', { params })
    return data
  },

  async getToday(): Promise<Experience[]> {
    const { data } = await api.get<Experience[]>('/api/experiences/today/')
    return data
  },

  async create(formData: FormData): Promise<Experience> {
    const { data } = await api.post<Experience>(
      '/api/experiences/create/', formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },

  async getOne(id: number): Promise<Experience> {
    const { data } = await api.get<Experience>(`/api/experiences/${id}/`)
    return data
  },

  async update(id: number, formData: FormData): Promise<Experience> {
    const { data } = await api.put<Experience>(
      `/api/experiences/${id}/`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },

  async delete(id: number) {
    await api.delete(`/api/experiences/${id}/`)
  },

  async toggleToday(id: number) {
    const { data } = await api.post(`/api/experiences/${id}/toggle-today/`)
    return data
  },

  async getMyExperiences(): Promise<Experience[]> {
    const { data } = await api.get<Experience[]>('/api/experiences/my-experiences/')
    return data
  },
}