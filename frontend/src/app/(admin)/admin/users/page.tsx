'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Shield, Ban, Award, MoreVertical } from 'lucide-react'
import api from '@/core/api/axios'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliBadge } from '@/components/ui/KiliBadge'
import { KiliButton } from '@/components/ui/KiliButton'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { KiliBottomSheet } from '@/components/ui/KiliBottomSheet'
import { formatCount, parseApiError } from '@/lib/utils'

interface AdminUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
  is_verified: boolean
  date_joined: string
  points: number
  trust_score: number
  level: string
  avatar: string | null
}

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [pointsToAward, setPointsToAward] = useState('')
  const [awardReason, setAwardReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, page],
    queryFn: async () => {
      const { data } = await api.get('/api/admin-ops/users/', {
        params: { search, role: roleFilter, page },
      })
      return data
    },
    staleTime: 1000 * 30,
  })

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      api.put(`/api/admin-ops/users/${id}/role/`, { role }),
    onSuccess: () => {
      toast.success('Role imebadilishwa!')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setSelectedUser(null)
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  const suspendMut = useMutation({
    mutationFn: (id: number) =>
      api.put(`/api/admin-ops/users/${id}/suspend/`),
    onSuccess: (res) => {
      toast.success(res.data.is_active ? 'Akaunti imewashwa' : 'Akaunti imesimamishwa')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setSelectedUser(null)
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  const awardMut = useMutation({
    mutationFn: ({ id, pts, reason }: { id: number; pts: number; reason: string }) =>
      api.post(`/api/admin-ops/users/${id}/points/`, {
        points: pts, reason,
      }),
    onSuccess: () => {
      toast.success('Pointi zimetolewa!')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setPointsToAward(''); setAwardReason('')
    },
    onError: (e) => toast.error(parseApiError(e)),
  })

  const users = data?.results || []

  return (
    <div className="min-h-dvh bg-bg-base pt-safe pb-safe overflow-y-auto no-scrollbar">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-black text-text-primary mb-1">
          👥 Usimamizi wa Watumiaji
        </h1>
        <p className="text-text-muted text-sm">
          {data?.count || 0} watumiaji
        </p>
      </div>

      {/* Filters */}
      <div className="px-5 mb-4 space-y-3">
        <div className="rounded-2xl flex items-center gap-3 px-4 py-3 relative overflow-hidden"
          style={{ background: 'rgba(26,26,36,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Search size={16} className="text-text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tafuta kwa jina, email..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none" />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['', 'TOURIST', 'LOCAL_GUIDE', 'ADMIN', 'B2B'].map((r, i) => (
            <motion.button key={r} onClick={() => setRoleFilter(r)}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold relative overflow-hidden"
              style={{
                background: roleFilter === r
                  ? 'rgba(245,166,35,0.15)' : 'rgba(26,26,36,0.6)',
                border: `1px solid ${roleFilter === r
                  ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.07)'}`,
                color: roleFilter === r ? '#F5A623' : '#8B8BA7',
              }}>
              {roleFilter === r && (
                <div className="absolute inset-0 opacity-20"
                  style={{ background: 'radial-gradient(circle, #F5A623, transparent)' }}
                />
              )}
              <span className="relative z-10">{r || 'Zote'}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Users list */}
      <div className="px-5 space-y-3 pb-8">
        {isLoading
          ? [0,1,2,3].map((i: number) => <SkeletonCard key={i} className="h-24" rounded="xl" />)
          : users.map((u: AdminUser, i: number) => (
              <motion.div key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-4 cursor-pointer relative overflow-hidden"
                style={{ background:'rgba(26,26,36,0.9)',
                         border:'1px solid rgba(255,255,255,0.07)' }}
                whileHover={{ scale: 1.01, borderColor: 'rgba(245,166,35,0.2)' }}
                whileTap={{ scale:0.99 }}
                onClick={() => setSelectedUser(u)}>
                <div className="flex items-center gap-3">
                  <KiliAvatar src={u.avatar} name={u.username}
                    role={u.role as 'TOURIST' | 'LOCAL_GUIDE' | 'ADMIN' | 'B2B'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-text-primary">
                        {u.first_name} {u.last_name}
                      </p>
                      {!u.is_active && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-kili-red/20 text-kili-red font-bold">
                          SUSPENDED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">@{u.username}</p>
                  </div>
                  <div className="text-right">
                    <KiliBadge variant={u.role as 'TOURIST' | 'LOCAL_GUIDE' | 'ADMIN' | 'B2B'} size="xs" />
                    <p className="text-xs text-gold font-bold mt-0.5">
                      {formatCount(u.points)} pts
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
        }

        {/* Pagination */}
        {data?.has_next && (
          <KiliButton variant="ghost" fullWidth onClick={() => setPage((p) => p + 1)}>
            Pakia zaidi
          </KiliButton>
        )}
      </div>

      {/* User action sheet */}
      <KiliBottomSheet isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={`👤 ${selectedUser?.username || ''}`}
        height={80 as any}>
        {selectedUser && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl relative overflow-hidden"
              style={{ background:'rgba(26,26,36,0.8)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-20"
                style={{ background: 'radial-gradient(circle, #F5A623, transparent)' }}
              />
              <KiliAvatar src={selectedUser.avatar}
                name={selectedUser.username} size="lg" />
              <div className="relative z-10">
                <p className="font-black text-text-primary">
                  {selectedUser.first_name} {selectedUser.last_name}
                </p>
                <p className="text-xs text-text-muted mb-1">
                  @{selectedUser.username}
                </p>
                <p className="text-xs text-text-muted">
                  {selectedUser.email}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gold font-bold">
                    {formatCount(selectedUser.points)} pts
                  </span>
                  <span className="text-xs text-text-muted">
                    · {selectedUser.level}
                  </span>
                </div>
              </div>
            </div>

            {/* Change role */}
            <div>
              <p className="text-sm font-bold text-text-secondary mb-2">
                Badilisha Role
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['TOURIST','LOCAL_GUIDE','ADMIN','B2B'].map((r) => (
                  <KiliButton key={r} size="xs"
                    variant={selectedUser.role === r ? 'outline' : 'ghost'}
                    disabled={selectedUser.role === r}
                    onClick={() => roleMut.mutate({ id: selectedUser.id, role: r })}>
                    {r === 'LOCAL_GUIDE' ? 'Guide' : r}
                  </KiliButton>
                ))}
              </div>
            </div>

            {/* Award points */}
            <div>
              <p className="text-sm font-bold text-text-secondary mb-2">
                Toa Pointi
              </p>
              <input type="number" value={pointsToAward}
                onChange={(e) => setPointsToAward(e.target.value)}
                placeholder="Idadi ya pointi"
                className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-gold mb-2" />
              <input value={awardReason}
                onChange={(e) => setAwardReason(e.target.value)}
                placeholder="Sababu (optional)"
                className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-gold mb-2" />
              <KiliButton size="sm" fullWidth
                disabled={!pointsToAward}
                loading={awardMut.isPending}
                onClick={() => awardMut.mutate({
                  id: selectedUser.id,
                  pts: parseInt(pointsToAward),
                  reason: awardReason || 'Admin award',
                })}
                icon={<Award size={14} />}>
                Toa Pointi
              </KiliButton>
            </div>

            {/* Suspend */}
            <KiliButton
              variant={selectedUser.is_active ? 'danger' : 'success'}
              fullWidth
              loading={suspendMut.isPending}
              onClick={() => suspendMut.mutate(selectedUser.id)}
              icon={<Ban size={14} />}>
              {selectedUser.is_active ? 'Simamisha Akaunti' : 'Washa Akaunti'}
            </KiliButton>
          </div>
        )}
      </KiliBottomSheet>
    </div>
  )
}