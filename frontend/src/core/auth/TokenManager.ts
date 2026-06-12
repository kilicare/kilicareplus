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
}

// Export singleton instance
export const tokenManager = new TokenManager()
