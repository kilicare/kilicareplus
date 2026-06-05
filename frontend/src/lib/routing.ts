/**
 * CENTRALIZED ROUTING RESOLVER
 * 
 * This enforces the SINGLE FEED ARCHITECTURE:
 * - ALL users redirect to /feed after login
 * - NO role-based routing at the navigation level
 * - Role-based UI branching happens INSIDE /feed page only
 */

export function resolvePostLoginRoute(user?: { role?: string } | null): string {
  // SINGLE DESTINATION FOR ALL ROLES
  // Role-based UI branching happens inside /feed page
  return '/feed'
}
