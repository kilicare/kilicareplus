'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, Upload, X } from 'lucide-react'
import { experiencesService } from '@/services/experiences.service'
import { KiliButton } from '@/components/ui/KiliButton'
import { KiliInput } from '@/components/ui/KiliInput'
import { parseApiError } from '@/lib/utils'

export default function CreateExperiencePage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Adventure',
    location: '',
    price_min: '',
    price_max: '',
  })
  const [media, setMedia] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  const categories = [
    'Adventure', 'Safari', 'Food', 'Culture', 
    'Nightlife', 'Beach', 'Art'
  ]

  const createMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('description', form.description)
      fd.append('category', form.category)
      fd.append('location', form.location)
      if (form.price_min) fd.append('price_min', form.price_min)
      if (form.price_max) fd.append('price_max', form.price_max)
      
      media.forEach((file) => {
        fd.append('media', file)
      })

      return experiencesService.create(fd)
    },
    onSuccess: (exp) => {
      toast.success('Uzoefu imeundwa! ⭐')
      qc.invalidateQueries({ queryKey: ['my-experiences'] })
      router.push(`/experiences/${exp.id}`)
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  const handleAddMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const url = URL.createObjectURL(file)
      setMedia((m) => [...m, file])
      setPreviews((p) => [...p, url])
    })
  }

  const handleRemoveMedia = (idx: number) => {
    URL.revokeObjectURL(previews[idx])
    setMedia((m) => m.filter((_, i) => i !== idx))
    setPreviews((p) => p.filter((_, i) => i !== idx))
  }

  const isValid = form.title && form.description && form.location && media.length > 0

  return (
    <div className="min-h-dvh bg-bg-base overflow-y-auto no-scrollbar pb-safe">
      {/* Header */}
      <div className="sticky top-0 bg-bg-base border-b border-border-subtle z-10 px-5 py-4 flex items-center gap-3">
        <motion.button
          onClick={() => router.back()}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft size={24} className="text-text-primary" />
        </motion.button>
        <h1 className="text-xl font-black text-text-primary">
          ⭐ Ongeza Uzoefu Mpya
        </h1>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Title */}
        <KiliInput
          label="Jina la Uzoefu"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Mf. Safari ya Kilimanjaro"
        />

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1.5">
            Maelezo
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Simulia uzoefu huu kwa kina..."
            rows={4}
            className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold resize-none"
          />
          <p className="text-[10px] text-text-muted text-right mt-1">
            {form.description.length}/500
          </p>
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1.5">
            Kategoria
          </label>
          <select
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-gold"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <KiliInput
          label="Mahali"
          value={form.location}
          onChange={(e) =>
            setForm((f) => ({ ...f, location: e.target.value }))
          }
          placeholder="Mf. Arusha, Tanzania"
        />

        {/* Price Range */}
        <div className="grid grid-cols-2 gap-3">
          <KiliInput
            label="Bei ya Chini (TZS)"
            type="number"
            value={form.price_min}
            onChange={(e) =>
              setForm((f) => ({ ...f, price_min: e.target.value }))
            }
            placeholder="50000"
          />
          <KiliInput
            label="Bei ya Juu (TZS)"
            type="number"
            value={form.price_max}
            onChange={(e) =>
              setForm((f) => ({ ...f, price_max: e.target.value }))
            }
            placeholder="150000"
          />
        </div>

        {/* Media Upload */}
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-3">
            Picha za Uzoefu ({media.length})
          </label>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {previews.map((url, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden">
                  <img
                    src={url}
                    alt={`preview-${idx}`}
                    className="w-full h-32 object-cover"
                  />
                  <motion.button
                    onClick={() => handleRemoveMedia(idx)}
                    whileTap={{ scale: 0.9 }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-kili-red flex items-center justify-center"
                  >
                    <X size={14} className="text-white" />
                  </motion.button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Area */}
          <motion.label
            className="block rounded-2xl border-2 border-dashed border-border-subtle p-6 text-center cursor-pointer hover:border-gold transition"
            whileHover={{ scale: 1.02 }}
          >
            <Upload size={32} className="mx-auto mb-2 text-text-muted" />
            <p className="text-sm font-bold text-text-primary mb-1">
              Jaza picha
            </p>
            <p className="text-xs text-text-muted">
              Kunjua hapa au bonyeza kumfungua faili
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleAddMedia}
              className="hidden"
            />
          </motion.label>
        </div>

        {/* Submit */}
        <KiliButton
          fullWidth
          size="lg"
          loading={createMut.isPending}
          disabled={!isValid}
          onClick={() => createMut.mutate()}
        >
          Ongeza Uzoefu
        </KiliButton>
      </div>
    </div>
  )
}
