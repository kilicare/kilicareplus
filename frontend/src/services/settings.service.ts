import axios from '@/core/api/axios'

export interface UserSettings {
  id?: number
  // Notification Settings
  email_notifications: boolean
  push_notifications: boolean
  sms_notifications: boolean
  // Privacy Settings
  profile_visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'
  show_location: boolean
  allow_follow_requests: boolean
  // App Settings
  language: string
  theme: 'dark' | 'light' | 'auto'
  // Feature Toggles
  enable_ai_chat: boolean
  enable_predictions: boolean
  enable_sos: boolean
  enable_showcase: boolean
  enable_moments: boolean
  // Content Preferences
  content_filter: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  // Data & Storage
  auto_download_media: boolean
  low_data_mode: boolean
  // Timestamps
  created_at?: string
  updated_at?: string
}

class SettingsService {
  private readonly baseUrl = '/api/settings'

  async getMySettings(): Promise<UserSettings> {
    const response = await axios.get(`${this.baseUrl}/my_settings/`)
    return response.data
  }

  async updateSettings(data: Partial<UserSettings>): Promise<UserSettings> {
    const response = await axios.patch(`${this.baseUrl}/update_settings/`, data)
    return response.data
  }

  async resetDefaults(): Promise<UserSettings> {
    const response = await axios.post(`${this.baseUrl}/reset_defaults/`)
    return response.data
  }
}

export const settingsService = new SettingsService()
