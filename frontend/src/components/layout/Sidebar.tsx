'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Home, Compass, Shield, MessageSquare, User,
  Lightbulb, Award, Bell, Store, TrendingUp,
  BarChart2, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { KiliAvatar } from '@/components/ui/KiliAvatar'
import { KiliBadge } from '@/components/ui/KiliBadge'
import { useUIStore } from '@/stores/ui.store'

const MAIN = [
  { href: '/feed',         Icon: Home,          label: 'Feed' },
  { href: '/discover',     Icon: Compass,       label: 'Gundua' },
  { href: '/ai',           emoji: '🤖',         label: 'AI Guide' },
  { href: '/chat',         Icon: MessageSquare, label: 'Ujumbe' },
  { href: '/map',          emoji: '🗺️',         label: 'Ramani' },
  { href: '/tips',         Icon: Lightbulb,     label: 'Vidokezo' },
  { href: '/passport',     Icon: Award,         label: 'Passport' },
  { href: '/notifications',Icon: Bell,          label: 'Arifa', isBell: true },
]

const CREATOR = [
  { href: '/creator/dashboard', Icon: BarChart2,  label: 'Dashboard' },
  { href: '/showcase',          Icon: Store,      label: 'Showcase' },
  { href: '/predictions',       Icon: TrendingUp, label: 'Predictions' },
]

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { notificationCount } = useUIStore()

  const isGuide = user?.role === 'LOCAL_GUIDE'
  const isAdmin = user?.role === 'ADMIN'

  function NavItem({
    href, Icon, emoji, label, isBell,
  }: {
    href: string
    Icon?: React.ComponentType<{ size: number; strokeWidth: number }>
    emoji?: string
    label: string
    isBell?: boolean
  }) {
    const active =
      pathname === href ||
      (href !== '/' && pathname.startsWith(href + '/'))
    return (
      <Link href={href}>
        <motion.div
          whileTap={{ scale: 0.97 }}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative',
            active
              ? 'bg-gold/8 text-gold'
              : 'text-text-muted hover:text-text-primary hover:bg-white/4'
          )}
        >
          <div className="w-5 flex-shrink-0 flex items-center justify-center">
            {emoji ? (
              <span className="text-lg leading-none">{emoji}</span>
            ) : Icon ? (
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
            ) : null}
          </div>
          <span className="text-sm font-medium">{label}</span>
          {isBell && notificationCount > 0 && (
            <span className="ml-auto bg-kili-red text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
          {active && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gold rounded-r-full"
            />
          )}
        </motion.div>
      </Link>
    )
  }

  return (
    <aside
      className={cn('flex flex-col h-dvh', className)}
      style={{
        width: 'var(--sidebar-width)',
        background: '#0D0D14',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="px-4 py-5 flex-shrink-0">
        <Link href="/feed" className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black text-black flex-shrink-0"
            style={{ background: 'var(--gradient-gold)' }}
          >
            K
          </div>
          <div>
            <p className="text-sm font-black text-text-primary leading-tight">
              Kilicare+
            </p>
            <p className="text-[10px] text-text-muted">Tanzania 🇹🇿</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-4 no-scrollbar">
        {MAIN.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
        {(isGuide || isAdmin) && (
          <>
            <div className="pt-3 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-disabled px-3">
                Creator
              </p>
            </div>
            {CREATOR.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </>
        )}
        {isAdmin && (
          <>
            <div className="pt-3 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-disabled px-3">
                Admin
              </p>
            </div>
            <NavItem href="/admin/users" Icon={User} label="Users" />
            <NavItem href="/admin/sos-monitor" Icon={Shield} label="SOS Monitor" />
          </>
        )}
      </nav>

      {/* User card */}
      <div
        className="flex-shrink-0 p-3 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {user && (
          <div
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/4 transition-colors cursor-pointer"
            onClick={() => router.push('/profile')}
          >
            <KiliAvatar
              src={user.profile?.avatar_url}
              name={`${user.first_name} ${user.last_name}`}
              role={user.role}
              isVerified={user.is_verified}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">
                {user.first_name || user.username}
              </p>
              <KiliBadge variant={user.role} size="xs" />
            </div>
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                logout()
                router.push('/login')
              }}
              whileTap={{ scale: 0.9 }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-kili-red hover:bg-kili-red/10 transition-colors"
            >
              <LogOut size={14} />
            </motion.button>
          </div>
        )}
      </div>
    </aside>
  )
}