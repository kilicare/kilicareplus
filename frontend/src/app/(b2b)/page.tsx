'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, Users, TrendingUp, DollarSign, CheckCircle, AlertCircle,
  Settings, FileText, BarChart3, Calendar, CreditCard, Shield, Globe,
  ChevronRight, Bell, Download, ExternalLink, Plus, Search, Filter, Book,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'

export default function B2BPortalPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Mock data - replace with API calls
  const [stats, setStats] = useState({
    totalBookings: 1247,
    activeUsers: 342,
    revenue: 452000,
    conversionRate: 12.5,
  })

  const [recentBookings, setRecentBookings] = useState([
    { id: 1, client: 'Safari Adventures Ltd', amount: 45000, status: 'completed', date: '2026-06-20' },
    { id: 2, client: 'Kilimanjaro Hotel', amount: 78000, status: 'pending', date: '2026-06-19' },
    { id: 3, client: 'Zanzibar Beach Resort', amount: 32000, status: 'completed', date: '2026-06-18' },
    { id: 4, client: 'Tanzania Tourism Board', amount: 120000, status: 'processing', date: '2026-06-17' },
  ])

  const [companyProfile, setCompanyProfile] = useState({
    companyName: 'Kilicarego+ Partners',
    companyType: 'HOTEL',
    location: 'Arusha, Tanzania',
    contactEmail: 'partners@kilicarego.com',
    isVerified: true,
    subscriptionActive: true,
  })

  useEffect(() => {
    // Simulate API call to fetch B2B data
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }, [])

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'profile', label: 'Company Profile', icon: Building2 },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'resources', label: 'Resources', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 border-green-500/30 text-green-400'
      case 'pending':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
      case 'processing':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400'
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading B2B Portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg-base overflow-y-auto no-scrollbar pb-32 lg:pb-8">
      {/* Header */}
      <motion.div
        className="px-5 pt-safe pt-6 pb-6 sticky top-0 bg-bg-base/95 backdrop-blur-xl border-b border-white/10 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-text-primary">
              🏢 B2B Portal
            </h1>
            <p className="text-sm text-text-muted">
              Partner Dashboard & Management
            </p>
          </div>
          <div className="flex items-center gap-3">
            {companyProfile.isVerified && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30">
                <CheckCircle size={16} className="text-green-400" />
                <span className="text-xs font-semibold text-green-400">Verified</span>
              </div>
            )}
            {companyProfile.subscriptionActive && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gold/10 border border-gold/30">
                <Shield size={16} className="text-gold" />
                <span className="text-xs font-semibold text-gold">Premium</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="px-5 py-8">
        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5"
        >
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all border-2 ${
                activeTab === tab.id
                  ? 'bg-gold/10 border-gold text-gold'
                  : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/10 p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <Calendar size={20} className="text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold text-white/50">Total Bookings</span>
                </div>
                <p className="text-2xl font-black text-white">{stats.totalBookings.toLocaleString()}</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/10 p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30">
                    <Users size={20} className="text-purple-400" />
                  </div>
                  <span className="text-xs font-semibold text-white/50">Active Users</span>
                </div>
                <p className="text-2xl font-black text-white">{stats.activeUsers.toLocaleString()}</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/10 p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/30">
                    <DollarSign size={20} className="text-green-400" />
                  </div>
                  <span className="text-xs font-semibold text-white/50">Revenue (TZS)</span>
                </div>
                <p className="text-2xl font-black text-white">{stats.revenue.toLocaleString()}</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/10 p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/30">
                    <TrendingUp size={20} className="text-gold" />
                  </div>
                  <span className="text-xs font-semibold text-white/50">Conversion Rate</span>
                </div>
                <p className="text-2xl font-black text-white">{stats.conversionRate}%</p>
              </motion.div>
            </div>

            {/* Recent Bookings */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/10"
            >
              <div className="p-5 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">Recent Bookings</h2>
              </div>
              <div className="divide-y divide-white/10">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 flex items-center justify-between hover:bg-white/5 transition-all"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{booking.client}</p>
                      <p className="text-xs text-white/50">{booking.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-bold text-gold">TZS {booking.amount.toLocaleString()}</p>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <motion.div
              className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/10 p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/30">
                  <Building2 size={20} className="text-gold" />
                </div>
                <h2 className="text-lg font-bold text-white">Company Profile</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-white/50 mb-2 block">Company Name</label>
                  <input
                    type="text"
                    value={companyProfile.companyName}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, companyName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/50 mb-2 block">Company Type</label>
                  <select
                    value={companyProfile.companyType}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, companyType: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gold/50"
                  >
                    <option value="HOTEL">Hotel</option>
                    <option value="SAFARI">Safari Company</option>
                    <option value="BOARD">Tourism Board</option>
                    <option value="AIRLINE">Airline</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/50 mb-2 block">Location</label>
                  <input
                    type="text"
                    value={companyProfile.location}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, location: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/50 mb-2 block">Contact Email</label>
                  <input
                    type="email"
                    value={companyProfile.contactEmail}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, contactEmail: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toast.success('Profile updated successfully')}
                  className="w-full px-4 py-3 rounded-xl bg-gold hover:bg-gold/90 text-white font-semibold text-sm transition-all"
                >
                  Save Changes
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <motion.div
              className="rounded-2xl overflow-hidden bg-gradient-to-br from-gold/20 via-gold/10 to-slate-900/80 backdrop-blur-xl border border-gold/30 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gold/20 border border-gold/40">
                  <Shield size={20} className="text-gold" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Premium Plan</h2>
                  <p className="text-xs text-white/50">Active until Dec 31, 2026</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-white/50 mb-1">Monthly Revenue</p>
                  <p className="text-lg font-bold text-white">TZS 450,000</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-white/50 mb-1">Commission Rate</p>
                  <p className="text-lg font-bold text-white">15%</p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toast.info('Contact sales for plan upgrade')}
                className="w-full px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink size={16} />
                Upgrade Plan
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <motion.div
              className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/10"
            >
              <div className="p-5 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">Partner Resources</h2>
              </div>
              <div className="divide-y divide-white/10">
                {[
                  { title: 'API Documentation', desc: 'Integrate with our booking API', icon: FileText },
                  { title: 'Marketing Materials', desc: 'Download logos and banners', icon: Download },
                  { title: 'Integration Guide', desc: 'Step-by-step setup guide', icon: Book },
                  { title: 'Support Portal', desc: 'Get help from our team', icon: ExternalLink },
                ].map((resource) => (
                  <motion.button
                    key={resource.title}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => toast.info(`${resource.title} coming soon`)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/30">
                        <resource.icon size={20} className="text-gold" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">{resource.title}</p>
                        <p className="text-xs text-white/50">{resource.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-white/30" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <motion.div
              className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/10 p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/30">
                  <Settings size={20} className="text-gold" />
                </div>
                <h2 className="text-lg font-bold text-white">Portal Settings</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-sm font-bold text-white">Email Notifications</p>
                    <p className="text-xs text-white/50">Receive booking alerts</p>
                  </div>
                  <div className="w-12 h-7 rounded-full bg-gold relative">
                    <div className="absolute right-1 top-1 w-5 h-5 rounded-full bg-white" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-sm font-bold text-white">Auto-Confirm Bookings</p>
                    <p className="text-xs text-white/50">Automatically confirm bookings</p>
                  </div>
                  <div className="w-12 h-7 rounded-full bg-white/10 relative">
                    <div className="absolute left-1 top-1 w-5 h-5 rounded-full bg-white" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-sm font-bold text-white">Public Profile</p>
                    <p className="text-xs text-white/50">Show company in directory</p>
                  </div>
                  <div className="w-12 h-7 rounded-full bg-gold relative">
                    <div className="absolute right-1 top-1 w-5 h-5 rounded-full bg-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <motion.div
              className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/10"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">All Bookings</h2>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                    <Search size={16} className="text-white/50" />
                  </button>
                  <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                    <Filter size={16} className="text-white/50" />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-white/10">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 flex items-center justify-between hover:bg-white/5 transition-all"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{booking.client}</p>
                      <p className="text-xs text-white/50">{booking.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-bold text-gold">TZS {booking.amount.toLocaleString()}</p>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <motion.div
              className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-white/10 p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/30">
                  <TrendingUp size={20} className="text-gold" />
                </div>
                <h2 className="text-lg font-bold text-white">Analytics Overview</h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-white/50 mb-2">Monthly Revenue Trend</p>
                  <div className="h-32 flex items-end gap-2">
                    {[40, 65, 45, 80, 55, 70, 90].map((height) => (
                      <div
                        key={`bar-${height}`}
                        className="flex-1 bg-gold/50 rounded-t"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-white/50 mb-1">Top Performing</p>
                    <p className="text-sm font-bold text-white">Safari Packages</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-white/50 mb-1">Growth Rate</p>
                    <p className="text-sm font-bold text-green-400">+23.5%</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
