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

  // Check auth token from cookie (set during login)
  const token = request.cookies.get('kili_access')?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons|landing).*)',
  ],
}