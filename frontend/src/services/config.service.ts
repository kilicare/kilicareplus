import { apiClient } from '@/lib/apiClient'
import { ENDPOINTS } from '@/lib/endpoints'

export const ConfigService = {
  getLandingPageConfig: () => {
    return apiClient.get(ENDPOINTS.LANDING_PAGE_CONFIG)
  },
}
