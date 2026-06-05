/**
 * Safe API Wrapper
 * 
 * Provides safe API calls that never crash the UI.
 * All API calls are wrapped in try/catch with safe fallbacks.
 */

interface SafeApiOptions {
  fallback?: any
  onError?: (error: any) => void
}

/**
 * Safe API call wrapper
 * 
 * Wraps any async function with try/catch and safe fallback.
 * Never crashes the UI, always returns a result or fallback.
 */
export async function safeApiCall<T>(
  fn: () => Promise<T>,
  options: SafeApiOptions = {}
): Promise<T> {
  const { fallback, onError } = options

  try {
    return await fn()
  } catch (error: any) {
    console.error('[SafeAPI] Error in API call:', error)

    // Call error handler if provided
    if (onError) {
      onError(error)
    }

    // Return fallback if provided
    if (fallback !== undefined) {
      return fallback as T
    }

    // Re-throw with safe error message
    throw new Error(error?.message || 'An error occurred')
  }
}

/**
 * Safe API call with default fallback
 * 
 * Similar to safeApiCall but always returns a value (never throws).
 */
export async function safeApiCallWithFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  onError?: (error: any) => void
): Promise<T> {
  return safeApiCall(fn, { fallback, onError })
}

/**
 * Safe API call with null fallback
 * 
 * Returns null on error instead of throwing.
 */
export async function safeApiCallOrNull<T>(
  fn: () => Promise<T>,
  onError?: (error: any) => void
): Promise<T | null> {
  return safeApiCallWithFallback(fn, null, onError)
}

/**
 * Safe API call with empty array fallback
 * 
 * Returns empty array on error instead of throwing.
 */
export async function safeApiCallOrEmpty<T>(
  fn: () => Promise<T[]>,
  onError?: (error: any) => void
): Promise<T[]> {
  return safeApiCallWithFallback(fn, [], onError)
}
