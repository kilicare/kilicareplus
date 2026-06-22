/**
 * SessionManager - SaaS-Grade Session Management
 * 
 * Single source of truth for authentication state.
 * All authentication logic MUST go through this manager.
 * 
 * Responsibilities:
 * - Token reading and validation
 * - Expiry checking
 * - Automatic token refresh
 * - Session state management
 * - Expose isAuthenticated state
 * 
 * BOOT FLOW:
 * App start → SessionManager.boot() → validate token locally → refresh if needed → set session state → background /me sync
 */

import { tokenManager } from './TokenManager'

interface SessionState {
  isAuthenticated: boolean
  isLoading: boolean
  user: any | null
}

class SessionManager {
  private state: SessionState = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
  }

  private listeners: Set<(state: SessionState) => void> = new Set()
  private bootPromise: Promise<void> | null = null

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
   * Check if access token is valid (not expired)
   * Returns true if token exists and has more than 60 seconds remaining
   */
  private isTokenValid(): boolean {
    return tokenManager.isTokenValid()
  }

  /**
   * Refresh access token if possible
   * Returns true if refresh was successful, false otherwise
   */
  private async refreshToken(): Promise<boolean> {
    try {
      const success = await tokenManager.refreshIfPossible()
      if (success) {
        console.log('[SessionManager] ✅ Token refreshed successfully')
      }
      return success
    } catch (error) {
      console.error('[SessionManager] ❌ Token refresh failed:', error)
      return false
    }
  }

  /**
   * Validate token locally (Layer 1 - Fast)
   * Checks token presence and expiry without API call
   */
  private validateTokenLocally(): boolean {
    const token = tokenManager.getAccessToken()
    if (!token) {
      console.log('[SessionManager] No token found')
      return false
    }

    if (!this.isTokenValid()) {
      console.log('[SessionManager] Token expired')
      return false
    }

    console.log('[SessionManager] ✅ Token valid locally')
    return true
  }

  /**
   * Refresh token if needed (Layer 2 - Safe)
   * Attempts refresh if token is expired
   */
  private async refreshTokenIfNeeded(): Promise<boolean> {
    const token = tokenManager.getAccessToken()
    if (!token) {
      return false
    }

    if (this.isTokenValid()) {
      // Token still valid, no refresh needed
      return true
    }

    console.log('[SessionManager] Token expired, attempting refresh...')
    const refreshSuccess = await this.refreshToken()
    return refreshSuccess
  }

  /**
   * Boot session - Initialize authentication state
   * This is the SINGLE entry point for session initialization
   */
  async boot(): Promise<void> {
    // Prevent multiple boot calls
    if (this.bootPromise) {
      return this.bootPromise
    }

    this.bootPromise = this._boot()
    return this.bootPromise
  }

  private async _boot(): Promise<void> {
    console.log('[SessionManager] 🚀 BOOT START')
    console.log('[SessionManager] STEP 0: localStorage snapshot', {
      access: typeof window !== 'undefined' ? localStorage.getItem('kili_access_token')?.substring(0, 20) + '...' : 'N/A',
      refresh: typeof window !== 'undefined' ? localStorage.getItem('kili_refresh_token')?.substring(0, 20) + '...' : 'N/A',
    })
    
    console.log('[SessionManager] 🧠 SESSION BOOT START')
    this.setState({ isLoading: true })

    // Initialize tab synchronization
    this.initTabSync()

    try {
      console.log('[SessionManager] 1. Reading tokens...')
      const accessToken = tokenManager.getAccessToken()
      const refreshToken = tokenManager.getRefreshToken()
      console.log('[SessionManager] access:', accessToken ? accessToken.substring(0, 20) + '...' : 'null')
      console.log('[SessionManager] refresh:', refreshToken ? refreshToken.substring(0, 20) + '...' : 'null')
      
      console.log('[SessionManager] 2. Local validation result:', this.isTokenValid())
      
      console.log('[SessionManager] 3. Setting initial auth state BEFORE API:', {
        isAuthenticated: this.state.isAuthenticated,
        isLoading: this.state.isLoading,
        hasUser: !!this.state.user,
      })
      
      // Layer 1: Fast - Check token locally
      const tokenValid = this.validateTokenLocally()
      
      if (!tokenValid) {
        console.log('[SessionManager] 4. Token invalid, attempting refresh...')
        // Layer 2: Safe - Attempt refresh
        const refreshSuccess = await this.refreshTokenIfNeeded()

        console.log('[SessionManager] 5. Refresh result:', refreshSuccess)

        if (!refreshSuccess) {
          // Refresh failed - check if access token is still valid before logging out
          console.log('[SessionManager] ⚠️ Refresh failed, checking access token validity...')
          const accessTokenStillValid = this.validateTokenLocally()

          if (accessTokenStillValid) {
            // Access token still valid - continue session using it
            console.log('[SessionManager] ✅ Access token still valid, continuing session')
            // Retry /me in background with existing token
            this.enrichUserProfile().catch(error => {
              console.warn('[SessionManager] /me retry failed (session still valid):', error)
            })
          } else {
            // Both refresh failed AND access token is invalid - logout
            console.log('[SessionManager] ❌ Session boot failed - no valid token')
            this.setState({
              isAuthenticated: false,
              isLoading: false,
              user: null,
            })
            return
          }
        }
      }

      // Token is valid (either original or refreshed)
      console.log('[SessionManager] ✅ Session boot successful')
      console.log('[SessionManager] 6. Final auth state:', {
        isAuthenticated: true,
        isLoading: false,
        hasUser: !!this.state.user,
      })
      
      this.setState({
        isAuthenticated: true,
        isLoading: false,
        user: null, // Will be enriched by /me in background
      })

      // Background: Enrich user profile via /me (optional, non-blocking)
      this.enrichUserProfile().catch(error => {
        console.warn('[SessionManager] User profile enrichment failed (non-critical):', error)
      })

    } catch (error) {
      console.error('[SessionManager] ❌ Session boot error:', error)
      this.setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      })
    } finally {
      this.bootPromise = null
    }
  }

  /**
   * Enrich user profile via /me endpoint (background, non-blocking)
   * This is OPTIONAL - authentication state is already set by token validation
   */
  private async enrichUserProfile(): Promise<void> {
    try {
      // Import authService dynamically to avoid circular dependency
      const { authService } = await import('@/services/auth.service')
      const user = await authService.getMe()
      console.log('[SessionManager] ✅ User profile enriched')
      this.setState({ user })
    } catch (error: any) {
      // If /me fails, we still have valid session (token-based)
      // This is the KEY difference from fragile architecture
      console.warn('[SessionManager] ⚠️ /me enrichment failed (session still valid):', error.message)
      // Do NOT clear tokens or set isAuthenticated=false
    }
  }

  /**
   * Login - Set session after successful authentication
   * This is the SINGLE entry point for login
   * @param user - User object from backend
   * @param accessToken - JWT access token
   * @param refreshToken - JWT refresh token
   */
  login(user: any, accessToken: string, refreshToken: string): void {
    console.log('[SessionManager] 🔐 Logging in user:', user.username)
    // Store tokens via TokenManager
    tokenManager.setTokens(accessToken, refreshToken)
    // Set session state
    this.setState({
      isAuthenticated: true,
      isLoading: false,
      user,
    })
  }

  /**
   * Logout - Clear session
   * This is the ONLY place where logout should be triggered
   */
  async logout(): Promise<void> {
    console.log('[SessionManager] 🚪 Logging out...')
    this.notifyTabLogout()  // Notify other tabs
    this.setState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
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
   * Listens for localStorage changes to sync logout across tabs
   */
  private initTabSync(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('storage', (event) => {
      // Check if tokens were cleared in another tab
      if (event.key === 'kili_access_token' && event.newValue === null) {
        console.log('[SessionManager] 🔄 Tokens cleared in another tab, logging out...')
        this.setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        })
      }
    })
  }

  /**
   * Notify other tabs of logout
   */
  private notifyTabLogout(): void {
    if (typeof window === 'undefined') return
    // Clear tokens triggers storage event in other tabs
    tokenManager.clearTokens()
  }
}

// Export singleton instance
export const sessionManager = new SessionManager()
