import api from '@/core/api/axios'
import type { AuthResponse, User } from '@/types'
import { tokenManager } from '@/core/auth/TokenManager'

/**
 * Authentication Service (Phase 2: Memory-Based)
 * 
 * Handles all auth-related API calls with memory-based JWT tokens.
 * 
 * FLOW:
 * 1. Login: Backend returns tokens in JSON response
 * 2. Frontend stores access token in memory (refresh token in cookie)
 * 3. Axios interceptor automatically attaches access token from memory
 * 4. On 401: Backend handles refresh automatically via cookies
 * 5. Axios retries request with new access token from API response
 * 
 * Phase 2 changes:
 * - No localStorage usage
 * - Access tokens in memory only
 * - Refresh tokens in HttpOnly cookies (backend responsibility)
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
      Object.entries(data).filter(([, v]) => v !== undefined && v !== null)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw error
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    // Phase 2: SessionManager handles token clearing via logout()
    // This service only makes the API call

    try {
      const { data } = await api.post<AuthResponse>('/auth/login/', {
        email,
        password,
      })

      // NOTE: Tokens are NOT stored here
      // SessionManager.login() is the SINGLE entry point for session state
      // Call SessionManager.login() after receiving this response
      // SessionManager will store access token in memory

      return data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw error
    }
  },

  async logout() {
    try {
      // Phase 2: No refresh token to send (it's in HttpOnly cookie)
      // Backend handles cookie deletion when we call /auth/logout/

      try {
        // Call backend to blacklist tokens (optional)
        await api.post('/auth/logout/', {})
      } catch {
        // Silently ignore API errors
        // Token clearing is handled by SessionManager.logout()
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw error
    }
  },

  async sendOtp(email: string, purpose = 'PASSWORD_RESET') {
    try {
      const { data } = await api.post('/auth/otp/send/', {
        email,
        purpose,
      })
      return data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw error
    }
  },

  async verifyOtp(
    email: string,
    code: string,
    purpose = 'PASSWORD_RESET'
  ) {
    try {
      const { data } = await api.post('/auth/otp/verify/', {
        email,
        code,
        purpose,
      })
      return data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw error
    }
  },

  async resetPassword(email: string) {
    try {
      const { data } = await api.post('/auth/password/reset/', { email })
      return data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw error
    }
  },

  /**
   * Get current authenticated user from backend
   *
   * Phase 2: Called during SessionManager.boot() to validate session
   *
   * Flow:
   * 1. Send GET request to /auth/me/ with Authorization header
   * 2. Axios request interceptor automatically attaches access token from memory
   * 3. Backend validates token and returns user data
   * 4. If 401 → axios will attempt cookie-based refresh automatically
   * 5. If success → user is authenticated
   * 6. If all retries fail → axios rejects with isAuthError
   *
   * This endpoint is the SOURCE OF TRUTH for authentication state
   */
  async getMe(): Promise<User> {
    try {
      const { data } = await api.get<User>('/auth/me/')

      return data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw error
    }
  },

  // Export tokenManager for direct access if needed
  tokenManager,
}