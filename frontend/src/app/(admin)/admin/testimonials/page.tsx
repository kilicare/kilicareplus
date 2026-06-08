'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, Save, Loader2, ArrowLeft, ExternalLink, Star } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return (window as any).NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  }
  return (globalThis as any).process?.env?.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
}

interface Testimonial {
  id: number
  name: string
  role: string
  avatar_letter: string
  color: string
  rating: number
  text: string
  location: string
  profile_url: string
  is_featured: boolean
  display_order: number
  created_at: string
  updated_at: string
}

interface FormData {
  name: string
  role: string
  avatar_letter: string
  color: string
  rating: number
  text: string
  location: string
  profile_url: string
  is_featured: boolean
  display_order: number
}

export default function TestimonialsAdmin() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    role: '',
    avatar_letter: '',
    color: '#F5A623',
    rating: 5,
    text: '',
    location: '',
    profile_url: '',
    is_featured: true,
    display_order: 0,
  })

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      router.push('/feed')
      return
    }

    fetchTestimonials()
  }, [isAuthenticated, user, router])

  async function fetchTestimonials() {
    try {
      const token = localStorage.getItem('kili_access_token')
      const response = await fetch(`${getApiUrl()}/api/admin-ops/testimonials/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setTestimonials(data)
      }
    } catch (error) {
      console.error('Failed to fetch testimonials:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const token = localStorage.getItem('kili_access_token')
      const url = editingId
        ? `${getApiUrl()}/api/admin-ops/testimonials/${editingId}/`
        : `${getApiUrl()}/api/admin-ops/testimonials/`

      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchTestimonials()
        resetForm()
        console.log('✅ Testimonial saved successfully')
      } else {
        console.error('❌ Failed to save testimonial')
      }
    } catch (error) {
      console.error('❌ Failed to save testimonial:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(testimonial: Testimonial) {
    setEditingId(testimonial.id)
    setFormData({
      name: testimonial.name,
      role: testimonial.role,
      avatar_letter: testimonial.avatar_letter,
      color: testimonial.color,
      rating: testimonial.rating,
      text: testimonial.text,
      location: testimonial.location,
      profile_url: testimonial.profile_url,
      is_featured: testimonial.is_featured,
      display_order: testimonial.display_order,
    })
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this testimonial?')) return

    try {
      const token = localStorage.getItem('kili_access_token')
      const response = await fetch(`${getApiUrl()}/api/admin-ops/testimonials/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchTestimonials()
        console.log('✅ Testimonial deleted successfully')
      } else {
        console.error('❌ Failed to delete testimonial')
      }
    } catch (error) {
      console.error('❌ Failed to delete testimonial:', error)
    }
  }

  function resetForm() {
    setEditingId(null)
    setFormData({
      name: '',
      role: '',
      avatar_letter: '',
      color: '#F5A623',
      rating: 5,
      text: '',
      location: '',
      profile_url: '',
      is_featured: true,
      display_order: 0,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-base">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    )
  }

  const COLORS = ['#F5A623', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B']

  return (
    <div className="min-h-screen bg-bg-base p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <ArrowLeft className="w-6 h-6 text-white/60 hover:text-white" />
            </Link>
            <h1 className="text-2xl font-black text-white">Manage Testimonials</h1>
          </div>
          <button
            onClick={resetForm}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-black font-black hover:scale-105 transition-transform"
          >
            <Plus size={18} />
            Add New
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <motion.div
            className="bg-bg-surface rounded-2xl p-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-lg font-black text-white mb-6">
              {editingId ? 'Edit Testimonial' : 'Add New Testimonial'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    if (!formData.avatar_letter) {
                      setFormData({ ...formData, avatar_letter: e.target.value[0] || '' })
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-bg-base border border-white/10 text-white focus:border-gold focus:outline-none"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/60 mb-2">Role *</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-bg-base border border-white/10 text-white focus:border-gold focus:outline-none"
                  placeholder="e.g., Travel Blogger, Local Guide"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2">Avatar Letter</label>
                  <input
                    type="text"
                    value={formData.avatar_letter}
                    onChange={(e) => setFormData({ ...formData, avatar_letter: e.target.value[0] || '' })}
                    maxLength={1}
                    className="w-full px-4 py-3 rounded-xl bg-bg-base border border-white/10 text-white focus:border-gold focus:outline-none text-center"
                    placeholder="S"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2">Rating</label>
                  <select
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl bg-bg-base border border-white/10 text-white focus:border-gold focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{'★'.repeat(n)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/60 mb-2">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${
                        formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-surface' : ''
                      }`}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/60 mb-2">Location *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-bg-base border border-white/10 text-white focus:border-gold focus:outline-none"
                  placeholder="e.g., Kilimanjaro Trek"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/60 mb-2">Testimonial Text *</label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-bg-base border border-white/10 text-white focus:border-gold focus:outline-none resize-none"
                  placeholder="Review text..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/60 mb-2">Profile URL (Optional)</label>
                <input
                  type="url"
                  value={formData.profile_url}
                  onChange={(e) => setFormData({ ...formData, profile_url: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-bg-base border border-white/10 text-white focus:border-gold focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl bg-bg-base border border-white/10 text-white focus:border-gold focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-sm text-white/60">Featured on Landing Page</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name || !formData.text}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold text-black font-black hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {editingId ? 'Update' : 'Save'}
                </button>
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="px-6 py-3 rounded-xl bg-white/10 text-white font-black hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* List */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-lg font-black text-white mb-4">All Testimonials ({testimonials.length})</h2>

            {testimonials.map((testimonial) => (
              <motion.div
                key={testimonial.id}
                className="bg-bg-surface rounded-2xl p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-black"
                      style={{ background: testimonial.color }}
                    >
                      {testimonial.avatar_letter}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{testimonial.name}</p>
                      <p className="text-xs text-white/60">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!testimonial.is_featured && (
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-white/10 text-white/60">Hidden</span>
                    )}
                    <button
                      onClick={() => handleEdit(testimonial)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Edit size={16} className="text-white/60" />
                    </button>
                    <button
                      onClick={() => handleDelete(testimonial.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-white/70 mb-3 line-clamp-2">"{testimonial.text}"</p>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-gold">
                      <Star size={12} fill="currentColor" />
                      {testimonial.rating}
                    </span>
                    <span className="text-white/50">📍 {testimonial.location}</span>
                  </div>
                  <span className="text-white/40">Order: {testimonial.display_order}</span>
                </div>

                {testimonial.profile_url && (
                  <a
                    href={testimonial.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-gold mt-2 hover:underline"
                  >
                    <ExternalLink size={12} />
                    Profile Link
                  </a>
                )}
              </motion.div>
            ))}

            {testimonials.length === 0 && (
              <div className="text-center py-12 text-white/40">
                No testimonials yet. Add your first one!
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
