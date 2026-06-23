'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Home,
  Compass,
  Shield,
  MessageSquare,
  User,
  Lightbulb,
  Award,
  Bell,
  Store,
  TrendingUp,
  BarChart2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bot,
  Map,
  Activity,
  AlertTriangle,
  Layout,
  Star,
  CreditCard,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import { performLogout } from '@/core/auth/logout'
import { authService } from '@/services/auth.service'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliBadge } from '@/components/ui/KiliBadge'
import { useUIStore } from '@/stores/ui.store'

const MAIN = [
  { href: '/feed', Icon: Home, label: 'Feed' },
  { href: '/discover', Icon: Compass, label: 'Gundua' },
  { href: '/ai', Icon: Bot, label: 'AI Guide' },
  { href: '/chat', Icon: MessageSquare, label: 'Ujumbe' },
  { href: '/map', Icon: Map, label: 'Ramani' },
  { href: '/tips', Icon: Lightbulb, label: 'Vidokezo' },
  { href: '/subscribe', Icon: Shield, label: 'Panda Kiwango' },
  { href: '/passport', Icon: Award, label: 'Passport' },
  { href: '/notifications', Icon: Bell, label: 'Arifa', isBell: true },
]

const CREATOR = [
  { href: '/dashboard', Icon: BarChart2, label: 'Dashboard' },
  { href: '/showcase', Icon: Store, label: 'Showcase' },
  { href: '/analytics', Icon: TrendingUp, label: 'Analytics' },
  { href: '/predictions', Icon: TrendingUp, label: 'Predictions' },
]

const ADMIN = [
  { href: '/admin/dashboard', Icon: Activity, label: 'Admin Dashboard' },
  { href: '/admin/payments', Icon: CreditCard, label: 'Payments' },
  { href: '/admin/users', Icon: User, label: 'User Management' },
  { href: '/admin/moderation', Icon: Shield, label: 'Moderation' },
  { href: '/admin/sos-monitor', Icon: AlertTriangle, label: 'SOS Monitor' },
  { href: '/admin/landing-page', Icon: Layout, label: 'Landing Page' },
  { href: '/admin/testimonials', Icon: Star, label: 'Testimonials' },
  { href: '/admin/b2b', Icon: Store, label: 'B2B Portal' },
]

export function Sidebar({
  className,
  collapsed = false,
  toggleCollapsed,
}: {
  className?: string
  collapsed?: boolean
  toggleCollapsed?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { sessionValid, user } = useSession()
  const { notificationCount } = useUIStore()

  const isGuide = sessionValid && user?.role === 'LOCAL_GUIDE'
  const isAdmin = sessionValid && user?.role === 'ADMIN'

  function NavItem({
    href,
    Icon,
    label,
    isBell,
  }: {
    href: string
    Icon?: any
    label: string
    isBell?: boolean
  }) {
    const active =
      pathname === href || (href !== '/' && pathname.startsWith(href + '/'))

    return (
      <Link href={href} title={label}>
        <motion.div
          initial={false}
          whileTap={{ scale: 0.97 }}
          style={{ background: 'transparent' }}
          className={cn(
            'flex items-center gap-3 py-2.5 rounded-xl transition-all relative',
            collapsed ? 'justify-center px-2' : 'px-3',
            active
              ? 'bg-gold/10 text-gold'
              : 'text-text-muted hover:text-text-primary hover:bg-white/5'
          )}
        >
          {/* ICON */}
          <div className="w-5 flex items-center justify-center">
            {Icon && (
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
            )}
          </div>

          {/* LABEL */}
          {!collapsed && (
            <span className="text-sm font-medium">{label}</span>
          )}

          {/* NOTIFICATION */}
          {isBell && notificationCount > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}

          {/* ACTIVE INDICATOR */}
          {active && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gold rounded-r-full"
            />
          )}
        </motion.div>
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-dvh transition-[width] duration-300 ease-in-out',
        className
      )}
      style={{
        width: collapsed ? '72px' : '280px',
        background: '#0D0D14',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* LOGO */}
      <div className="px-4 py-5 flex items-center justify-between">
        <Link href="/feed" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-r from-yellow-400 to-yellow-600">
            <img
              src="/icon-192.png"
              alt="Kilicare+"
              className="w-full h-full object-cover"
            />
          </div>

          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-white">Kilicare+</p>
              <p className="text-[10px] text-gray-400">Tanzania 🇹🇿</p>
            </div>
          )}
        </Link>

        {/* COLLAPSE BUTTON */}
        {toggleCollapsed && (
          <button
            onClick={toggleCollapsed}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5"
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-1">
        {MAIN.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        {(isGuide || isAdmin) && (
          <>
            {!collapsed && (
              <p className="text-[10px] px-3 pt-4 pb-2 text-gray-500 uppercase">
                Creator
              </p>
            )}

            {CREATOR.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </>
        )}

        {isAdmin && (
          <>
            {!collapsed && (
              <p className="text-[10px] px-3 pt-4 pb-2 text-gray-500 uppercase">
                Admin
              </p>
            )}

            {ADMIN.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* USER */}
      <div className="p-3 border-t border-white/10">
        {user && (
          <div
            onClick={() => router.push('/profile')}
            className={cn(
              'flex items-center rounded-xl cursor-pointer hover:bg-white/5 transition',
              collapsed ? 'justify-center p-2' : 'gap-3 p-2'
            )}
          >
            <KiliAvatar
              src={user.profile?.avatar_url}
              name={user.first_name || user.username}
              role={user.role}
              isVerified={user.is_verified}
              size="sm"
            />

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user.first_name || user.username}
                </p>
                <KiliBadge variant={user.role} size="xs" />
              </div>
            )}

            {!collapsed && (
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  await authService.logout()
                  performLogout()
                  router.push('/login')
                }}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}