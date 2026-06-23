import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function mediaUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://'))
    return path
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) {
    throw new Error('❌ Missing NEXT_PUBLIC_API_URL environment variable')
  }
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

export function timeAgo(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  )
  if (diff < 60) return 'Sasa hivi'
  if (diff < 3600) return `Dakika ${Math.floor(diff / 60)} zilizopita`
  if (diff < 86400) return `Saa ${Math.floor(diff / 3600)} zilizopita`
  if (diff < 604800)
    return `Siku ${Math.floor(diff / 86400)} zilizopita`
  return new Date(dateStr).toLocaleDateString('sw-TZ', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function formatCurrency(amount: number, currency = 'TZS'): string {
  if (currency === 'TZS') return `TZS ${amount.toLocaleString('sw-TZ')}`
  return `$${amount.toFixed(2)}`
}

export function parseApiError(error: unknown): string {
  const err = error as {
    response?: { data?: { message?: string } }
    message?: string
    isNetworkError?: boolean
    isServerError?: boolean
    isTimeout?: boolean
  }
  
  // Handle specific error types from axios interceptor
  if (err?.isNetworkError) {
    return 'Network error. Please check your connection.'
  }
  
  if (err?.isServerError) {
    return 'Server error. Please try again later.'
  }
  
  if (err?.isTimeout) {
    return 'Request timeout. Please try again.'
  }
  
  // Extract backend message if available
  if (err?.response?.data?.message) {
    return err.response.data.message
  }
  
  // Fallback to error message if available
  if (err?.message) {
    return err.message
  }
  
  // Final fallback - English only
  return 'An error occurred. Please try again.'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('')
}

export function vibrate(pattern: number | number[]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}