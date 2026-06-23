import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios'
import { tokenManager } from '@/core/auth/TokenManager'

const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  throw new Error('❌ Missing NEXT_PUBLIC_API_URL environment variable')
}

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  // Phase 2: Enable credentials (withCredentials) to send/receive cookies
  withCredentials: true,
})

// Refresh lock to prevent multiple simultaneous refresh calls
let isRefreshing = false
// Retry queue for requests that fail during refresh
let failedQueue: Array<{
  resolve: (value: any) => void
  reject: (reason?: any) => void
  config: InternalAxiosRequestConfig
}> = []

/**
 * Process retry queue after successful refresh
 * Replay all queued requests with new access token
 */
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      // Update the config with new token
      prom.config.headers.Authorization = `Bearer ${token}`
      prom.resolve(api(prom.config))
    }
  })
  failedQueue = []
}

// Public endpoints that MUST NOT receive Authorization headers
const PUBLIC_ENDPOINTS = [
  '/auth/login/',
  '/auth/register/',
  '/auth/refresh/',
  '/auth/otp/send/',
  '/auth/otp/verify/',
  '/auth/logout/',
]

// Check if request URL is a public endpoint
const isPublicEndpoint = (url?: string): boolean => {
  if (!url) return false
  return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint))
}

/**
 * Request Interceptor - Phase 2: Simple Memory-Based Auth
 *
 * FLOW:
 * 1. Check if endpoint is public
 * 2. If protected: Attach access token from memory to Authorization header
 * 3. If public: Remove Authorization header
 * 
 * Phase 2 changes:
 * - Access token comes from memory (not localStorage)
 * - Refresh token is automatic via cookies
 * - No complex refresh logic here
 */
api.interceptors.request.use(
  (config) => {
    const accessToken = tokenManager.getAccessToken()
    const isPublic = isPublicEndpoint(config.url)
    
    // Debug logging for protected endpoints
    if (!isPublic) {
      console.log('[API Request]', {
        url: config.url,
        hasToken: !!accessToken,
        tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'none',
      })
    }
    
    // Attach token to protected endpoints
    if (accessToken && !isPublic) {
      config.headers.Authorization = `Bearer ${accessToken}`
    } else if (isPublic) {
      // Explicitly remove Authorization header for public endpoints
      delete config.headers.Authorization
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * Response Interceptor - Production-Grade 401 Refresh Logic
 * 
 * FLOW:
 * 1. Pass successful responses through
 * 2. On 401: Attempt token refresh using cookie, then retry original request
 * 3. On refresh failure: Clear tokens, reject with isAuthError
 * 4. On other errors: Pass through with context
 * 
 * Production features:
 * - Refresh lock to prevent multiple simultaneous refresh calls
 * - Retry queue for requests that fail during refresh
 * - Automatic retry after successful refresh
 * - Safe logout fallback on refresh failure
 */
api.interceptors.response.use(
  (res) => {
    return res
  },
  async (err: AxiosError) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorData = (err.response?.data as any) || {}
    const errorMessage = errorData.message || errorData.detail || 'Unknown error'
    const originalRequest = err.config as InternalAxiosRequestConfig

    // Handle network errors (no response)
    if (!err.response) {
      console.error('[API] 🔴 Network Error', {
        url: err.config?.url,
        message: err.message,
      })
      
      // Dispatch custom event for NetworkErrorWatcher
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('network-error', { detail: err }))
      }
      
      return Promise.reject({
        ...err,
        isNetworkError: true,
        message: 'Network error. Please check your connection.',
      })
    }

    // Handle 500 errors - DO NOT LOGOUT (SaaS-grade policy)
    if (err.response.status === 500) {
      console.error('[API] 🔴 Server Error (500)', {
        url: err.config?.url,
      })
      
      return Promise.reject({
        ...err,
        isServerError: true,
        message: 'Server error. Please try again later.',
      })
    }

    // Handle timeout errors
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      console.error('[API] 🔴 Timeout Error', {
        url: err.config?.url,
      })
      
      return Promise.reject({
        ...err,
        isTimeout: true,
        message: 'Request timeout. Please try again.',
      })
    }

    // Handle 401 Unauthorized
    if (err.response?.status === 401) {
      console.warn('[API] 🔴 401 Unauthorized', {
        url: err.config?.url,
        reason: errorMessage,
      })

      // Skip refresh for public endpoints (they should not be protected)
      if (isPublicEndpoint(err.config?.url)) {
        console.warn('[API] 🚫 401 on public endpoint. Not retrying.', {
          url: err.config?.url,
        })
        return Promise.reject(err)
      }

      // Skip refresh for /auth/refresh/ itself to prevent infinite loop
      if (err.config?.url?.includes('/auth/refresh/')) {
        console.error('[API] 🚫 Refresh endpoint returned 401. Clearing tokens.')
        tokenManager.clearTokens()
        return Promise.reject({
          ...err,
          isAuthError: true,
          message: 'Session expired. Please log in again.',
        })
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        console.log('[API] 🔄 Refresh in progress, queuing request:', err.config?.url)
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest })
        })
      }

      // Start refresh process
      isRefreshing = true
      console.log('[API] 🔄 Attempting token refresh...')

      try {
        // Call /auth/refresh/ using cookie (withCredentials: true)
        const { data } = await api.post('/auth/refresh/', {})
        
        console.log('[API] ✅ Token refresh successful')
        
        // Store new access token in memory
        tokenManager.setAccessToken(data.access)
        
        // Process retry queue with new token
        processQueue(null, data.access)
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return api(originalRequest)
        
      } catch (refreshError) {
        console.error('[API] ❌ Token refresh failed', refreshError)
        
        // Clear tokens on refresh failure
        tokenManager.clearTokens()
        
        // Process retry queue with error
        processQueue(refreshError, null)
        
        // Reject with isAuthError flag for SessionManager to handle logout
        return Promise.reject({
          ...err,
          isAuthError: true,
          message: 'Session expired. Please log in again.',
        })
      } finally {
        isRefreshing = false
      }
    }

    // Non-401 error - pass through
    return Promise.reject(err)
  }
)

export default api