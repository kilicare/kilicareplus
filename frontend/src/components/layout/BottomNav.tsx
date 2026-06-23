'use client'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Compass, Shield, MessageSquare, User, Grid, Bot, TrendingUp, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui.store'
import { useMoreGridStore } from '@/stores/moreGrid.store'
import { useLongPress, useSwipeUp } from '@/hooks/useGestures'
import { useSession } from '@/hooks/useSession'

// Color mapping for each nav item
const ICON_COLORS: { [key: string]: { base: string; active: string; glow: string } } = {
  feed: { base: '#A1A1AA', active: '#D4AF37', glow: 'rgba(212, 175, 55, 0.4)' },
  discover: { base: '#A1A1AA', active: '#00D4FF', glow: 'rgba(0, 212, 255, 0.4)' },
  ai: { base: '#A1A1AA', active: '#FF6B9D', glow: 'rgba(255, 107, 157, 0.4)' },
  chat: { base: '#A1A1AA', active: '#A78BFA', glow: 'rgba(167, 139, 250, 0.4)' },
  notifications: { base: '#A1A1AA', active: '#FF6B9D', glow: 'rgba(255, 107, 157, 0.4)' },
  profile: { base: '#A1A1AA', active: '#FFA500', glow: 'rgba(255, 165, 0, 0.4)' },
  more: { base: '#A1A1AA', active: '#64B5F6', glow: 'rgba(100, 181, 246, 0.4)' },
}

