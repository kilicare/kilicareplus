import api from '@/core/api/axios'

export interface KiliNotification {
  id: number
  notification_type: string
  title: string
  body: string
  data: Record<string, unknown>
  is_read: boolean
  sender: {
    username: string | null
    avatar: string | null
  } | null
  created_at: string
}

export interface UnreadCountResponse {
  count: number
}

export const notificationsService = {
  /**
   * Fetch all notifications for the current user
   */
  async getAll(): Promise<KiliNotification[]> {
    try {
      const { data } = await api.get<KiliNotification[]>('/api/notifications/')
      return data
    } catch (error) {
      console.error('[NotificationsService] Failed to fetch notifications:', error)
      throw error
    }
  },

  /**
   * Mark a specific notification as read
   */
  async markRead(id: number): Promise<{ success: boolean }> {
    try {
      const { data } = await api.put<{ success: boolean }>(`/api/notifications/${id}/read/`)
      return data
    } catch (error) {
      console.error('[NotificationsService] Failed to mark notification as read:', error)
      throw error
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllRead(): Promise<{ success: boolean }> {
    try {
      const { data } = await api.put<{ success: boolean }>('/api/notifications/read-all/')
      return data
    } catch (error) {
      console.error('[NotificationsService] Failed to mark all notifications as read:', error)
      throw error
    }
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { data } = await api.get<UnreadCountResponse>('/api/notifications/unread-count/')
      return data.count
    } catch (error) {
      console.error('[NotificationsService] Failed to get unread count:', error)
      throw error
    }
  },

  /**
   * Sync missed notifications (for WebSocket reconnection)
   */
  async sync(lastId?: number, since?: string): Promise<KiliNotification[]> {
    try {
      const params: Record<string, string> = {}
      if (lastId) params.last_id = lastId.toString()
      if (since) params.since = since
      
      const { data } = await api.get<KiliNotification[]>('/api/notifications/sync/', { params })
      return data
    } catch (error) {
      console.error('[NotificationsService] Failed to sync notifications:', error)
      throw error
    }
  },
}
