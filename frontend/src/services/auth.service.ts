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
    role?: 'TOURIST' | 'LOCAL_GUIDE'
    phone?: string
  }) {
    // Runtime safeguard: Remove undefined/null fields
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined && v !== null)
    ) as typeof data

    // Runtime safeguard: Ensure password fields exist
    if (!cleanData.password || !cleanData.password2) {
      throw new Error('Password fields are required')
    }

    // Runtime safeguard: Ensure password fields match
    if (cleanData.password !== cleanData.password2) {
      throw new Error('Passwords do not match')
    }

    try {
      const { data: res } = await api.post('/auth/register/', cleanData)
      return res
    } catch (error: any) {
      throw error
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    // CRITICAL: Clear stale auth state BEFORE authentication attempt
    // This prevents legacy token leakage and ensures clean login
    tokenStorage.clearTokens()

    try {
      const { data } = await api.post<AuthResponse>('/auth/login/', {
        email,
        password,
      })

      // Store fresh tokens only after successful login
      tokenStorage.setTokens(data.access, data.refresh)

      return data
    } catch (error: any) {
      // On login failure, ensure tokens remain cleared
      tokenStorage.clearTokens()
      throw error
    }
  },

  async logout() {
    try {
      // Get refresh token before clearing
      const refreshToken = tokenStorage.getRefreshToken()

      // Clear tokens from localStorage first (even if API call fails)
      tokenStorage.clearTokens()

      try {
        // Send refresh token to backend for blacklisting (optional)
        await api.post('/auth/logout/', { refresh: refreshToken })
      } catch (error: any) {
        // Log error but don't throw - tokens are already cleared
        // Silently ignore API errors
      }
    } catch (error: any) {
      throw error
    }
  },

  async sendOtp(email: string, purpose = 'EMAIL_VERIFY') {
    try {
      const { data } = await api.post('/auth/otp/send/', {
        email,
        purpose,
      })
      return data
    } catch (error: any) {
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
      return data
    } catch (error: any) {
      throw error
    }
  },

  async resetPassword(email: string) {
    try {
      const { data } = await api.post('/auth/password/reset/', { email })
      return data
    } catch (error: any) {
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
      return data
    } catch (error: any) {
      throw error
    }
  },

  async verifyForgotOtp(email: string, otp: string) {
    try {
      const { data } = await api.post('/auth/verify-forgot-otp/', {
        email,
        otp,
      })
      return data
    } catch (error: any) {
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
      return data
    } catch (error: any) {
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

      const { data } = await api.get<User>('/auth/me/')

      return data
    } catch (error: any) {
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
      return data
    } catch (error: any) {
      console.warn('[AuthService] Failed to update user profile:', error)
      throw error
    }
  },

  async checkUsername(username: string) {
    try {
      const { data } = await api.get('/auth/check-username/', {
        params: { username },
      })
      return data
    } catch (error: any) {
      throw error
    }
  },

  // Export token storage for direct access if needed
  tokenStorage,
}