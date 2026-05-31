import api from '@/core/api/axios'
import type { AuthResponse, User } from '@/types'

/**
 * Token Storage Helpers
 * 
 * Manage JWT tokens in localStorage
 */
const tokenStorage = {
  setTokens: (accessToken: string, refreshToken: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('kili_access_token', accessToken)
    localStorage.setItem('kili_refresh_token', refreshToken)
  },
  
  getAccessToken: () => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('kili_access_token')
  },
  
  getRefreshToken: () => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('kili_refresh_token')
  },
  
  clearTokens: () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('kili_access_token')
    localStorage.removeItem('kili_refresh_token')
  },
  
  hasTokens: () => {
    if (typeof window === 'undefined') return false
    return !!(localStorage.getItem('kili_access_token') && localStorage.getItem('kili_refresh_token'))
  },
}

/**
 * Authentication Service
 * 
 * Handles all auth-related API calls with localStorage-based JWT tokens.
 * 
 * FLOW:
 * 1. Login: Backend returns tokens in JSON response
 * 2. Frontend stores both tokens in localStorage
 * 3. Axios interceptor automatically attaches access token to Authorization header
 * 4. On 401: Axios interceptor reads refresh token from localStorage
 * 5. Axios calls /auth/refresh/ with refresh token in request body
 * 6. Backend returns new access token
 * 7. Axios updates localStorage and retries original request
 */
