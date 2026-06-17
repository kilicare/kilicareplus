import { tokenManager } from '@/core/auth/TokenManager'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL

if (!WS_URL) {
  throw new Error('❌ Missing NEXT_PUBLIC_WS_URL environment variable')
}

type Handler = (data: Record<string, unknown>) => void

class NotificationsSocket {
  private ws: WebSocket | null = null
  private handlers: Handler[]  = []
  private reconnectDelay       = 1000
  private shouldReconnect      = true
  private ping: ReturnType<typeof setInterval> | null = null
  private url = ''

  connect() {
    const token = tokenManager.getAccessToken()
    if (!token) return
    this.shouldReconnect = true
    this.url = `${WS_URL}/ws/notifications/?kili_access_token=${token}`
    this._connect()
  }

  private async _connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    // Validate token before connecting
    if (!tokenManager.isTokenValid()) {
      console.log('[NotificationsWS] Token invalid, attempting refresh...')
      const refreshed = await tokenManager.refreshIfPossible()
      if (!refreshed) {
        console.warn('[NotificationsWS] Token refresh failed, skipping connection')
        return
      }
      // Rebuild URL with fresh token
      const token = tokenManager.getAccessToken()
      if (!token) return
      this.url = `${WS_URL}/ws/notifications/?kili_access_token=${token}`
    }

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.reconnectDelay = 1000
      this._startPing()
    }

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        this.handlers.forEach((h) => h(data))
      } catch {}
    }

    this.ws.onclose = () => {
      this._stopPing()
      if (this.shouldReconnect) {
        setTimeout(async () => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
          await this._connect()
        }, this.reconnectDelay)
      }
    }

    this.ws.onerror = () => {}
  }

  on(handler: Handler) {
    this.handlers.push(handler)
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler)
    }
  }

  send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  disconnect() {
    this.shouldReconnect = false
    this._stopPing()
    this.ws?.close()
    this.ws = null
  }

  private _startPing() {
    this.ping = setInterval(() => this.send({ action: 'ping' }), 25000)
  }

  private _stopPing() {
    if (this.ping) { clearInterval(this.ping); this.ping = null }
  }
}

export const notificationsSocket = new NotificationsSocket()