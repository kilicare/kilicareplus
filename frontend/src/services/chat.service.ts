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
}