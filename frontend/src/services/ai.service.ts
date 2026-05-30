import api from '@/core/api/axios'

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
    const token = localStorage.getItem('kili_access')
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    const response = await fetch(`${API}/api/ai/chat/stream/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, thread_id: threadId, lang }),
    })

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