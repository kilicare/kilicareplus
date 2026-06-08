import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/Providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'KilicareGO+ — Tanzania\'s First Tourism Super-App',
    template: '%s | KilicareGO+',
  },
  description:
    'Tanzania\'s first all-in-one tourism platform. Connect with 350+ verified local guides, explore Serengeti, Zanzibar, Kilimanjaro, and more. Book experiences, chat with AI guide, and stay safe with SOS.',
  keywords: [
    'Tanzania tourism', 'Kilimanjaro', 'Serengeti', 'Zanzibar',
    'Africa travel', 'local guides Tanzania', 'Tanzania safari',
    'East Africa tourism', 'Tanzania app', 'tour guide app',
    'KilicareGO', 'kilicarego plus', 'Tanzania experiences',
    'Dar es Salaam', 'Arusha', 'Ngorongoro',
  ],
  authors:   [{ name: 'KilicareGO+ Team', url: 'https://kilicarego.com' }],
  creator:   'KilicareGO+',
  publisher: 'KilicareGO+',
  manifest:  '/manifest.json',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  ),
  alternates: {
    canonical: '/',
    languages: {
      'sw': '/sw',
      'en': '/en',
    },
  },
  openGraph: {
    type:        'website',
    locale:      'sw_TZ',
    url:         '/',
    title:       'KilicareGO+ — Tanzania\'s First Tourism Super-App',
    description: 'Explore Tanzania with 350+ verified guides. Safari, Beach, Culture, AI Guide, SOS Safety & more.',
    siteName:    'KilicareGO+',
    images: [{
      url:    '/og-image.png',
      width:  1200,
      height: 630,
      alt:    'KilicareGO+ — Tanzania Tourism Super-App',
    }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'KilicareGO+ — Tanzania\'s First Tourism Super-App',
    description: 'Explore Tanzania with AI-powered local guides. #Tanzania #Safari #Kilimanjaro',
    images:      ['/og-image.png'],
    creator:     '@kilicarego',
  },
  robots: {
    index:            true,
    follow:           true,
    googleBot: {
      index:         true,
      follow:        true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet':  -1,
    },
  },
  icons: {
    icon:     [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple:    [{ url: '/icons/icon-192x192.png' }],
    shortcut: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'black-translucent',
    title:           'KilicareGO+',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
  },
}

export const viewport: Viewport = {
  width:          'device-width',
  initialScale:   1,
  maximumScale:   5,
  themeColor:     '#F5A623',
  viewportFit:    'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sw" className={inter.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <meta name="mobile-web-app-capable"            content="yes" />
        <meta name="apple-mobile-web-app-capable"      content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title"        content="KilicareGO+" />
        <link rel="apple-touch-icon"                   href="/icons/icon-192x192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type':    'SoftwareApplication',
              name:       'KilicareGO+',
              applicationCategory: 'TravelApplication',
              operatingSystem: 'Android, iOS, Web',
              description: "Tanzania's First Tourism Super-App",
              offers: {
                '@type': 'Offer',
                price:   '0',
                priceCurrency: 'TZS',
              },
              aggregateRating: {
                '@type':       'AggregateRating',
                ratingValue:   '4.8',
                ratingCount:   '1247',
              },
              author: {
                '@type': 'Organization',
                name:    'KilicareGO+',
                url:     'https://kilicarego.com',
              },
            }),
          }}
        />
      </head>
      <body className="bg-bg-base text-text-primary antialiased overscroll-none">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}