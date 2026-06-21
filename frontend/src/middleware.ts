import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes zinazohitaji auth
const PROTECTED_PREFIXES = [
  '/feed',
  '/ai',
  '/chat',
  '/sos',
  '/map',
  '/discover',
  '/tips',
  '/passport',
  '/profile',
  '/notifications',
  '/subscribe',
  '/billing',
  '/bookings',
  '/predictions',
  '/showcase',
  '/experiences',
  '/creator',
  '/admin',
]

// Routes ambazo hazihitaji auth (public)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/otp',
  '/reset-password',
  '/offline',
  '/manifest.json',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files, API, icons
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/screenshots') ||
    pathname.startsWith('/landing') ||
    pathname.includes('.') // files (png, svg, etc)
  ) {
    return NextResponse.next()
  }

  // Check if route is protected
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  if (!isProtected) {
    return NextResponse.next()
  }

  // Middleware cannot access localStorage, so we skip server-side auth check
  // Auth is handled client-side via TokenManager and AuthProvider
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons|landing).*)',
  ],
}