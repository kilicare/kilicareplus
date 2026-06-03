import axios from 'axios'
import api from '@/core/api/axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const getAccessToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('kili_access_token')
}

const getRefreshToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('kili_refresh_token')
}

const setAccessToken = (token: string) => {
  if (typeof window === 'undefined') return
  localStorage.setItem('kili_access_token', token)
}

const clearTokens = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('kili_access_token')
  localStorage.removeItem('kili_refresh_token')
}

const logoutUser = () => {
  clearTokens()
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const { data } = await axios.post(
      `${API_URL}/auth/refresh/`,
      { refresh: refreshToken },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    )

    if (data?.access) {
      setAccessToken(data.access)
      return data.access
    }

    return null
  } catch {
    return null
  }
}

export interface AIThread {
  id: number
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface AIMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export const aiService = {
  async streamChat(
    message: string,
    threadId: number | null,
    lang: string,
    onChunk: (text: string) => void,
    onDone: (threadId: number) => void,
    onError: (err: string) => void
  ) {
    const accessToken = getAccessToken()
    if (!accessToken) {
      onError('Authentication required. Please login again.')
      logoutUser()
      return
    }


    const runStream = async (token: string) => {
      return fetch(`${API_URL}/api/ai/chat/stream/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message, thread_id: threadId, lang }),
      })
    }

    let response = await runStream(accessToken)

    if (response.status === 401) {
      const refreshedToken = await refreshAccessToken()
      if (!refreshedToken) {
        onError('Authentication failed. Please login again.')
        logoutUser()
        return
      }

      response = await runStream(refreshedToken)
      if (response.status === 401) {
        onError('Authentication failed. Please login again.')
        logoutUser()
        return
      }
    }

    if (!response.ok || !response.body) {
      onError('AI haitapatikana sasa. Jaribu tena.')
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))

      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.text) onChunk(data.text)
          if (data.done) onDone(data.thread_id)
          if (data.error) onError(data.error)
        } catch {
          // skip malformed
        }
      }
    }
  },

  async getThreads(): Promise<AIThread[]> {
    const { data } = await api.get<AIThread[]>('/api/ai/threads/')
    return data
  },

  async getMessages(threadId: number): Promise<AIMessage[]> {
    const { data } = await api.get<AIMessage[]>(
      `/api/ai/threads/${threadId}/messages/`
    )
    return data
  },

  async deleteThread(threadId: number) {
    await api.delete(`/api/ai/threads/${threadId}/delete/`)
  },

  async getPreferences() {
    const { data } = await api.get('/api/ai/preferences/')
    return data
  },

  async updatePreferences(lang: 'sw' | 'en') {
    const { data } = await api.put('/api/ai/preferences/', {
      preferred_language: lang,
    })
    return data
  },

  async transcribeVoice(audioBlob: Blob): Promise<string> {
    const form = new FormData()
    form.append('audio', audioBlob, 'recording.webm')
    const { data } = await api.post<{ text: string }>(
      '/api/ai/voice-to-text/', form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data.text
  },
}