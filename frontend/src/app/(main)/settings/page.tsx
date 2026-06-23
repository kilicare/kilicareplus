'use client'

// Force dynamic rendering to prevent static pre-rendering during build
// This ensures auth state is evaluated at runtime, not build time
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, Lock, Eye, Palette, Globe, LogOut, HelpCircle, Info,
  ChevronRight, ToggleLeft, Sun, Moon, Volume2, Zap, Shield, Smartphone, Mail,
} from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { performLogout } from '@/core/auth/logout'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { settingsService, UserSettings } from '@/services/settings.service'

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
  const { sessionValid, user } = useSession()
  const router = useRouter()

  const [settings, setSettings] = useState<UserSettings>({
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    profile_visibility: 'PUBLIC',
    show_location: true,
    allow_follow_requests: true,
    language: 'sw',
    theme: 'dark',
    enable_ai_chat: true,
    enable_predictions: true,
    enable_sos: true,
    enable_showcase: true,
    enable_moments: true,
    content_filter: 'MEDIUM',
    auto_download_media: false,
    low_data_mode: false,
  })

  const [loading, setLoading] = useState(true)

  const [activeCategory, setActiveCategory] = useState('general')

  // Fetch settings from API on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await settingsService.getMySettings()
        setSettings(data)
      } catch (error) {
        console.error('Failed to fetch settings:', error)
        toast.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchSettings()
    }
  }, [user])

  const handleToggle = async (key: keyof UserSettings) => {
    const newValue = !settings[key]
    setSettings((prev) => ({
      ...prev,
      [key]: newValue,
    }))

    try {
      await settingsService.updateSettings({ [key]: newValue })
      toast.success('Setting updated')
    } catch (error) {
      console.error('Failed to update setting:', error)
      // Revert on error
      setSettings((prev) => ({
        ...prev,
        [key]: !newValue,
      }))
      toast.error('Failed to update setting')
    }
  }

  const handleSelectChange = async (key: keyof UserSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))

    try {
      await settingsService.updateSettings({ [key]: value })
      toast.success('Setting updated')
    } catch (error) {
      console.error('Failed to update setting:', error)
      toast.error('Failed to update setting')
    }
  }

  const handleLogout = async () => {
    performLogout()
    router.push('/login')
  }

  const categories = [
    { id: 'general', label: '⚙️ General', icon: Zap },
    { id: 'notifications', label: '🔔 Notifications', icon: Bell },
    { id: 'privacy', label: '🔒 Privacy & Security', icon: Lock },
    { id: 'appearance', label: '🎨 Appearance', icon: Palette },
    { id: 'features', label: '🚀 Features', icon: Zap },
    { id: 'content', label: '📱 Content & Data', icon: Smartphone },
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
          { label: '🇫🇷 Français', value: 'fr' },
          { label: '🇪🇸 Español', value: 'es' },
          { label: '🇩🇪 Deutsch', value: 'de' },
          { label: '🇸🇦 العربية', value: 'ar' },
          { label: '🇨🇳 中文', value: 'zh' },
        ],
      },
      {
        id: 'enable_predictions',
        label: 'Sports Predictions',
        description: 'Enable AI-powered sports predictions',
        icon: Zap,
        type: 'toggle' as const,
        value: settings.enable_predictions,
      },
      {
        id: 'low_data_mode',
        label: 'Low Data Mode',
        description: 'Reduce data usage for slow connections',
        icon: Smartphone,
        type: 'toggle' as const,
        value: settings.low_data_mode,
      },
    ],
    notifications: [
      {
        id: 'email_notifications',
        label: 'Email Notifications',
        description: 'Receive email notifications',
        icon: Mail,
        type: 'toggle' as const,
        value: settings.email_notifications,
      },
      {
        id: 'push_notifications',
        label: 'Push Notifications',
        description: 'Mobile app notifications',
        icon: Bell,
        type: 'toggle' as const,
        value: settings.push_notifications,
      },
      {
        id: 'sms_notifications',
        label: 'SMS Notifications',
        description: 'Receive SMS alerts',
        icon: Smartphone,
        type: 'toggle' as const,
        value: settings.sms_notifications,
      },
    ],
    privacy: [
      {
        id: 'profile_visibility',
        label: 'Profile Visibility',
        description: 'Who can view your profile',
        icon: Eye,
        type: 'select' as const,
        value: settings.profile_visibility,
        options: [
          { label: 'Public - Everyone', value: 'PUBLIC' },
          { label: 'Followers Only', value: 'FOLLOWERS' },
          { label: 'Private - Hidden', value: 'PRIVATE' },
        ],
      },
      {
        id: 'show_location',
        label: 'Show Location',
        description: 'Display your location on map',
        icon: Globe,
        type: 'toggle' as const,
        value: settings.show_location,
      },
      {
        id: 'allow_follow_requests',
        label: 'Allow Follow Requests',
        description: 'Let others follow you',
        icon: Shield,
        type: 'toggle' as const,
        value: settings.allow_follow_requests,
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
        type: 'select' as const,
        value: settings.theme,
        options: [
          { label: 'Dark', value: 'dark' },
          { label: 'Light', value: 'light' },
          { label: 'Auto (System)', value: 'auto' },
        ],
      },
    ],
    features: [
      {
        id: 'enable_ai_chat',
        label: 'AI Chat',
        description: 'Enable AI Chat assistant',
        icon: Zap,
        type: 'toggle' as const,
        value: settings.enable_ai_chat,
      },
      {
        id: 'enable_sos',
        label: 'SOS Emergency',
        description: 'Enable emergency SOS feature',
        icon: Shield,
        type: 'toggle' as const,
        value: settings.enable_sos,
      },
      {
        id: 'enable_showcase',
        label: 'Virtual Showcase',
        description: 'Enable marketplace feature',
        icon: Palette,
        type: 'toggle' as const,
        value: settings.enable_showcase,
      },
      {
        id: 'enable_moments',
        label: 'Social Moments',
        description: 'Enable social media feature',
        icon: Bell,
        type: 'toggle' as const,
        value: settings.enable_moments,
      },
    ],
    content: [
      {
        id: 'content_filter',
        label: 'Content Filter',
        description: 'Content filtering sensitivity',
        icon: Shield,
        type: 'select' as const,
        value: settings.content_filter,
        options: [
          { label: 'No Filter', value: 'NONE' },
          { label: 'Low Sensitivity', value: 'LOW' },
          { label: 'Medium Sensitivity', value: 'MEDIUM' },
          { label: 'High Sensitivity', value: 'HIGH' },
        ],
      },
      {
        id: 'auto_download_media',
        label: 'Auto-Download Media',
        description: 'Download media automatically',
        icon: Smartphone,
        type: 'toggle' as const,
        value: settings.auto_download_media,
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
                      value={settings[setting.id as keyof UserSettings] as string}
                      onChange={(e) => handleSelectChange(setting.id as keyof UserSettings, e.target.value)}
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
