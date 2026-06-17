/**
 * TokenManager - Centralized Token Management
 * 
 * Single source of truth for all JWT token operations.
 * All token reads, writes, and deletes must go through this manager.
 * 
 * Responsibilities:
 * - getAccessToken()
 * - getRefreshToken()
 * - setTokens()
 * - clearTokens()
 * - updateTokens()
 * - isAuthenticated()
 * - hasTokens()
 */

const ACCESS_TOKEN_KEY = 'kili_access_token'
const REFRESH_TOKEN_KEY = 'kili_refresh_token'

class TokenManager {
  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  }

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }

  /**
   * Set both access and refresh tokens in localStorage
   */
  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }

  /**
   * Update access token only (used after token refresh)
   */
  updateAccessToken(accessToken: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  }

  /**
   * Clear both tokens from localStorage
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  /**
   * Check if both tokens exist in localStorage
   */
  hasTokens(): boolean {
    if (typeof window === 'undefined') return false
    return !!(
      localStorage.getItem(ACCESS_TOKEN_KEY) && 
      localStorage.getItem(REFRESH_TOKEN_KEY)
    )
  }

  /**
   * Check if user is authenticated (has valid access token)
   */
  isAuthenticated(): boolean {
    return this.hasTokens()
  }

  /**
   * Check if access token is valid (not expired)
   * Returns true if token exists and has more than 60 seconds remaining
   */
  isTokenValid(): boolean {
    const token = this.getAccessToken()
    if (!token) return false

    try {
      // Decode JWT payload (base64)
      const payload = JSON.parse(atob(token.split('.')[1]))
      const now = Math.floor(Date.now() / 1000)
      // Consider token valid if it has at least 60 seconds remaining
      return payload.exp > now + 60
    } catch {
      // If token is malformed, consider it invalid
      return false
    }
  }

  /**
   * Refresh token if possible
   * This performs actual token refresh by calling the refresh endpoint
   * Returns true if refresh was successful, false otherwise
   */
  async refreshIfPossible(): Promise<boolean> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      console.warn('[TokenManager] No refresh token available')
      return false
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL
      if (!API_URL) {
        console.error('[TokenManager] NEXT_PUBLIC_API_URL not set')
        return false
      }

      console.log('[TokenManager] Attempting token refresh...')
      const response = await fetch(`${API_URL}/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      })

      if (!response.ok) {
        console.error('[TokenManager] Token refresh failed', response.status)
        return false
      }

      const data = await response.json()
      if (data.access) {
        this.updateAccessToken(data.access)
        console.log('[TokenManager] Token refreshed successfully')
        return true
      }

      console.error('[TokenManager] No access token in refresh response')
      return false
    } catch (error) {
      console.error('[TokenManager] Token refresh error:', error)
      return false
    }
  }
}

// Export singleton instance
export const tokenManager = new TokenManager()
