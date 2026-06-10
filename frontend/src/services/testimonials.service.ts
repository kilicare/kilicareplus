import { apiClient } from '@/lib/apiClient'
import { ENDPOINTS } from '@/lib/endpoints'

export const TestimonialsService = {
  getPublic: () => {
    return apiClient.get(ENDPOINTS.PUBLIC_TESTIMONIALS)
  },
}