export const authService = {
  async register(data: {
    username: string
    email: string
    password: string
    password2: string
    first_name?: string
    last_name?: string
    role: 'TOURIST' | 'LOCAL_GUIDE'
    phone?: string
  }) {
    try {
      const { data: res } = await api.post('/auth/register/', data)
      console.log('[AuthService] ✅ Registration successful', { email: data.email })
      return res
    } catch (error: any) {
      console.error('[AuthService] ❌ Registration failed', {
        email: data.email,
        error: error.response?.data?.message || error.message,
      })
      throw error
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('[AuthService] 🔄 Login attempt...', { email })
      
      const { data } = await api.post<AuthResponse>('/auth/login/', {
        email,
        password,
      })
      
      // Store tokens in localStorage
      tokenStorage.setTokens(data.access, data.refresh)
      
      console.log('[AuthService] ✅ Login successful. Tokens stored in localStorage.', {
        email,
        userId: data.user?.id,
      })
      
      return data
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message
      console.error('[AuthService] ❌ Login failed', { email, error: errorMessage })
      throw error
    }
  },

  async logout() {
    try {
      console.log('[AuthService] 🔄 Logout attempt...')
      
      // Get refresh token before clearing
      const refreshToken = tokenStorage.getRefreshToken()
      
      // Clear tokens from localStorage first (even if API call fails)
      tokenStorage.clearTokens()
      
      try {
        // Send refresh token to backend for blacklisting (optional)
        await api.post('/auth/logout/', { refresh: refreshToken })
        console.log('[AuthService] ✅ Logout successful. Tokens cleared from localStorage.')
      } catch (error: any) {
        // Log error but don't throw - tokens are already cleared
        console.warn('[AuthService] ⚠️  Logout API call failed (tokens already cleared)', {
          error: error.response?.data?.message || error.message,
        })
      }
    } catch (error: any) {
      console.error('[AuthService] ❌ Logout failed', {
        error: error.message,
      })
      throw error
    }
  },

  async sendOtp(email: string, purpose = 'EMAIL_VERIFY') {
    try {
      const { data } = await api.post('/auth/otp/send/', {
        email,
        purpose,
      })
      console.log('[AuthService] ✅ OTP sent successfully', { email, purpose })
      return data
    } catch (error: any) {
      console.error('[AuthService] ❌ OTP send failed', {
        email,
        purpose,
        error: error.response?.data?.message || error.message,
      })
      throw error
    }
  },

  async verifyOtp(
    email: string,
    code: string,
    purpose = 'EMAIL_VERIFY'
  ) {
    try {
      const { data } = await api.post('/auth/otp/verify/', {
        email,
        code,
        purpose,
      })
      console.log('[AuthService] ✅ OTP verified successfully', { email, purpose })
      return data
    } catch (error: any) {
      console.error('[AuthService] ❌ OTP verification failed', {
        email,
        purpose,
        error: error.response?.data?.message || error.message,
      })
      throw error
    }
  },

  async resetPassword(email: string) {
    try {
      const { data } = await api.post('/auth/password/reset/', { email })
      console.log('[AuthService] ✅ Password reset initiated', { email })
      return data
    } catch (error: any) {
      console.error('[AuthService] ❌ Password reset failed', {
        email,
        error: error.response?.data?.message || error.message,
      })
      throw error
    }
  },

  async confirmPassword(
    email: string,
    code: string,
    new_password: string,
    new_password2: string
  ) {
    try {
      const { data } = await api.post('/auth/password/confirm/', {
        email,
        code,
        new_password,
        new_password2,
      })
      console.log('[AuthService] ✅ Password confirmed', { email })
      return data
    } catch (error: any) {
      console.error('[AuthService] ❌ Password confirm failed', {
        email,
        error: error.response?.data?.message || error.message,
      })
      throw error
    }
  },

  async verifyForgotOtp(email: string, otp: string) {
    try {
      const { data } = await api.post('/auth/verify-forgot-otp/', {
        email,
        otp,
      })
      console.log('[AuthService] ✅ Forgot OTP verified', { email })
      return data
    } catch (error: any) {
      console.error('[AuthService] ❌ Forgot OTP verification failed', {
        email,
        error: error.response?.data?.message || error.message,
      })
      throw error
    }
  },

  async resetPasswordNew(
    email: string,
    otp: string,
    new_password: string,
    new_password_confirm: string
  ) {
    try {
      const { data } = await api.post('/auth/reset-password/', {
        email,
        otp,
        new_password,
        new_password_confirm,
      })
      console.log('[AuthService] ✅ Password reset completed', { email })
      return data
    } catch (error: any) {
      console.error('[AuthService] ❌ Password reset failed', {
        email,
        error: error.response?.data?.message || error.message,
      })
      throw error
    }
  },

  /**
   * Get current authenticated user from backend
   * 
   * CRITICAL: Called on app load to verify localStorage-based JWT tokens
   * 
   * Flow:
   * 1. Check if tokens exist in localStorage
   * 2. If yes, send GET request to /auth/me/ with Authorization header
   * 3. Axios request interceptor automatically attaches access token
   * 4. Backend validates token and returns user data
   * 5. If 401 → tokens are invalid/expired, refresh will be attempted
   * 6. If refresh succeeds → user is authenticated
   * 7. If refresh fails → user must login again
   * 
   * This endpoint is the SOURCE OF TRUTH for authentication state
   */
  async getMe(): Promise<User> {
    try {
      // Check if tokens exist before attempting
      if (!tokenStorage.hasTokens()) {
        throw new Error('No tokens found in localStorage')
      }
      
      console.log('[AuthService] 🔄 Verifying authentication with stored tokens...')
      
      const startTime = performance.now()
      const { data } = await api.get<User>('/auth/me/')
      const duration = (performance.now() - startTime).toFixed(0)
      
      console.log(`[AuthService] ✅ User authenticated (${duration}ms)`, {
        userId: data.id,
        username: data.username,
        email: data.email,
      })
      
      return data
    } catch (error: any) {
      const errorStatus = error?.response?.status || 'unknown'
      const errorMessage = error?.response?.data?.message || error.message
      
      if (errorStatus === 401) {
        console.log('[AuthService] ℹ️  User not authenticated (401). Tokens may be expired.')
      } else if (error.message === 'No tokens found in localStorage') {
        console.log('[AuthService] ℹ️  No tokens in localStorage. User is not logged in.')
      } else {
        console.error('[AuthService] ❌ Auth check failed', {
          status: errorStatus,
          error: errorMessage,
        })
      }
      
      throw error
    }
  },

  async updateMe(formData: FormData | Record<string, unknown>): Promise<User> {
    try {
      const isForm = formData instanceof FormData
      const { data } = await api.put<User>('/auth/me/', formData, {
        headers: isForm
          ? { 'Content-Type': 'multipart/form-data' }
          : { 'Content-Type': 'application/json' },
      })
      console.log('[AuthService] ✅ Profile updated', { userId: data.id })
      return data
    } catch (error: any) {
      console.error('[AuthService] ❌ Profile update failed', {
        error: error.response?.data?.message || error.message,
      })
      throw error
    }
  },

  async checkUsername(username: string) {
    try {
      const { data } = await api.get('/auth/check-username/', {
        params: { username },
      })
      console.log('[AuthService] ✅ Username check complete', {
        username,
        available: data.available,
      })
      return data
    } catch (error: any) {
      console.error('[AuthService] ❌ Username check failed', {
        username,
        error: error.response?.data?.message || error.message,
      })
      throw error
    }
  },

  // Export token storage for direct access if needed
  tokenStorage,
}