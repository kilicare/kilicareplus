export class ApiClient {
  private baseURL: string

  constructor() {
    const url = process.env.NEXT_PUBLIC_API_URL

    if (!url) {
      throw new Error('❌ Missing NEXT_PUBLIC_API_URL environment variable')
    }

    this.baseURL = url
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('kili_access_token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    return headers
  }

  async get(path: string) {
    const res = await fetch(`${this.baseURL}${path}`, {
      headers: this.getHeaders(),
    })

    if (!res.ok) {
      throw new Error(`API GET failed: ${path} (${res.status})`)
    }

    return res.json()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async post(path: string, body: any) {
    const res = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`API POST failed: ${path} (${res.status})`)
    }

    return res.json()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async put(path: string, body: any) {
    const res = await fetch(`${this.baseURL}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`API PUT failed: ${path} (${res.status})`)
    }

    return res.json()
  }

  async delete(path: string) {
    const res = await fetch(`${this.baseURL}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    if (!res.ok) {
      throw new Error(`API DELETE failed: ${path} (${res.status})`)
    }

    return res.json()
  }
}

// Global instance
export const apiClient = new ApiClient()