const NAV = [
  { href: '/feed',     Icon: Home,          label: 'Home',        id: 'feed' },
  { href: '/discover', Icon: Compass,       label: 'Explore',     id: 'discover' },
  { href: '/ai',       Icon: Bot,           label: 'AI',          id: 'ai' },
  { href: '/sos',      Icon: Shield,        label: 'SOS',         id: 'sos', isSOS: true },
  { href: '/chat',     Icon: MessageSquare, label: 'Chats',       id: 'chat', isChat: true },
  { href: '/notifications', Icon: Bell,     label: 'Alerts',     id: 'notifications', isNotifications: true },
  { href: '/profile',  Icon: User,          label: 'Profile',     id: 'profile' },
  { href: '/more',     Icon: Grid,          label: 'More',        id: 'more', isMore: true },
]

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { notificationCount } = useUIStore()
  const { openMoreGrid } = useMoreGridStore()
  const { user, sessionValid } = useSession()

  // Check if user is LOCAL_GUIDE, TOURIST, or ADMIN - hide notifications and chat for these roles
  const shouldHideNavItems = sessionValid && user && (user.role === 'LOCAL_GUIDE' || user.role === 'TOURIST' || user.role === 'ADMIN')

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
          {NAV.filter(({ isNotifications, isChat }) => 
            !((isNotifications || isChat) && shouldHideNavItems)
          ).map(({ href, Icon, label, id, isSOS, isMore, isNotifications }) => {
          const active =
            pathname === href ||
            (href !== '/' && pathname.startsWith(href + '/'))
          const hasBadge = isNotifications && notificationCount > 0
          const colors = ICON_COLORS[id] || ICON_COLORS.feed

          if (isSOS) {
            return (
              <motion.button
                key={id}
                onClick={() => router.push(href)}
                whileTap={{ scale: 0.88 }}
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center -mt-5 relative group"
                aria-label="SOS Dharura"
              >
                {/* Glow on hover */}
                <motion.div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,45,45,0.6), transparent)',
                    width: '60px',
                    height: '60px',
                    top: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                />
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center relative z-10 border border-red-400/30 group-hover:border-red-300/60 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #FF2D2D, #CC1A1A)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 0 20px rgba(255,45,45,0.4)',
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
                whileTap={{ scale: 0.88 }}
                whileHover={{ y: -4 }}
                className="relative flex flex-col items-center gap-1 px-3 py-2 min-w-[56px] group"
                aria-label="More features"
              >
                {/* Glow background */}
                <motion.div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-lg"
                  style={{
                    background: `radial-gradient(circle, ${colors.glow}, transparent)`,
                    top: '-8px',
                  }}
                />
                <div className="relative">
                  <Icon
                    size={22}
                    strokeWidth={1.8}
                    style={{ color: colors.base }}
                    className="transition-all group-hover:scale-110 group-hover:drop-shadow-lg"
                  />
                </div>
                <span className="text-[10px] font-medium text-text-disabled group-hover:text-white/80 transition-colors">
                  {label}
                </span>
              </motion.button>
            )
          }

          if (isNotifications) {
            return (
              <motion.button
                key={id}
                onClick={() => router.push(href)}
                whileTap={{ scale: 0.88 }}
                whileHover={{ y: -4 }}
                className="relative flex flex-col items-center gap-1 px-3 py-2 min-w-[56px] group"
                aria-label={label}
              >
                {/* Glow background on active/hover */}
                <motion.div
                  animate={{ 
                    opacity: active ? 1 : 0,
                    scale: active ? 1 : 0.8,
                  }}
                  className="absolute inset-0 rounded-xl transition-all blur-lg"
                  style={{
                    background: `radial-gradient(circle, ${colors.glow}, transparent)`,
                    top: '-8px',
                  }}
                />

                {/* Icon container */}
                <div className="relative">
                  <motion.div
                    animate={{
                      background: active 
                        ? `radial-gradient(circle at 30% 30%, ${colors.active}20, transparent)` 
                        : 'transparent',
                    }}
                    className="absolute inset-0 rounded-lg transition-all"
                    style={{
                      width: '40px',
                      height: '40px',
                      top: '-9px',
                      left: '-9px',
                    }}
                  />
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.5 : 1.8}
                    style={{ color: active ? colors.active : colors.base }}
                    className={cn(
                      'relative z-10 transition-all duration-200',
                      active && 'filter drop-shadow-lg'
                    )}
                  />
                  {hasBadge && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-kili-red to-red-600 flex items-center justify-center text-[9px] font-bold text-white shadow-lg"
                    >
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </motion.span>
                  )}
                </div>

                {/* Label */}
                <motion.span
                  animate={{
                    color: active ? colors.active : '#9CA3AF',
                    textShadow: active ? `0 0 8px ${colors.active}40` : 'none',
                  }}
                  className="text-[10px] font-medium transition-colors duration-200"
                >
                  {label}
                </motion.span>

                {/* Active indicator */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      className="absolute -bottom-1.5 h-1 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${colors.active}, transparent)`,
                        width: '24px',
                      }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      exit={{ scaleX: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            )
          }

          return (
            <motion.button
              key={id}
              onClick={() => router.push(href)}
              whileTap={{ scale: 0.88 }}
              whileHover={{ y: -4 }}
              className="relative flex flex-col items-center gap-1 px-3 py-2 min-w-[56px] group"
              aria-label={label}
            >
              {/* Glow background on active/hover */}
              <motion.div
                animate={{ 
                  opacity: active ? 1 : 0,
                  scale: active ? 1 : 0.8,
                }}
                className="absolute inset-0 rounded-xl transition-all blur-lg"
                style={{
                  background: `radial-gradient(circle, ${colors.glow}, transparent)`,
                  top: '-8px',
                }}
              />

              {/* Icon container */}
              <div className="relative">
                <motion.div
                  animate={{
                    background: active 
                      ? `radial-gradient(circle at 30% 30%, ${colors.active}20, transparent)` 
                      : 'transparent',
                  }}
                  className="absolute inset-0 rounded-lg transition-all"
                  style={{
                    width: '40px',
                    height: '40px',
                    top: '-9px',
                    left: '-9px',
                  }}
                />
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  style={{ color: active ? colors.active : colors.base }}
                  className={cn(
                    'relative z-10 transition-all duration-200',
                    active && 'filter drop-shadow-lg'
                  )}
                />
              </div>

              {/* Label */}
              <motion.span
                animate={{
                  color: active ? colors.active : '#9CA3AF',
                  textShadow: active ? `0 0 8px ${colors.active}40` : 'none',
                }}
                className="text-[10px] font-medium transition-colors duration-200"
              >
                {label}
              </motion.span>

              {/* Active indicator */}
              <AnimatePresence>
                {active && (
                  <motion.div
                    className="absolute -bottom-1.5 h-1 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${colors.active}, transparent)`,
                      width: '24px',
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    exit={{ scaleX: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 40 }}
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