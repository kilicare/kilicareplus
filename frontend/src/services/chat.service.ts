import api from '@/core/api/axios'

export interface ChatContact {
  room_name: string
  other_user: {
    id: number
    username: string
    first_name: string
    role: string
    is_verified: boolean
    avatar: string | null
  }
  last_message: {
    content: string
    timestamp: string
    is_read: boolean
    sender_id: number
  } | null
  unread_count: number
}

export interface ChatMessage {
  id: number
  content: string
  sender_id: number
  sender_username: string
  is_delivered: boolean
  is_read: boolean
  is_deleted: boolean
  reply_to: number | null
  timestamp: string
  attachment: string | null
  attachment_type: string | null
}

export const chatService = {
  async getContacts(): Promise<ChatContact[]> {
    const { data } = await api.get<ChatContact[]>('/api/chat/contacts/')
    return data
  },

  async getMessages(roomName: string): Promise<ChatMessage[]> {
    const { data } = await api.get<ChatMessage[]>(
      `/api/chat/${roomName}/`
    )
    return data
  },

  async startDM(userId: number): Promise<{ room_name: string }> {
    const { data } = await api.post('/api/chat/start-dm/', {
      user_id: userId,
    })
    return data
  },

  async getRoomByName(roomName: string): Promise<ChatContact | null> {
    try {
      const { data } = await api.get<ChatContact>(`/api/chat/room/${roomName}/`)
      return data
    } catch (error) {
      console.error('[ChatService] Error getting room by name:', error)
      return null
    }
  },

  async uploadAttachment(file: File): Promise<{ url: string; path: string; type: string }> {
    const formData = new FormData()
    formData.append('file', file)
    
    const { data } = await api.post<{ url: string; path: string; type: string }>(
      '/api/chat/upload-attachment/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return data
  },
}