import axios from 'axios'
import api from '@/core/api/axios'
import { tokenManager } from '@/core/auth/TokenManager'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Error mapping - converts backend errors to user-friendly messages
const mapErrorMessage = (backendError: string): string => {
  const error = backendError.toLowerCase()
  
  // Connection/network errors
  if (error.includes('unable to connect') || error.includes('internet connection')) {
    return 'Connection error. Please check your internet connection and try again.'
  }
  
  // Service unavailable errors
  if (error.includes('temporarily unavailable') || error.includes('try again later')) {
    return 'AI service is temporarily unavailable. Please try again later.'
  }
  
  // Timeout errors
  if (error.includes('timeout')) {
    return 'Request timeout. Please check your connection and try again.'
  }
  
  // Network errors
  if (error.includes('network error')) {
    return 'Network error. Please check your internet connection.'
  }
  
  // Transcription errors
  if (error.includes('transcription')) {
    return 'Voice transcription failed. Please try again.'
  }
  
  // Default fallback for any backend error
  if (backendError.length > 0) {
    return backendError
  }
  
  // Ultimate fallback
  return 'An error occurred. Please try again.'
}

const getAccessToken = () => {
  return tokenManager.getAccessToken()
}

const getRefreshToken = () => {
  return tokenManager.getRefreshToken()
}

const setAccessToken = (token: string) => {
  tokenManager.updateAccessToken(token)
}

const clearTokens = () => {
  tokenManager.clearTokens()
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
    onError: (err: string) => void,
    momentId?: number
  ) {
    const accessToken = getAccessToken()
    if (!accessToken) {
      onError('Authentication required. Please login again.')
      logoutUser()
      return
    }


    const runStream = async (token: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = { message, thread_id: threadId, lang }
      if (momentId) body.moment_id = momentId

      return fetch(`${API_URL}/api/ai/chat/stream/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
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
      // Handle HTTP error responses
      if (response.status === 503) {
        onError('AI service is temporarily unavailable. Please try again later.')
      } else if (response.status >= 500) {
        onError('AI service is temporarily unavailable. Please try again later.')
      } else if (response.status === 401) {
        onError('Authentication failed. Please login again.')
      } else {
        onError('Connection error. Please check your internet connection and try again.')
      }
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
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
            if (data.error) {
              // Map backend error to user-friendly message
              const userMessage = mapErrorMessage(data.error)
              onError(userMessage)
              return
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch {
      // Handle streaming read errors (network disconnect, etc.)
      onError('Connection lost. Please try again.')
    } finally {
      // Ensure reader is closed
      try {
        reader.cancel()
      } catch {
        // Ignore cancel errors
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

  async updatePreferences(lang: 'sw' | 'en' | 'fr' | 'es' | 'de' | 'ar' | 'zh') {
    const { data } = await api.put('/api/ai/preferences/', {
      preferred_language: lang,
    })
    return data
  },

  async transcribeVoice(audioBlob: Blob): Promise<string> {
    const form = new FormData()
    form.append('audio', audioBlob, 'recording.webm')
    try {
      const { data } = await api.post<{ text: string }>(
        '/api/ai/voice-to-text/', form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return data.text
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // Handle API errors with user-friendly messages
      const errorMessage = error?.response?.data?.message || error?.message || ''
      throw new Error(mapErrorMessage(errorMessage))
    }
  },
}