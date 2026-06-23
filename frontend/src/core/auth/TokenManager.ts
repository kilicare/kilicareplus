/**
 * TokenManager - Centralized Token Management (Phase 2: Memory-Only)
 * 
 * Phase 2 changes:
 * - Access tokens stored in memory ONLY (not localStorage)
 * - Refresh tokens stored in HttpOnly cookies (backend responsibility)
 * - Single source of truth for access token operations
 * 
 * Responsibilities:
 * - getAccessToken() - from memory
 * - setAccessToken() - to memory
 * - clearAccessToken() - from memory
 * - isTokenValid() - JWT expiry check
 * 
 * DEPRECATED (handled by backend cookies):
 * - getRefreshToken()
 * - setTokens()
 * - updateAccessToken()
 * - refreshIfPossible()
 * - hasTokens()
 */

// Phase 2: In-memory storage for access token
let accessToken: string | null = null

class TokenManager {
  /**
   * Get access token from memory
   * Phase 2: Memory-only (not localStorage)
   */
  getAccessToken(): string | null {
    return accessToken
  }

  /**
   * Set access token in memory
   * Phase 2: Memory-only (not localStorage)
   */
  setAccessToken(token: string): void {
    accessToken = token
  }

  /**
   * Get refresh token
   * Phase 2: DEPRECATED - Refresh tokens are now in HttpOnly cookies
   * Kept for backward compatibility, returns null
   */
  getRefreshToken(): string | null {
    // Phase 2: Refresh tokens are in HttpOnly cookies
    // This method is deprecated and returns null
    return null
  }

  /**
   * Set both tokens
   * Phase 2: DEPRECATED - Only access token is stored in memory
   * Refresh token is automatically in HttpOnly cookie
   */
  setTokens(accessToken: string, _refreshToken?: string): void {
    // Phase 2: Only set access token (refresh token from cookie)
    this.setAccessToken(accessToken)
  }

  /**
   * Update access token only
   * Phase 2: Same as setAccessToken since we only store access tokens now
   */
  updateAccessToken(accessToken: string): void {
    this.setAccessToken(accessToken)
  }

  /**
   * Clear tokens
   * Phase 2: Clear memory token (refresh token cleared by backend via cookie delete)
   */
  clearTokens(): void {
    accessToken = null
  }

  /**
   * Check if tokens exist
   * Phase 2: Only check access token (refresh token is automatic in cookie)
   */
  hasTokens(): boolean {
    return !!accessToken
  }

  /**
   * Check if user is authenticated
   * Phase 2: Same as hasTokens()
   * 
   * @deprecated This method is misleading and should not be used for session validation.
   * Use useSession() hook and check sessionValid instead.
   * Having a token doesn't mean the session is valid (user could be null, token could be expired).
   */
  isAuthenticated(): boolean {
    console.warn('[TokenManager] ⚠️ isAuthenticated() is deprecated. Use useSession() hook and check sessionValid instead.')
    return this.hasTokens()
  }

  /**
   * Check if access token is valid (not expired)
   * Returns true if token exists and has more than 10 seconds remaining
   */
  isTokenValid(): boolean {
    const token = this.getAccessToken()
    if (!token) return false

    try {
      // Decode JWT payload (base64)
      const payload = JSON.parse(atob(token.split('.')[1]))
      const now = Math.floor(Date.now() / 1000)
      // Consider token valid if it has at least 10 seconds remaining
      return payload.exp > now + 10
    } catch {
      // If token is malformed, consider it invalid
      return false
    }
  }

  /**
   * Refresh token if possible
   * Phase 2: DEPRECATED - Cookie-based refresh is automatic
   * Backend will automatically return new refresh token in cookie on 401
   * This method is kept for backward compatibility but does nothing
   */
  async refreshIfPossible(): Promise<boolean> {
    // Phase 2: Refresh is handled by backend via cookies and axios interceptor
    // This method is deprecated
    return false
  }
}

// Export singleton instance
export const tokenManager = new TokenManager()
