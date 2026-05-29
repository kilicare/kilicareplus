'use client'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/auth.store'
import { KiliBadge } from '@/components/ui/KiliBadge'

const STATUS = [
  { e: '✅', l: 'Auth', s: 'Kamili' },
  { e: '✅', l: 'Design System', s: 'Kamili' },
  { e: '✅', l: 'Navigation', s: 'Kamili' },
  { e: '✅', l: 'Passport API', s: 'Kamili' },
  { e: '⏳', l: 'Feed TikTok', s: 'Wiki 2' },
  { e: '⏳', l: 'AI Chat', s: 'Wiki 2' },
  { e: '⏳', l: 'Messaging', s: 'Wiki 3' },
  { e: '⏳', l: 'SOS System', s: 'Wiki 3' },
]

export default function FeedPage() {
  const { user } = useAuthStore()

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center pt-safe pb-safe px-5">
      <motion.div
        className="text-center max-w-sm w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <motion.div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black text-black mx-auto mb-6"
          style={{
            background: 'linear-gradient(135deg, #F5A623, #E8892A)',
            boxShadow: '0 0 40px rgba(245,166,35,0.4)',
          }}
          animate={{
            boxShadow: [
              '0 0 30px rgba(245,166,35,0.3)',
              '0 0 60px rgba(245,166,35,0.6)',
              '0 0 30px rgba(245,166,35,0.3)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          K
        </motion.div>

        <h1 className="text-2xl font-black text-text-primary mb-1">
          Karibu, {user?.first_name || user?.username}! 🌍
        </h1>

        <div className="flex items-center justify-center gap-2 mb-8">
          {user && <KiliBadge variant={user.role} size="sm" />}
          {user?.is_verified && (
            <KiliBadge variant="VERIFIED" size="sm" />
          )}
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-2 gap-2 text-left">
          {STATUS.map((item) => (
            <motion.div
              key={item.l}
              className="p-3 rounded-2xl border"
              style={{
                background: 'rgba(26,26,36,0.8)',
                borderColor: 'rgba(255,255,255,0.07)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
            >
              <span className="text-xl block mb-1">{item.e}</span>
              <p className="text-xs font-bold text-text-primary">
                {item.l}
              </p>
              <p
                className="text-[10px] mt-0.5"
                style={{
                  color:
                    item.e === '✅' ? '#10B981' : '#8B8BA7',
                }}
              >
                {item.s}
              </p>
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-text-muted mt-6">
          Kilicare+ v1.0 — Tanzania 🇹🇿
        </p>
      </motion.div>
    </div>
  )
}