const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

type Handler = (data: Record<string, unknown>) => void

class NotificationsSocket {
  private ws: WebSocket | null = null
  private handlers: Handler[]  = []
  private reconnectDelay       = 1000
  private shouldReconnect      = true
  private ping: ReturnType<typeof setInterval> | null = null
  private url = ''

  connect() {
    const token = localStorage.getItem('kili_access_token')
    if (!token) return
    this.shouldReconnect = true
    this.url = `${WS_URL}/ws/notifications/?kili_access_token=${token}`
    this._connect()
  }

  private _connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

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
        setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
          this._connect()
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