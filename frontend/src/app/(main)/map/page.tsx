'use client'
import DynamicMap from '@/components/map/DynamicMap'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { Search, Layers, Crosshair, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { tipsService, type Tip } from '@/services/tips.service'
import { experiencesService, type Experience } from '@/services/experiences.service'
import { KiliBottomSheet } from '@/components/ui/KiliBottomSheet'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { TrustScoreRing } from '@/components/ui/TrustScoreRing'
import { KiliBadge } from '@/components/ui/KiliBadge'
import { mediaUrl, formatCount } from '@/lib/utils'

// ── Mapbox only client-side ─────────────────────────
type MapboxModule = typeof import('mapbox-gl') & { accessToken: string }
let mapboxgl: MapboxModule | null = null

const CATEGORY_COLORS: Record<string, string> = {
  SAFETY: '#FF2D2D',
  LIFESTYLE: '#F5A623',
  NAVIGATION: '#3B82F6',
  EXPERIENCE: '#10B981',
  ACCESSIBILITY: '#8B5CF6',
}

const EXP_CATEGORY_COLORS: Record<string, string> = {
  Safari: '#F5A623',
  Food: '#10B981',
  Culture: '#8B5CF6',
  Nightlife: '#FF2D2D',
  Beach: '#3B82F6',
  Adventure: '#F97316',
  Art: '#EC4899',
}

type SheetData =
  | { type: 'tip'; data: Tip }
  | { type: 'experience'; data: Experience }
  | null

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('mapbox-gl').Map | null>(null)
  const markersRef = useRef<import('mapbox-gl').Marker[]>([])

  const [layers, setLayers] = useState({
    tips: true,
    experiences: true,
  })
  const [search, setSearch] = useState('')
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null)
  const [sheetData, setSheetData] = useState<SheetData>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const { data: tips = [] } = useQuery({
    queryKey: ['tips'],
    queryFn: () => tipsService.getAll(),
    staleTime: 1000 * 60 * 5,
  })

  const { data: experiences = [] } = useQuery({
    queryKey: ['experiences'],
    queryFn: () => experiencesService.getAll(),
    staleTime: 1000 * 60 * 5,
  })

  // Init Mapbox
  useEffect(() => {
    import('mapbox-gl').then((mgl) => {
      const mapboxModule = (mgl as unknown as { default?: MapboxModule }).default ?? (mgl as unknown as MapboxModule)
      mapboxgl = mapboxModule

      const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      if (!accessToken) {
        throw new Error('Missing NEXT_PUBLIC_MAPBOX_TOKEN')
      }
      mapboxgl.accessToken = accessToken

      if (!mapContainer.current || mapRef.current) return

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [34.8888, -6.3728], // Tanzania center
        zoom: 6,
      })

      map.on('load', () => {
        setMapLoaded(true)

        // Custom map style
        if (map.getLayer?.('background')) {
          map.setPaintProperty?.('background', 'background-color', '#0A0A0F')
        }
      })

      mapRef.current = map

      return () => {
        map.remove()
        mapRef.current = null
      }
    })
  }, [])

  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords: [number, number] = [
          pos.coords.longitude, pos.coords.latitude,
        ]
        setUserCoords(coords)
      })
    }
  }, [])

  // Add user marker
  useEffect(() => {
    const map = mapRef.current
    const mapbox = mapboxgl
    if (!mapLoaded || !map || !userCoords || !mapbox) return

    const el = document.createElement('div')
    el.style.cssText = `
      width:18px;height:18px;border-radius:50%;
      background:#3B82F6;border:3px solid white;
      box-shadow:0 0 12px rgba(59,130,246,0.8);
    `

    new mapbox.Marker(el)
      .setLngLat(userCoords)
      .addTo(map)
  }, [mapLoaded, userCoords])

  // Add tip markers
  useEffect(() => {
    const map = mapRef.current
    const mapbox = mapboxgl
    if (!mapLoaded || !map || !mapbox || !layers.tips) {
      // Remove tip markers if layer off
      if (!layers.tips) {
        markersRef.current = markersRef.current.filter((m) => {
          const el = (m as unknown as { getElement: () => HTMLElement }).getElement()
          if (el.dataset.type === 'tip') { m.remove(); return false }
          return true
        })
      }
      return
    }

    tips.filter((t) => t.latitude && t.longitude).forEach((tip) => {
      const color = CATEGORY_COLORS[tip.category] || '#F5A623'
      const el = document.createElement('div')
      el.dataset.type = 'tip'
      el.style.cssText = `
        width:32px;height:32px;border-radius:50%;
        background:${color}22;border:2px solid ${color};
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;font-size:14px;
        box-shadow:0 0 10px ${color}44;
      `
      el.innerText = tip.category === 'SAFETY' ? '🛡️' :
        tip.category === 'LIFESTYLE' ? '✨' :
        tip.category === 'NAVIGATION' ? '🗺️' :
        tip.category === 'EXPERIENCE' ? '⭐' : '♿'

      el.addEventListener('click', () => setSheetData({ type: 'tip', data: tip }))

      const marker = new mapbox.Marker(el)
        .setLngLat([tip.longitude!, tip.latitude!])
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [mapLoaded, tips, layers.tips])

  // Add experience markers
  useEffect(() => {
    const map = mapRef.current
    const mapbox = mapboxgl
    if (!mapLoaded || !map || !mapbox || !layers.experiences) return

    experiences.filter((e) => e.latitude && e.longitude).forEach((exp) => {
      const color = EXP_CATEGORY_COLORS[exp.category] || '#F5A623'
      const el = document.createElement('div')
      el.dataset.type = 'experience'
      el.style.cssText = `
        width:36px;height:36px;border-radius:10px;
        background:${color}22;border:2px solid ${color};
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;font-size:16px;
        box-shadow:0 0 12px ${color}44;
      `
      el.innerText = '⭐'
      el.addEventListener('click', () =>
        setSheetData({ type: 'experience', data: exp })
      )

      const marker = new mapbox.Marker(el)
        .setLngLat([exp.longitude!, exp.latitude!])
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [mapLoaded, experiences, layers.experiences])

  // Fly to user
  const locateMe = () => {
    if (!mapRef.current || !userCoords) return
    mapRef.current.flyTo({
      center: userCoords, zoom: 14,
      duration: 1500, essential: true,
    })
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-black">
      {/* Map */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 px-4 pt-safe"
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
      >
        {/* Search */}
        <div className="glass rounded-2xl flex items-center gap-3 px-4 py-3 mb-3">
          <Search size={16} className="text-text-muted flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tafuta mahali Tanzania..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={14} className="text-text-muted" />
            </button>
          )}
        </div>

        {/* Layer toggles */}
        <div className="flex gap-2">
          {[
            { key: 'tips', label: 'Tips', emoji: '💡' },
            { key: 'experiences', label: 'Uzoefu', emoji: '⭐' },
          ].map(({ key, label, emoji }) => (
            <motion.button
              key={key}
              onClick={() =>
                setLayers((l) => ({ ...l, [key]: !l[key as keyof typeof l] }))
              }
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{
                background: layers[key as keyof typeof layers]
                  ? 'rgba(245,166,35,0.2)'
                  : 'rgba(10,10,15,0.8)',
                border: `1px solid ${
                  layers[key as keyof typeof layers]
                    ? 'rgba(245,166,35,0.5)'
                    : 'rgba(255,255,255,0.1)'
                }`,
                color: layers[key as keyof typeof layers]
                  ? '#F5A623'
                  : '#8B8BA7',
                backdropFilter: 'blur(10px)',
              }}
            >
              {emoji} {label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Locate me button */}
      <motion.button
        onClick={locateMe}
        whileTap={{ scale: 0.9 }}
        className="absolute bottom-28 right-4 z-10 w-12 h-12 rounded-2xl glass flex items-center justify-center shadow-gold"
      >
        <Crosshair size={20} className="text-gold" />
      </motion.button>

      {/* Stats */}
      <div className="absolute bottom-28 left-4 z-10">
        <div className="glass rounded-xl px-3 py-2 flex items-center gap-3 text-xs">
          <span className="text-gold font-bold">💡 {tips.length}</span>
          <span className="text-text-muted">|</span>
          <span className="text-gold font-bold">⭐ {experiences.length}</span>
        </div>
      </div>

      {/* Detail Sheets */}
      <KiliBottomSheet
        isOpen={!!sheetData}
        onClose={() => setSheetData(null)}
        height="60"
      >
        {sheetData?.type === 'tip' && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: `${CATEGORY_COLORS[sheetData.data.category]}20`,
                  color: CATEGORY_COLORS[sheetData.data.category],
                }}
              >
                {sheetData.data.category}
              </span>
              {sheetData.data.is_verified && (
                <span className="text-xs text-kili-green font-bold">
                  ✓ Imethibitishwa
                </span>
              )}
            </div>

            <h2 className="text-xl font-black text-text-primary mb-2">
              {sheetData.data.title}
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">
              {sheetData.data.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KiliAvatar
                  src={sheetData.data.creator_avatar}
                  name={sheetData.data.creator_username}
                  size="xs"
                />
                <span className="text-xs text-text-muted">
                  @{sheetData.data.creator_username}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <TrustScoreRing
                  score={sheetData.data.trust_score}
                  size="xs"
                />
                <span className="text-sm font-bold text-gold">
                  👍 {sheetData.data.upvotes}
                </span>
              </div>
            </div>
          </div>
        )}

        {sheetData?.type === 'experience' && (
          <div className="p-5">
            {sheetData.data.primary_image?.file_url && (
              <div className="w-full h-40 rounded-2xl overflow-hidden mb-4 bg-bg-elevated">
                <img
                  src={sheetData.data.primary_image.file_url}
                  alt={sheetData.data.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: `${EXP_CATEGORY_COLORS[sheetData.data.category]}20`,
                  color: EXP_CATEGORY_COLORS[sheetData.data.category],
                }}
              >
                {sheetData.data.category}
              </span>
              {sheetData.data.today_moment_active && (
                <span className="text-xs font-bold text-kili-green">
                  ⚡ Leo!
                </span>
              )}
            </div>

            <h2 className="text-xl font-black text-text-primary mb-1">
              {sheetData.data.title}
            </h2>
            <p className="text-text-muted text-xs mb-3">
              📍 {sheetData.data.location}
            </p>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">
              {sheetData.data.description.slice(0, 200)}...
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KiliAvatar
                  src={sheetData.data.guide_avatar}
                  name={sheetData.data.guide_username}
                  size="xs"
                />
                <div>
                  <p className="text-xs font-bold text-text-primary">
                    @{sheetData.data.guide_username}
                  </p>
                  <TrustScoreRing
                    score={sheetData.data.guide_trust}
                    size="xs"
                    showNumber={false}
                  />
                </div>
              </div>
              {sheetData.data.price_range && (
                <span className="text-gold font-bold text-sm">
                  {sheetData.data.price_range}
                </span>
              )}
            </div>
          </div>
        )}
      </KiliBottomSheet>
    </div>
  )
}