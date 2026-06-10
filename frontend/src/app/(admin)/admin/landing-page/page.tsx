'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, X, Save, Loader2, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ConfigService } from '@/services/config.service'
import { apiClient } from '@/lib/apiClient'
import { ENDPOINTS } from '@/lib/endpoints'

const getCloudinaryCloudName = () => {
  if (typeof window !== 'undefined') {
    return (window as any).NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''
  }
  return (globalThis as any).process?.env?.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''
}

export default function LandingPageAdmin() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    cta_background_image: '',
    stats_background_image: '',
    features_background_image: '',
    testimonials_background_image: '',
    kilicarebet_background_image: '',
    pricing_background_image: '',
    download_background_image: '',
    serengeti_image: '',
    zanzibar_image: '',
    ngorongoro_image: '',
  })

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      router.push('/feed')
      return
    }

    fetchConfig()
  }, [isAuthenticated, user, router])

  async function fetchConfig() {
    try {
      const data = await ConfigService.getLandingPageConfig()
      setConfig(data)
    } catch (error) {
      console.error('Failed to fetch config:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await apiClient.put(ENDPOINTS.ADMIN_LANDING_PAGE_UPDATE, config)
      console.log('✅ Landing page configuration saved successfully')
      console.log('Updated at:', new Date().toISOString())
    } catch (error) {
      console.error('❌ Failed to save config:', error)
    } finally {
      setSaving(false)
    }
  }

  function handleImageUpload(field: string, url: string) {
    setConfig(prev => ({ ...prev, [field]: url }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-base">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary mb-4">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black text-text-primary mb-2">
              Landing Page Configuration
            </h1>
            <p className="text-text-secondary">
              Manage images for the landing page
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Hero Background */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-surface border border-border-subtle rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-text-primary mb-4">
              Hero Background Image
            </h2>
            <ImageUploader
              currentImage={config.cta_background_image}
              onImageUpload={(url) => handleImageUpload('cta_background_image', url)}
              label="Upload Hero Background"
            />
          </motion.div>

          {/* Stats Background */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-bg-surface border border-border-subtle rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-text-primary mb-4">
              Stats Background Image
            </h2>
            <ImageUploader
              currentImage={config.stats_background_image}
              onImageUpload={(url) => handleImageUpload('stats_background_image', url)}
              label="Upload Stats Background"
            />
          </motion.div>

          {/* Features Background */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-bg-surface border border-border-subtle rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-text-primary mb-4">
              Features Background Image
            </h2>
            <ImageUploader
              currentImage={config.features_background_image}
              onImageUpload={(url) => handleImageUpload('features_background_image', url)}
              label="Upload Features Background"
            />
          </motion.div>

          {/* Testimonials Background */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-bg-surface border border-border-subtle rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-text-primary mb-4">
              Testimonials Background Image
            </h2>
            <ImageUploader
              currentImage={config.testimonials_background_image}
              onImageUpload={(url) => handleImageUpload('testimonials_background_image', url)}
              label="Upload Testimonials Background"
            />
          </motion.div>

          {/* KilicareBet Background */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-bg-surface border border-border-subtle rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-text-primary mb-4">
              KilicareBet Preview Background Image
            </h2>
            <ImageUploader
              currentImage={config.kilicarebet_background_image}
              onImageUpload={(url) => handleImageUpload('kilicarebet_background_image', url)}
              label="Upload KilicareBet Background"
            />
          </motion.div>

          {/* Pricing Background */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-bg-surface border border-border-subtle rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-text-primary mb-4">
              Pricing Background Image
            </h2>
            <ImageUploader
              currentImage={config.pricing_background_image}
              onImageUpload={(url) => handleImageUpload('pricing_background_image', url)}
              label="Upload Pricing Background"
            />
          </motion.div>

          {/* Download Background */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-bg-surface border border-border-subtle rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-text-primary mb-4">
              Download Background Image
            </h2>
            <ImageUploader
              currentImage={config.download_background_image}
              onImageUpload={(url) => handleImageUpload('download_background_image', url)}
              label="Upload Download Background"
            />
          </motion.div>

          {/* Experience Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-bg-surface border border-border-subtle rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-text-primary mb-4">
              Experience Card Images
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <ImageUploader
                currentImage={config.serengeti_image}
                onImageUpload={(url) => handleImageUpload('serengeti_image', url)}
                label="Serengeti Safari"
              />
              <ImageUploader
                currentImage={config.zanzibar_image}
                onImageUpload={(url) => handleImageUpload('zanzibar_image', url)}
                label="Zanzibar Beach"
              />
              <ImageUploader
                currentImage={config.ngorongoro_image}
                onImageUpload={(url) => handleImageUpload('ngorongoro_image', url)}
                label="Ngorongoro Crater"
              />
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 rounded-2xl bg-gradient-gold text-black font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save Configuration
              </>
            )}
          </motion.button>
        </div>

        {/* Cloudinary Instructions */}
        <div className="mt-8 p-6 bg-gold/10 border border-gold/30 rounded-2xl">
          <h3 className="text-lg font-bold text-gold mb-2">
            Cloudinary Configuration
          </h3>
          <p className="text-sm text-text-muted mb-4">
            Add your Cloudinary credentials to frontend/.env.local:
          </p>
          <pre className="text-xs text-text-secondary bg-black/30 p-4 rounded-xl overflow-x-auto">
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
NEXT_PUBLIC_CLOUDINARY_API_SECRET=your_api_secret
          </pre>
        </div>
      </div>
    </div>
  )
}

function ImageUploader({ currentImage, onImageUpload, label }: { currentImage: string; onImageUpload: (url: string) => void; label: string }) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const accessToken = localStorage.getItem('kili_access_token')
      if (!accessToken) {
        alert('Authentication required')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin-ops/landing-page/upload-image/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Upload error:', data)
        alert(`Upload failed: ${data.error || 'Unknown error'}`)
        return
      }
      
      if (data.secure_url) {
        setPreview(data.secure_url)
        onImageUpload(data.secure_url)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onImageUpload('')
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-text-primary mb-2">
        {label}
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id={`upload-${label}`}
      />
      
      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt={label}
            className="w-full h-48 object-cover rounded-xl"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label
          htmlFor={`upload-${label}`}
          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border-subtle rounded-xl cursor-pointer hover:border-gold/50 transition-colors bg-white/5"
        >
          {isUploading ? (
            <div className="text-center">
              <Loader2 size={24} className="animate-spin text-gold mx-auto mb-2" />
              <p className="text-sm text-text-muted">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload size={32} className="text-text-muted mb-2" />
              <p className="text-sm text-text-muted">{label}</p>
              <p className="text-xs text-text-disabled mt-1">Click to upload</p>
            </>
          )}
        </label>
      )}
    </div>
  )
}
