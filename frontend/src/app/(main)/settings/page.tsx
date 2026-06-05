'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, Lock, Eye, Palette, Globe, LogOut, HelpCircle, Info,
  ChevronRight, ToggleLeft, Sun, Moon, Volume2, Zap, Shield, Smartphone, Mail,
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
        className="px-5 pt-safe pt-6 pb-6 sticky top-0 bg-bg-base/95 backdrop-blur-xl border-b border-white/10 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-text-primary">
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
          className="flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5"
        >
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-4 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all border-2 ${
                activeCategory === cat.id
                  ? 'bg-gold/10 border-gold text-gold'
                  : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'
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
          className="space-y-3"
        >
          {settingsByCategory[activeCategory as keyof typeof settingsByCategory]?.map((setting: any) => (
            <motion.div
              key={setting.id}
              whileHover={{ scale: 1.01 }}
              className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/10 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/20 flex-shrink-0">
                  <setting.icon size={20} className="text-gold" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white mb-0.5">
                    {setting.label}
                  </h3>
                  {setting.description && (
                    <p className="text-xs text-white/50">
                      {setting.description}
                    </p>
                  )}
                </div>

                {/* Control Section */}
                <div className="ml-auto">
                  {setting.type === 'toggle' && (
                    <motion.button
                      onClick={() => handleToggle(setting.id)}
                      className={`relative w-12 h-7 rounded-full transition-all ${
                        settings[setting.id as keyof typeof settings]
                          ? 'bg-gold'
                          : 'bg-white/10'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md ${
                          settings[setting.id as keyof typeof settings] ? 'right-1' : 'left-1'
                        }`}
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  )}

                  {setting.type === 'select' && (
                    <select
                      value={settings[setting.id as keyof typeof settings] as string}
                      onChange={(e) => setSettings(prev => ({ ...prev, [setting.id]: e.target.value }))}
                      className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold hover:border-white/30 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/50"
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
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 rounded-xl bg-gold/10 hover:bg-gold/20 border border-gold/30 text-gold font-semibold text-xs transition-all flex items-center gap-2"
                    >
                      <span>{setting.label}</span>
                      <ChevronRight size={14} />
                    </motion.button>
                  )}

                  {setting.type === 'info' && (
                    <div className="px-3 py-2 rounded-xl bg-green-500/10 border border-green-400/30 text-green-400 text-xs font-semibold">
                      ✓ {setting.label}
                    </div>
                  )}

                  {setting.type === 'custom' && setting.component && (
                    <div>
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/10 p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple/10 border border-purple/30">
              <Shield size={18} className="text-purple-400" />
            </div>
            <p className="text-sm font-bold text-white">Account Information</p>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-white/50 mb-1 font-semibold">Email</p>
              <p className="text-sm font-bold text-white truncate">{user?.email || 'N/A'}</p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-white/50 mb-1 font-semibold">Name</p>
              <p className="text-sm font-bold text-white">{user?.first_name || 'User'}</p>
            </div>

            <div className="p-3 rounded-xl bg-green-500/10 border border-green-400/30">
              <p className="text-xs text-white/50 mb-1 font-semibold">Status</p>
              <p className="text-sm font-bold text-green-400">✓ Active</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
