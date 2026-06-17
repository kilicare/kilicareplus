import { create } from 'zustand'
import { notificationsSocket } from '@/core/websocket/notificationsWs'
import { notificationsService, type KiliNotification } from '@/services/notifications.service'

interface NotificationState {
  notifications: KiliNotification[]
  unreadCount: number
  isConnected: boolean
  isLoading: boolean
  queue: KiliNotification[]
  
  // Actions
  setNotifications: (notifications: KiliNotification[]) => void
  addNotification: (notification: KiliNotification) => void
  setUnreadCount: (count: number) => void
  incrementUnreadCount: () => void
  markAsRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  syncNotifications: () => Promise<void>
  connect: () => void
  disconnect: () => void
  processQueue: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  isLoading: false,
  queue: [],

  setNotifications: (notifications) => set({ notifications }),

  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
  })),

  setUnreadCount: (count) => set({ unreadCount: count }),

  incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

  markAsRead: async (id) => {
    try {
      await notificationsService.markRead(id)
      set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    } catch (error) {
      console.error('[NotificationStore] Failed to mark as read:', error)
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsService.markAllRead()
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0,
      }))
    } catch (error) {
      console.error('[NotificationStore] Failed to mark all as read:', error)
    }
  },

  syncNotifications: async () => {
    set({ isLoading: true })
    try {
      const notifications = await notificationsService.getAll()
      set({ notifications, isLoading: false })
    } catch (error) {
      console.error('[NotificationStore] Failed to sync notifications:', error)
      set({ isLoading: false })
    }
  },

  connect: () => {
    notificationsSocket.connect()
    set({ isConnected: true })

    const off = notificationsSocket.on((data) => {
      if (data.type === 'notification') {
        const notification = data as unknown as KiliNotification
        if (!notification.is_read) {
          get().incrementUnreadCount()
        }
        get().addNotification(notification)
      } else if (data.type === 'unread_count') {
        get().setUnreadCount(data.count as number)
      } else if (data.type === 'all_read') {
        get().setUnreadCount(0)
      } else if (data.type === 'gamification_update') {
        // Handle gamification updates
        console.log('[NotificationStore] Gamification update:', data)
      }
    })

    // Store cleanup function
    set({ _cleanup: off } as any)
  },

  disconnect: () => {
    notificationsSocket.disconnect()
    set({ isConnected: false })
    // Cleanup event listener if exists
    const state = get() as any
    if (state._cleanup) {
      state._cleanup()
    }
  },

  processQueue: () => {
    const { queue, notifications } = get()
    if (queue.length > 0) {
      set({
        notifications: [...queue, ...notifications],
        queue: [],
      })
    }
  },
}))
