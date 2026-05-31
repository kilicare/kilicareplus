'use client'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Compass, Shield, MessageSquare, User, Grid, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui.store'
import { useMoreGridStore } from '@/stores/moreGrid.store'
import { useLongPress, useSwipeUp } from '@/hooks/useGestures'

const NAV = [
  { href: '/feed',     Icon: Home,          label: 'Feed',     id: 'feed'     },
  { href: '/discover', Icon: Compass,       label: 'Gundua',   id: 'discover' },
  { href: '/ai',       Icon: Bot,           label: 'AI Guide', id: 'ai'       },
  { href: '/sos',      Icon: Shield,        label: 'SOS',      id: 'sos', isSOS: true },
  { href: '/chat',     Icon: MessageSquare, label: 'Ujumbe',   id: 'chat'     },
  { href: '/profile',  Icon: User,          label: 'Mimi',     id: 'profile'  },
  { href: '/more',     Icon: Grid,          label: 'More',     id: 'more',   isMore: true },
]

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { notificationCount } = useUIStore()
  const { openMoreGrid } = useMoreGridStore()

  // Long press to open MoreGrid
  const longPressHandlers = useLongPress({
    duration: 500,
    onLongPress: () => openMoreGrid(),
  })

  // Swipe up to open MoreGrid
  const swipeUpHandlers = useSwipeUp({
    threshold: 50,
    onSwipeUp: () => openMoreGrid(),
  })

  return (
    <nav
      className={cn('fixed bottom-0 left-0 right-0 z-30', className)}
      style={{
        background: 'rgba(10,10,15,0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'var(--bottom-nav-height)',
      }}
      {...longPressHandlers}
      {...swipeUpHandlers}
    >
      <div className="flex items-center justify-around h-full px-1">
          {NAV.map(({ href, Icon, label, id, isSOS, isMore }) => {
          const active =
            pathname === href ||
            (href !== '/' && pathname.startsWith(href + '/'))
          const hasBadge = id === 'chat' && notificationCount > 0

          if (isSOS) {
            return (
              <motion.button
                key={id}
                onClick={() => router.push(href)}
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center -mt-5"
                aria-label="SOS Dharura"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #FF2D2D, #CC1A1A)',
                    boxShadow: '0 0 24px rgba(255,45,45,0.55)',
                  }}
                >
                  <Icon size={24} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-bold text-kili-red mt-1">
                  SOS
                </span>
              </motion.button>
            )
          }

          if (isMore) {
            return (
              <motion.button
                key={id}
                onClick={openMoreGrid}
                whileTap={{ scale: 0.9 }}
                className="relative flex flex-col items-center gap-1 px-3 py-2 min-w-[52px]"
                aria-label="More features"
              >
                <div className="relative">
                  <Icon
                    size={22}
                    strokeWidth={1.8}
                    style={{ color: 'var(--text-muted)' }}
                  />
                </div>
                <span className="text-[10px] font-medium text-text-disabled">
                  {label}
                </span>
              </motion.button>
            )
          }

          return (
            <motion.button
              key={id}
              onClick={() => router.push(href)}
              whileTap={{ scale: 0.9 }}
              className="relative flex flex-col items-center gap-1 px-3 py-2 min-w-[52px]"
              aria-label={label}
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}
                />
                {hasBadge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-kili-red flex items-center justify-center text-[9px] font-bold text-white">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? 'var(--gold)' : 'var(--text-disabled)' }}
              >
                {label}
              </span>
              <AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-gold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}