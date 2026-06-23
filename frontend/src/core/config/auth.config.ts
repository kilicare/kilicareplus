/**
 * Authentication Configuration
 * 
 * Controls hybrid auth system behavior during Phase 2 migration.
 * Allows safe rollback if issues arise.
 */

export const AUTH_CONFIG = {
  // Phase 1: Backend now sets refresh token in HttpOnly cookie
  // Phase 2: Frontend switches to memory-only access tokens
  // This flag enables the new hybrid auth system
  USE_HYBRID_AUTH: true,
}
