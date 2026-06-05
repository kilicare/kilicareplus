'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { CheckCircle, Trash2, EyeOff, Star, Eye } from 'lucide-react'
import api from '@/core/api/axios'
import { KiliButton } from '@/components/ui/KiliButton'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { parseApiError } from '@/lib/utils'

export default function ModerationPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'moments'|'tips'>('moments')

  const { data: moments = [], isLoading: mLoading } = useQuery({
    queryKey: ['admin-moments'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin-ops/moderation/moments/')
      return data
    },
    staleTime: 1000 * 30,
    enabled: activeTab === 'moments',
  })

  const { data: tips = [], isLoading: tLoading } = useQuery({
    queryKey: ['admin-tips'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin-ops/moderation/tips/')
      return data
    },
    staleTime: 1000 * 30,
    enabled: activeTab === 'tips',
  })

  const momentMut = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) =>
      api.put(`/api/admin-ops/moderation/moments/${id}/`, { action }),
    onSuccess: (_, vars) => {
      toast.success(`Moment: ${vars.action}`)
      qc.invalidateQueries({ queryKey: ['admin-moments'] })
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  const tipMut = useMutation({
    mutationFn: (id: number) =>
      api.put(`/api/admin-ops/moderation/tips/${id}/verify/`),
    onSuccess: () => {
      toast.success('Tip imethibitishwa! ✅')
      qc.invalidateQueries({ queryKey: ['admin-tips'] })
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  return (
    <div className="min-h-dvh bg-bg-base pt-safe pb-safe overflow-y-auto no-scrollbar">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-black text-text-primary">
          🔍 Moderation
        </h1>
      </div>

      <div className="flex gap-2 px-5 mb-5">
        {(['moments','tips'] as const).map((tab, i) => (
          <motion.button key={tab} onClick={() => setActiveTab(tab)}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 rounded-xl text-sm font-bold relative overflow-hidden"
            style={{
              background: activeTab===tab ? 'rgba(245,166,35,0.15)' : 'rgba(26,26,36,0.6)',
              border:`1px solid ${activeTab===tab ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.07)'}`,
              color: activeTab===tab ? '#F5A623' : '#8B8BA7',
            }}>
            {activeTab===tab && (
              <div className="absolute inset-0 opacity-20"
                style={{ background: 'radial-gradient(circle, #F5A623, transparent)' }}
              />
            )}
            <span className="relative z-10">{tab === 'moments' ? '📸 Moments' : '💡 Tips'}</span>
          </motion.button>
        ))}
      </div>

      <div className="px-5 space-y-4 pb-8">
        {activeTab === 'moments' && (
          mLoading ? <SkeletonCard className="h-40" rounded="xl" /> :
          moments.length === 0 ? <EmptyState icon="✅" title="Hakuna moments za kupitiwa" /> :
          moments.map((m: {
            id: number; posted_by: string; caption: string | null;
            media_url: string | null; media_type: string; views: number
          }, i: number) => (
            <motion.div key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl overflow-hidden relative"
              style={{ background:'rgba(26,26,36,0.9)', border:'1px solid rgba(255,255,255,0.07)' }}>
              {m.media_url && m.media_type === 'image' && (
                <img src={m.media_url} alt="" className="w-full h-40 object-cover" />
              )}
              <div className="p-4">
                <p className="text-xs text-text-muted mb-1">@{m.posted_by}</p>
                {m.caption && (
                  <p className="text-sm text-text-primary mb-3 line-clamp-2">{m.caption}</p>
                )}
                <p className="text-xs text-text-muted mb-3">👁️ {m.views} maoni</p>
                <div className="flex gap-2">
                  <KiliButton size="xs" variant="ghost"
                    onClick={() => momentMut.mutate({ id: m.id, action: 'feature' })}
                    icon={<Star size={12} />}>
                    Feature
                  </KiliButton>
                  <KiliButton size="xs" variant="ghost"
                    onClick={() => momentMut.mutate({ id: m.id, action: 'hide' })}
                    icon={<EyeOff size={12} />}>
                    Ficha
                  </KiliButton>
                  <KiliButton size="xs" variant="danger"
                    onClick={() => {
                      if (confirm('Futa moment hii?'))
                        momentMut.mutate({ id: m.id, action: 'delete' })
                    }}
                    icon={<Trash2 size={12} />}>
                    Futa
                  </KiliButton>
                </div>
              </div>
            </motion.div>
          ))
        )}

        {activeTab === 'tips' && (
          tLoading ? <SkeletonCard className="h-40" rounded="xl" /> :
          tips.length === 0 ? <EmptyState icon="✅" title="Hakuna tips za kuthibitisha" /> :
          tips.map((t: {
            id: number; title: string; description: string;
            category: string; creator: string; upvotes: number
          }, i: number) => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{ background:'rgba(26,26,36,0.9)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background:'rgba(245,166,35,0.15)', color:'#F5A623' }}>
                  {t.category}
                </span>
                <span className="text-xs text-text-muted">👍 {t.upvotes}</span>
              </div>
              <p className="text-sm font-bold text-text-primary mb-1">{t.title}</p>
              <p className="text-xs text-text-muted mb-1 line-clamp-2">{t.description}</p>
              <p className="text-[10px] text-text-muted mb-3">na @{t.creator}</p>
              <KiliButton size="xs" fullWidth
                loading={tipMut.isPending}
                onClick={() => tipMut.mutate(t.id)}
                icon={<CheckCircle size={12} />}>
                Thibitisha Tip
              </KiliButton>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}