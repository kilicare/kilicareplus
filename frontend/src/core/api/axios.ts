import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Token storage helpers
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

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  // No withCredentials - tokens sent via Authorization header
})

// Public endpoints that MUST NOT receive Authorization headers
const PUBLIC_ENDPOINTS = [
  '/auth/login/',
  '/auth/register/',
  '/auth/refresh/',
  '/auth/otp/send/',
  '/auth/otp/verify/',
]

// Check if request URL is a public endpoint
const isPublicEndpoint = (url?: string): boolean => {
  if (!url) return false
  return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint))
}

// Request interceptor: Attach access token to Authorization header ONLY for protected endpoints
api.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken()
    const isPublic = isPublicEndpoint(config.url)
    
    // Only attach token if:
    // 1. Token exists AND
    // 2. Endpoint is NOT public
    if (accessToken && !isPublic) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    
    // Explicitly remove Authorization header for public endpoints
    if (isPublic) {
      delete config.headers.Authorization
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

let isRefreshing = false
let queue: Array<{
  resolve: (v: void) => void
  reject: (e: unknown) => void
}> = []

function flush(err: unknown) {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve()))
  queue = []
}

/**
 * Axios Response Interceptor
 * 
 * Handles 401 errors by attempting to refresh the access token
 * 
 * FLOW:
 * 1. On 401: read refreshToken from localStorage
 * 2. POST /auth/refresh/ with { refresh: token }
 * 3. Backend returns new access token
 * 4. Update localStorage
 * 5. Retry original request
 * 
 * CRITICAL RULES:
 * 1. Only attempt refresh ONCE per original request
 * 2. Max 1 refresh attempt total (prevent infinite loops)
 * 3. If refresh fails → clear tokens & redirect to login
 * 4. Queue other requests while refreshing
 */
api.interceptors.response.use(
  (res) => {
    return res
  },
  async (err: AxiosError) => {
    const orig = err.config as InternalAxiosRequestConfig & {
      _retry?: number
      _refreshAttempts?: number
    }
    
    // Initialize retry counter
    orig._retry = orig._retry ?? 0
    orig._refreshAttempts = orig._refreshAttempts ?? 0
    
    // Handle network errors (no response)
    if (!err.response) {
      console.error('[API Interceptor] 🔴 Network Error', {
        url: err.config?.url,
        method: err.config?.method,
        message: err.message,
      })
      
      // Reject with safe error message
      return Promise.reject({
        ...err,
        isNetworkError: true,
        message: 'Network error. Please check your connection.',
      })
    }
    
    // Handle 500 errors
    if (err.response.status === 500) {
      console.error('[API Interceptor] 🔴 Server Error (500)', {
        url: err.config?.url,
        method: err.config?.method,
      })
      
      // Reject with safe error message
      return Promise.reject({
        ...err,
        isServerError: true,
        message: 'Server error. Please try again later.',
      })
    }
    
    // Handle timeout errors
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      console.error('[API Interceptor] 🔴 Timeout Error', {
        url: err.config?.url,
        method: err.config?.method,
      })
      
      // Reject with safe error message
      return Promise.reject({
        ...err,
        isTimeout: true,
        message: 'Request timeout. Please try again.',
      })
    }
    
    // Handle 401 Unauthorized - attempt token refresh
    if (err.response?.status === 401) {
      const errorData = (err.response?.data as any) || {}
      const errorMessage = errorData.message || errorData.detail || 'Unauthorized'
      
      console.warn('[API Interceptor] 🔴 401 Unauthorized', {
        url: err.config?.url,
        method: err.config?.method,
        retries: orig._retry,
        reason: errorMessage,
      })
      
      // Prevent infinite retries - max 1 refresh attempt
      if (orig._refreshAttempts >= 1) {
        console.error('[API Interceptor] 🚫 Max refresh attempts (1) reached. Logging out.', {
          url: err.config?.url,
          method: err.config?.method,
        })
        
        flush(err)
        clearTokens()
        
        // Redirect to login
        if (typeof window !== 'undefined') {
          console.log('[API Interceptor] Redirecting to /login')
          window.location.href = '/login'
        }
        
        return Promise.reject(err)
      }
      
      // If already retried this request, don't retry again
      if (orig._retry >= 1) {
        console.warn('[API Interceptor] Request already retried once. Not retrying again.', {
          url: err.config?.url,
        })
        
        flush(err)
        clearTokens()
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        
        return Promise.reject(err)
      }
      
      // Queue requests while refreshing
      if (isRefreshing) {
        console.log('[API Interceptor] Already refreshing. Queuing request:', {
          url: err.config?.url,
          queueSize: queue.length,
        })
        
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then(() => api(orig))
      }
      
      // Begin refresh
      orig._retry += 1
      orig._refreshAttempts += 1
      isRefreshing = true
      
      console.log('[API Interceptor] 🔄 Attempting token refresh (attempt 1)...')
      
      try {
        const refreshToken = getRefreshToken()
        
        if (!refreshToken) {
          console.error('[API Interceptor] ❌ No refresh token found in localStorage')
          flush(err)
          clearTokens()
          
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          
          return Promise.reject(new Error('No refresh token available'))
        }
        
        // Call refresh endpoint with refresh token in body
        const refreshStart = performance.now()
        
        const refreshResponse = await axios.post<{ access: string; success: boolean }>(
          `${API_URL}/auth/refresh/`,
          { refresh: refreshToken },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
          }
        )
        
        const refreshDuration = (performance.now() - refreshStart).toFixed(0)
        console.log(`[API Interceptor] ✅ Token refreshed successfully (${refreshDuration}ms)`)
        
        // Update access token in localStorage
        const newAccessToken = refreshResponse.data.access
        setAccessToken(newAccessToken)
        
        console.log('[API Interceptor] ✅ New access token saved to localStorage')
        
        // Update Authorization header for original request
        orig.headers.Authorization = `Bearer ${newAccessToken}`
        
        // Refresh successful, retry original request
        flush(null)
        
        console.log('[API Interceptor] 🔄 Retrying original request after refresh', {
          url: err.config?.url,
          method: err.config?.method,
        })
        
        return api(orig)
      } catch (refreshError: any) {
        const refreshErrorStatus = refreshError?.response?.status || 'unknown'
        const refreshErrorMessage = 
          refreshError?.response?.data?.message || 
          refreshError?.message || 
          'Unknown error'
        
        console.error('[API Interceptor] ❌ Token refresh failed', {
          status: refreshErrorStatus,
          reason: refreshErrorMessage,
        })
        
        flush(refreshError)
        clearTokens()
        
        // Refresh failed, redirect to login
        if (typeof window !== 'undefined') {
          console.log('[API Interceptor] Refresh failed. Redirecting to /login')
          window.location.href = '/login'
        }
        
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
        console.log('[API Interceptor] Refresh cycle complete')
      }
    }
    
    // Non-401 error - pass through
    return Promise.reject(err)
  }
)

export default api