/**
 * SessionManager - SaaS-Grade Session Management (Phase 2: Memory-Based)
 * 
 * Single source of truth for authentication state.
 * All authentication logic MUST go through this manager.
 * 
 * Phase 2 changes:
 * - Session validation via /auth/me/ API call (not localStorage)
 * - Memory token storage (not localStorage)
 * - Automatic cookie-based refresh (not manual token refresh)
 * 
 * Responsibilities:
 * - Session state management
 * - Rehydrate flow via /auth/refresh/ and /auth/me/ validation
 * - User profile enrichment
 * 
 * REHYDRATE FLOW (Phase 2):
 * Protected route → SessionManager.rehydrate() → /auth/refresh/ → /auth/me/ → set session state
 */

import { tokenManager } from './TokenManager'

interface SessionState {
  isAuthenticated: boolean
  isLoading: boolean
  user: any | null
  sessionValid: boolean // NEW: Only true when authenticated AND user is present
}

class SessionManager {
  private state: SessionState = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    sessionValid: false,
  }

  private listeners: Set<(state: SessionState) => void> = new Set()
  private bootPromise: Promise<void> | null = null
  private rehydratePromise: Promise<boolean> | null = null
  private freshLoginTimestamp: number | null = null

  /**
   * Subscribe to session state changes
   */
  subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  /**
   * Get current session state
   */
  getState(): SessionState {
    return { ...this.state }
  }

  /**
   * Update session state and notify listeners
   */
  private setState(partial: Partial<SessionState>): void {
    this.state = { ...this.state, ...partial }
    this.listeners.forEach(listener => listener(this.getState()))
  }

  /**
   * Refresh access token using cookie
   * Phase 2.5: Call /auth/refresh/ to get new access token from cookie
   * Returns true if refresh successful, false otherwise
   */
  private async refreshAccessToken(): Promise<boolean> {
    try {
      // Import api dynamically to avoid circular dependency
      const api = (await import('@/core/api/axios')).default
      const { data } = await api.post('/auth/refresh/', {})
      
      console.log('[SessionManager] ✅ Token refresh successful')
      tokenManager.setAccessToken(data.access)
      return true
    } catch (error: any) {
      console.log('[SessionManager] ⚠️ Token refresh failed')
      return false
    }
  }

  /**
   * Validate session by calling /auth/me/
   * Phase 2: This replaces local token validation
   * Returns true if user is authenticated, false otherwise
   */
  private async validateSessionViaApi(): Promise<boolean> {
    try {
      // Import authService dynamically to avoid circular dependency
      const { authService } = await import('@/services/auth.service')
      const user = await authService.getMe()
      console.log('[SessionManager] ✅ Session validated via /auth/me/')
      this.setState({ user })
      return true
    } catch (error: any) {
      console.log('[SessionManager] ⚠️ Session validation failed via /auth/me/')
      return false
    }
  }

  /**
   * Rehydrate session - HARD BOOT FLOW (Deterministic)
   * This is the SINGLE entry point for session restoration on protected routes
   * 
   * Phase 3: Guaranteed rehydration - NO SKIPPING under ANY condition
   * 
   * FLOW:
   * 1. Call /auth/refresh/ using HttpOnly cookie
   * 2. Store new access token in memory
   * 3. Call /auth/me/ to validate session
   * 4. Set user state globally
   * 5. Set sessionValid = true (only when user is present)
   * 
   * This MUST always run on:
   * - Page refresh
   * - Route entry to protected pages
   * - App initialization
   */
  async rehydrate(): Promise<boolean> {
    // Prevent multiple rehydrate calls
    if (this.rehydratePromise) {
      return this.rehydratePromise
    }

    this.rehydratePromise = this._rehydrate()
    return this.rehydratePromise
  }

  private async _rehydrate(): Promise<boolean> {
    console.log('[SessionManager] 🚀 REHYDRATE START (HARD BOOT - NO SKIP)')
    
    this.setState({ isLoading: true })

    // Initialize tab synchronization
    this.initTabSync()

    // CRITICAL FIX: Preserve existing user from login to prevent overwrite
    // Store the user BEFORE any API calls
    const existingUser = this.state.user
    const hadExistingUser = existingUser !== null
    console.log('[SessionManager] 🔒 Preserving existing user:', hadExistingUser ? 'YES' : 'NO')

    try {
      console.log('[SessionManager] Step 1: Refreshing access token using cookie...')
      
      // Step 1: Call /auth/refresh/ using HttpOnly cookie
      const refreshSuccess = await this.refreshAccessToken()
      
      if (!refreshSuccess) {
        console.log('[SessionManager] ❌ Token refresh failed - no valid session')
        // CRITICAL FIX: If we had a user from login, preserve it even if refresh fails
        // This prevents blank feed after login due to refresh failure
        if (hadExistingUser) {
          console.log('[SessionManager] 🔒 Preserving login user despite refresh failure')
          this.setState({
            isAuthenticated: true,
            isLoading: false,
            user: existingUser,
            sessionValid: true,
          })
          return true
        }
        this.setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          sessionValid: false,
        })
        return false
      }

      console.log('[SessionManager] ✅ Token refresh successful')
      console.log('[SessionManager] Step 2: Validating session via /auth/me/...')
      
      // Step 2: Call /auth/me/ to validate session and get user data
      const isValid = await this.validateSessionViaApi()

      if (isValid) {
        console.log('[SessionManager] ✅ Session rehydration successful')
        // CRITICAL FIX: Only use API user if it's valid and not null
        // Preserve existing login user if API user is null or invalid
        const apiUser = this.state.user
        const userToSet = (apiUser && apiUser !== null) ? apiUser : existingUser
        console.log('[SessionManager] 🔒 Final user decision:', userToSet ? 'from API' : 'preserved from login')
        this.setState({
          isAuthenticated: true,
          isLoading: false,
          user: userToSet,
          sessionValid: userToSet !== null, // sessionValid only true if user is present
        })
        return true
      } else {
        console.log('[SessionManager] ❌ Session validation failed')
        // CRITICAL FIX: If we had a user from login, preserve it even if /auth/me/ fails
        // This prevents blank feed after login due to /auth/me/ failure
        if (hadExistingUser) {
          console.log('[SessionManager] 🔒 Preserving login user despite /auth/me/ failure')
          this.setState({
            isAuthenticated: true,
            isLoading: false,
            user: existingUser,
            sessionValid: true,
          })
          return true
        }
        this.setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          sessionValid: false,
        })
        return false
      }
    } catch (error) {
      console.error('[SessionManager] ❌ Session rehydration error:', error)
      // CRITICAL FIX: If we had a user from login, preserve it even on error
      // This prevents blank feed after login due to network errors
      if (hadExistingUser) {
        console.log('[SessionManager] 🔒 Preserving login user despite error')
        this.setState({
          isAuthenticated: true,
          isLoading: false,
          user: existingUser,
          sessionValid: true,
        })
        return true
      }
      this.setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        sessionValid: false,
      })
      return false
    } finally {
      this.rehydratePromise = null
    }
  }

  /**
   * Boot session - Initialize authentication state (LEGACY)
   * This is kept for backward compatibility but routes should use rehydrate()
   * 
   * Phase 2.5: Enhanced flow - refresh token first, then validate via /auth/me/
   */
  async boot(): Promise<void> {
    // Prevent multiple boot calls
    if (this.bootPromise) {
      return this.bootPromise
    }

    this.bootPromise = this._boot()
    return this.bootPromise
  }

  /**
   * @deprecated _boot() method is unused. AuthProvider calls rehydrate() instead.
   * This method is kept for reference but should not be called.
   * Use rehydrate() for session validation on protected routes.
   */
  private async _boot(): Promise<void> {
    console.warn('[SessionManager] ⚠️ _boot() is deprecated. Use rehydrate() instead.')
    // This method is no longer used - rehydrate() is the correct flow
    // Kept for reference only to prevent breaking changes
  }

  /**
   * Login - Set session after successful authentication
   * This is the SINGLE entry point for login
   *
   * Phase 2: Only set access token (refresh token is in HttpOnly cookie)
   */
  login(user: any, accessToken: string): void {
    console.log('[SessionManager] 🔐 Logging in user:', user.username)
    // Phase 2: Only store access token in memory
    tokenManager.setAccessToken(accessToken)
    // Mark as fresh login (within last 5 seconds)
    this.freshLoginTimestamp = Date.now()
    // Set session state
    this.setState({
      isAuthenticated: true,
      isLoading: false,
      user,
      sessionValid: true, // sessionValid is true immediately after login
    })
  }

  /**
   * Logout - Clear session
   * This is the ONLY place where logout should be triggered
   * 
   * Phase 2: Clear memory token (refresh token cleared by backend via cookie delete)
   */
  async logout(): Promise<void> {
    console.log('[SessionManager] 🚪 Logging out...')
    this.notifyTabLogout()  // Notify other tabs
    this.freshLoginTimestamp = null  // Clear fresh login flag on logout
    this.setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      sessionValid: false,
    })
  }

  /**
   * Mark session as invalid due to auth failure
   * This is called when token refresh fails or tokens are invalid
   * Components should call this when they detect isAuthError from axios
   */
  async markSessionInvalid(): Promise<void> {
    console.log('[SessionManager] ⚠️ Session marked as invalid')
    // Only logout if we're currently authenticated
    if (this.state.isAuthenticated) {
      await this.logout()
    }
  }

  /**
   * Check if user is authenticated
   * This is the SINGLE source of truth for authentication state
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated
  }

  /**
   * Check if login was completed recently (within last 5 seconds)
   * This prevents unnecessary boot() calls immediately after login
   */
  isFreshLogin(): boolean {
    if (!this.freshLoginTimestamp) return false
    const now = Date.now()
    const timeSinceLogin = now - this.freshLoginTimestamp
    const FRESH_LOGIN_WINDOW = 5000 // 5 seconds
    return timeSinceLogin < FRESH_LOGIN_WINDOW
  }

  /**
   * Clear fresh login flag (called after first protected route load)
   */
  clearFreshLoginFlag(): void {
    this.freshLoginTimestamp = null
  }

  /**
   * Check if session is loading
   */
  isLoading(): boolean {
    return this.state.isLoading
  }

  /**
   * Get current user
   */
  getUser(): any | null {
    return this.state.user
  }

  /**
   * Initialize tab synchronization
   * Phase 2: Uses custom event instead of localStorage changes
   */
  private initTabSync(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('kiliLogout', () => {
      console.log('[SessionManager] 🔄 Logout event received, logging out...')
      this.setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        sessionValid: false,
      })
    })
  }

  /**
   * Notify other tabs of logout
   * Phase 2: Uses custom event instead of localStorage
   */
  private notifyTabLogout(): void {
    if (typeof window === 'undefined') return
    // Clear memory token
    tokenManager.clearTokens()
    // Dispatch custom event to other tabs
    window.dispatchEvent(new Event('kiliLogout'))
  }
}

// Export singleton instance
export const sessionManager = new SessionManager()
