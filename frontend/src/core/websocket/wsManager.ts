const RAW_WS_URL = process.env.NEXT_PUBLIC_WS_URL

function normalizeBaseUrl(url: string) {
  const trimmed = url.replace(/\/+$/, '')
  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
    return trimmed
  }
  if (trimmed.startsWith('http://')) {
    return `ws://${trimmed.slice(7)}`
  }
  if (trimmed.startsWith('https://')) {
    return `wss://${trimmed.slice(8)}`
  }
  return trimmed
}

function getDefaultWsUrl() {
  if (typeof window === 'undefined') {
    return 'ws://localhost:8000'
  }
  const host = window.location.host
  return window.location.protocol === 'https:'
    ? `wss://${host}`
    : `ws://${host}`
}

const WS_URL = RAW_WS_URL ? normalizeBaseUrl(RAW_WS_URL) : getDefaultWsUrl()

function buildWsUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${WS_URL.replace(/\/+$/, '')}${normalizedPath}`
}

type MessageHandler = (data: Record<string, unknown>) => void

class WebSocketManager {
  private ws: WebSocket | null = null
  private url: string = ''
  private handlers: MessageHandler[] = []
  private reconnectDelay = 1000
  private maxDelay = 30000
  private shouldReconnect = true
  private pingInterval: ReturnType<typeof setInterval> | null = null

  connect(path: string) {
    const token = localStorage.getItem('kili_access_token')
    this.url = buildWsUrl(path)

    if (token) {
      this.url += this.url.includes('?') ? `&token=${encodeURIComponent(token)}` : `?token=${encodeURIComponent(token)}`
    }

    this._connect()
  }

  private _connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      console.log('[WS] Connected:', this.url)
      this.reconnectDelay = 1000
      this._startPing()
    }

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        this.handlers.forEach((h) => h(data))
      } catch {
        // ignore
      }
    }

    this.ws.onclose = (e) => {
      console.log('[WS] Closed:', {
        code: e.code,
        reason: e.reason,
        wasClean: e.wasClean,
        readyState: this.ws?.readyState,
      })
      this._stopPing()
      if (this.shouldReconnect) {
        setTimeout(() => {
          this.reconnectDelay = Math.min(
            this.reconnectDelay * 2, this.maxDelay
          )
          this._connect()
        }, this.reconnectDelay)
      }
    }

    this.ws.onerror = (e) => {
      console.error('[WS] Error:', {
        type: e.type,
        message: (e as ErrorEvent).message || 'WebSocket error',
        readyState: this.ws?.readyState,
      })
    }
  }

  send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  on(handler: MessageHandler) {
    this.handlers.push(handler)
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler)
    }
  }

  disconnect() {
    this.shouldReconnect = false
    this._stopPing()
    this.ws?.close()
    this.ws = null
  }

  private _startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ action: 'ping' })
    }, 30000)
  }

  private _stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
}

export function createWsManager() {
  return new WebSocketManager()
}