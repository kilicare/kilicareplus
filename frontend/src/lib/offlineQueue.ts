import { offlineStorage, STORES } from './offlineStorage'

export interface QueuedAction {
  id: string
  type: 'create' | 'update' | 'delete'
  endpoint: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
  timestamp: number
  retries: number
  maxRetries: number
}

class OfflineQueue {
  private queue: QueuedAction[] = []
  private isProcessing: boolean = false

  async init(): Promise<void> {
    await offlineStorage.init()
    this.queue = await offlineStorage.getAll(STORES.QUEUE)
  }

  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    const queuedAction: QueuedAction = {
      ...action,
      id: `${action.type}-${action.endpoint}-${Date.now()}`,
      timestamp: Date.now(),
      retries: 0,
    }

    this.queue.push(queuedAction)
    await offlineStorage.add(STORES.QUEUE, queuedAction)

    if (!this.isProcessing && navigator.onLine) {
      this.process()
    }
  }

  async process(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) return

    this.isProcessing = true

    while (this.queue.length > 0 && navigator.onLine) {
      const action = this.queue[0]

      try {
        await this.executeAction(action)
        await offlineStorage.delete(STORES.QUEUE, action.id)
        this.queue.shift()
      } catch {
        action.retries++

        if (action.retries >= action.maxRetries) {
          // Max retries reached, remove from queue
          await offlineStorage.delete(STORES.QUEUE, action.id)
          this.queue.shift()
          console.error('[OfflineQueue] Max retries reached for action:', action)
        } else {
          // Update retry count
          await offlineStorage.update(STORES.QUEUE, action)
          // Move to end of queue
          this.queue.shift()
          this.queue.push(action)
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000 * action.retries))
        }
      }
    }

    this.isProcessing = false
  }

  private async executeAction(action: QueuedAction): Promise<void> {
    // Phase 2: Use TokenManager for memory-based access token (not localStorage)
    const { tokenManager } = await import('@/core/auth/TokenManager')
    const token = tokenManager.getAccessToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(action.endpoint, {
      method: action.type === 'create' ? 'POST' : action.type === 'update' ? 'PUT' : 'DELETE',
      headers,
      body: action.type !== 'delete' ? JSON.stringify(action.payload) : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  async clear(): Promise<void> {
    this.queue = []
    await offlineStorage.clear(STORES.QUEUE)
  }

  getQueue(): QueuedAction[] {
    return [...this.queue]
  }

  getQueueSize(): number {
    return this.queue.length
  }
}

export const offlineQueue = new OfflineQueue()
