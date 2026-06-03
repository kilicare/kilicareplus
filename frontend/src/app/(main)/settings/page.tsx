'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Lock, Eye, Palette, Globe, LogOut, HelpCircle, Info,
  ChevronRight, ToggleLeft, Sun, Moon, Volume2, Zap, Shield, Smartphone,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

interface SettingItem {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  category: string
  type: 'toggle' | 'select' | 'button' | 'info' | 'custom'
  value?: boolean
  options?: Array<{ label: string; value: string }>
  action?: () => void
  component?: React.ComponentType<any>
}

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    pushNotifications: true,
    soundEnabled: true,
    darkMode: true,
    betReminders: true,
    twoFactor: false,
    language: 'sw',
  })

  const [activeCategory, setActiveCategory] = useState('general')

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
    toast.success('Setting updated')
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const categories = [
    { id: 'general', label: '⚙️ General', icon: Zap },
    { id: 'notifications', label: '🔔 Notifications', icon: Bell },
    { id: 'privacy', label: '🔒 Privacy & Security', icon: Lock },
    { id: 'appearance', label: '🎨 Appearance', icon: Palette },
    { id: 'account', label: '👤 Account', icon: Shield },
    { id: 'help', label: '❓ Help & Support', icon: HelpCircle },
  ]

  const settingsByCategory = {
    general: [
      {
        id: 'language',
        label: 'Language',
        description: 'Choose your preferred language',
        icon: Globe,
        type: 'select' as const,
        value: settings.language,
        options: [
          { label: '🇹🇿 Swahili (Kiswahili)', value: 'sw' },
          { label: '🇬🇧 English', value: 'en' },
        ],
      },
      {
        id: 'betReminders',
        label: 'Bet Reminders',
        description: 'Get reminded about upcoming matches',
        icon: Zap,
        type: 'toggle' as const,
        value: settings.betReminders,
      },
    ],
    notifications: [
      {
        id: 'notifications',
        label: 'All Notifications',
        description: 'Enable all notifications',
        icon: Bell,
        type: 'toggle' as const,
        value: settings.notifications,
      },
      {
        id: 'emailNotifications',
        label: 'Email Notifications',
        description: 'Receive emails about predictions',
        icon: Mail,
        type: 'toggle' as const,
        value: settings.emailNotifications,
      },
      {
        id: 'pushNotifications',
        label: 'Push Notifications',
        description: 'Mobile app notifications',
        icon: Smartphone,
        type: 'toggle' as const,
        value: settings.pushNotifications,
      },
      {
        id: 'soundEnabled',
        label: 'Sound Effects',
        description: 'Play sound on notifications',
        icon: Volume2,
        type: 'toggle' as const,
        value: settings.soundEnabled,
      },
    ],
    privacy: [
      {
        id: 'twoFactor',
        label: 'Two-Factor Authentication',
        description: 'Extra security for your account',
        icon: Shield,
        type: 'toggle' as const,
        value: settings.twoFactor,
      },
      {
        id: 'privacy_info',
        label: 'Privacy Policy',
        description: 'Read our privacy policy',
        icon: Eye,
        type: 'button' as const,
        action: () => window.open('/privacy', '_blank'),
      },
    ],
    appearance: [
      {
        id: 'theme',
        label: 'Theme',
        description: 'Choose between light and dark modes',
        icon: Palette,
        type: 'custom' as const,
        component: ThemeToggle,
      },
    ],
    account: [
      {
        id: 'logout',
        label: 'Logout',
        description: 'Sign out of your account',
        icon: LogOut,
        type: 'button' as const,
        action: handleLogout,
      },
    ],
    help: [
      {
        id: 'about',
        label: 'About Kilicarego+',
        description: 'Version 1.0.0',
        icon: Info,
        type: 'button' as const,
        action: () => toast.info('Kilicarego+ Pro Max — Advanced AI Betting Assistant'),
      },
      {
        id: 'feedback',
        label: 'Send Feedback',
        description: 'Help us improve',
        icon: HelpCircle,
        type: 'button' as const,
        action: () => toast.success('Feedback sent! Asante'),
      },
    ],
  }

  return (
    <div className="min-h-dvh bg-bg-base overflow-y-auto no-scrollbar pb-32 lg:pb-8">
      {/* Header */}
      <motion.div
        className="px-5 pt-safe pt-6 pb-6 sticky top-0 bg-gradient-to-br from-bg-base/95 to-bg-base/80 backdrop-blur-xl border-b border-white/10 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-1">
          <h1 className="text-4xl font-black bg-gradient-to-r from-text-primary via-gold to-text-primary bg-clip-text text-transparent">
            ⚙️ Settings
          </h1>
          <p className="text-sm text-text-muted">Personalize your experience</p>
        </div>
      </motion.div>

      {/* Content */}
      <div className="px-5 py-8">
        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5"
        >
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all border-2 backdrop-blur-xl ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-gold/30 to-gold/10 border-gold text-gold shadow-lg shadow-gold/30'
                  : 'bg-white/5 border-white/20 text-text-muted hover:border-gold/50 hover:text-white'
              }`}
            >
              {cat.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Settings Items */}
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {settingsByCategory[activeCategory as keyof typeof settingsByCategory]?.map((setting: any, idx: number) => (
            <motion.div
              key={setting.id}
              initial={{ opacity: 0, y: 20, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300 }}
              whileHover={{ y: -8, rotateX: 5 }}
              className="group relative h-full"
              style={{ perspective: '1000px' }}
            >
              {/* Glowing background effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-purple/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

              {/* Card */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/15 shadow-2xl p-5 h-full flex flex-col gap-4 group-hover:border-white/30 transition-all">
                {/* Icon & Title */}
                <div className="flex items-start gap-3">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="p-3 rounded-xl bg-gradient-to-br from-gold/40 to-gold/20 border border-gold/40 flex-shrink-0 shadow-lg shadow-gold/20"
                  >
                    <setting.icon size={24} className="text-gold" />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white group-hover:text-gold transition-colors line-clamp-2">
                      {setting.label}
                    </h3>
                    {setting.description && (
                      <p className="text-xs text-white/50 group-hover:text-white/60 transition-colors line-clamp-2 mt-1">
                        {setting.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Control Section */}
                <div className="mt-auto">
                  {setting.type === 'toggle' && (
                    <motion.button
                      onClick={() => handleToggle(setting.id)}
                      className={`relative w-full py-2.5 rounded-xl transition-all font-semibold text-sm flex items-center justify-between px-4 ${
                        settings[setting.id as keyof typeof settings]
                          ? 'bg-gradient-to-r from-green-500/30 to-green-500/10 border border-green-400/50 text-green-300 shadow-lg shadow-green-500/20'
                          : 'bg-gradient-to-r from-white/10 to-white/5 border border-white/20 text-white/60 hover:border-white/40'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>{settings[setting.id as keyof typeof settings] ? '✓ Enabled' : 'Disabled'}</span>
                      <motion.div
                        animate={{
                          x: settings[setting.id as keyof typeof settings] ? 0 : -4,
                          opacity: settings[setting.id as keyof typeof settings] ? 1 : 0.5,
                        }}
                      >
                        <ToggleLeft size={16} />
                      </motion.div>
                    </motion.button>
                  )}

                  {setting.type === 'select' && (
                    <select
                      value={settings[setting.id as keyof typeof settings] as string}
                      onChange={(e) => setSettings(prev => ({ ...prev, [setting.id]: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-white/10 to-white/5 border border-white/20 text-white text-sm font-semibold hover:border-white/40 transition-all cursor-pointer backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-gold/50"
                    >
                      {setting.options?.map((opt: { label: string; value: string }) => (
                        <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {setting.type === 'button' && (
                    <motion.button
                      onClick={setting.action}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-gold/30 to-gold/10 hover:from-gold/40 hover:to-gold/20 border border-gold/40 text-gold font-semibold text-sm transition-all flex items-center justify-between px-4 group/btn shadow-lg shadow-gold/20"
                    >
                      <span>{setting.label}</span>
                      <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                    </motion.button>
                  )}

                  {setting.type === 'info' && (
                    <div className="w-full text-center py-2.5 px-4 rounded-xl bg-gradient-to-r from-green-500/20 to-green-500/10 border border-green-400/50 text-green-300 text-xs font-semibold shadow-lg shadow-green-500/20">
                      ✓ {setting.label}
                    </div>
                  )}

                  {setting.type === 'custom' && setting.component && (
                    <div className="w-full">
                      <setting.component />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* User Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20, rotateX: -10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.3 }}
          className="group relative mt-8"
          style={{ perspective: '1000px' }}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple/20 to-blue/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

          {/* Card */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/15 shadow-2xl p-6 group-hover:border-white/30 transition-all">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple/40 to-purple/20 border border-purple/40">
                <Shield size={20} className="text-purple-400" />
              </div>
              <p className="text-sm font-bold text-white">Account Information</p>
            </div>

            {/* Info Grid */}
            <div className="grid md:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-3 rounded-xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 hover:border-white/20 transition-all"
              >
                <p className="text-xs text-white/50 mb-1 font-semibold">Email</p>
                <p className="text-sm font-bold text-white truncate">{user?.email || 'N/A'}</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-3 rounded-xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 hover:border-white/20 transition-all"
              >
                <p className="text-xs text-white/50 mb-1 font-semibold">Name</p>
                <p className="text-sm font-bold text-white">{user?.first_name || 'User'}</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-400/30 hover:border-green-400/50 transition-all"
              >
                <p className="text-xs text-white/50 mb-1 font-semibold">Status</p>
                <p className="text-sm font-bold text-green-400">✓ Active</p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Icon placeholder for Mail
const Mail = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 5L2 7" />
  </svg>
)
