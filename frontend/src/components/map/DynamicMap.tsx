'use client'
import dynamic from 'next/dynamic'
import { SkeletonCard } from '@/components/ui/SkeletonCard'

// Mapbox — NO SSR (browser only!)
const MapPageClient = dynamic(
  () => import('@/app/(main)/map/page'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-dvh bg-black flex items-center justify-center">
        <SkeletonCard className="w-full h-full" rounded="sm" />
      </div>
    ),
  }
)

export default MapPageClient