'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ChevronLeft, Plus } from 'lucide-react'
import { experiencesService } from '@/services/experiences.service'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliButton } from '@/components/ui/KiliButton'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export default function ExperiencesListPage() {
  const router = useRouter()
  const [category, setCategory] = useState<string>('')

  const { data: experiences = [], isLoading } = useQuery({
    queryKey: ['experiences', category],
    queryFn: () => experiencesService.getAll(category || undefined),
    staleTime: 1000 * 60 * 5,
  })

  const categories = [
    'Adventure', 'Safari', 'Food', 'Culture', 
    'Nightlife', 'Beach', 'Art'
  ]

  return (
    <div className="min-h-dvh bg-bg-base overflow-y-auto no-scrollbar pb-safe">
      {/* Header */}
      <div className="sticky top-0 bg-bg-base border-b border-border-subtle z-10 px-5 py-4 flex items-center justify-between">
        <motion.button
          onClick={() => router.back()}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft size={24} className="text-text-primary" />
        </motion.button>
        <h1 className="text-xl font-black text-text-primary">
          ⭐ Uzoefu Zote
        </h1>
        <Link href="/experiences/new">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="p-2"
          >
            <Plus size={24} className="text-gold" />
          </motion.button>
        </Link>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Category Filter */}
        <div>
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
            Kategoria
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <motion.button
              onClick={() => setCategory('')}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition"
              style={{
                background: !category ? 'var(--gradient-gold)' : 'rgba(255,255,255,0.08)',
                color: !category ? 'black' : 'var(--text-primary)',
              }}
            >
              Zote
            </motion.button>
            {categories.map((cat) => (
              <motion.button
                key={cat}
                onClick={() => setCategory(cat)}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition"
                style={{
                  background: category === cat ? 'var(--gradient-gold)' : 'rgba(255,255,255,0.08)',
                  color: category === cat ? 'black' : 'var(--text-primary)',
                }}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Experiences Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} className="h-56" rounded="xl" />
            ))}
          </div>
        ) : experiences.length === 0 ? (
          <EmptyState
            icon="⭐"
            title="Hakuna uzoefu"
            subtitle="Hakuna uzoefu unapatikana kwa kategoria hii"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {experiences.map((exp) => (
              <Link key={exp.id} href={`/experiences/${exp.id}`}>
                <motion.div
                  className="rounded-3xl overflow-hidden cursor-pointer"
                  style={{
                    background: 'rgba(26,26,36,0.8)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Image */}
                  {exp.primary_image?.file_url ? (
                    <img
                      src={exp.primary_image.file_url}
                      alt={exp.title}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-gold/10 to-bg-base flex items-center justify-center text-5xl">
                      ⭐
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    {/* Guide */}
                    <div className="flex items-center gap-2">
                      <KiliAvatar
                        src={exp.guide_avatar}
                        name={exp.guide_username}
                        size="sm"
                      />
                      <div>
                        <p className="text-xs font-bold text-text-primary">
                          @{exp.guide_username}
                        </p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gold">
                            ⭐ {exp.guide_trust.toFixed(1)}
                          </span>
                          {exp.guide_verified && (
                            <span className="text-xs text-kili-green">✓</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <p className="text-sm font-black text-text-primary line-clamp-2">
                        {exp.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                        <span>📍 {exp.location}</span>
                        <span>•</span>
                        <span>{exp.category}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border-subtle">
                      <span>👁️ {exp.views.toLocaleString()} views</span>
                      {exp.price_min && (
                        <span className="text-gold font-bold">
                          {formatCurrency(exp.price_min)}+
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
