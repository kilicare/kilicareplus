import { useEffect, useState } from 'react'

interface LandingPageConfig {
  cta_background_image: string
  serengeti_image: string
  kilimanjaro_image: string
  zanzibar_image: string
  ngorongoro_image: string
  updated_at: string
}

export function useLandingPageConfig() {
  const [config, setConfig] = useState<LandingPageConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin-ops/landing-page/config/`)
        if (response.ok) {
          const data = await response.json()
          setConfig(data)
        }
      } catch (error) {
        console.error('Failed to fetch landing page config:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  return { config, loading }
}
