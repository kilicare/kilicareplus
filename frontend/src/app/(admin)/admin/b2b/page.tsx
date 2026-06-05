'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer,
  Tooltip, PieChart, Pie, Cell,
} from 'recharts'
import { Download, TrendingUp, Calendar, Globe, Clock } from 'lucide-react'
import api from '@/core/api/axios'
import { KiliButton } from '@/components/ui/KiliButton'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { formatCount } from '@/lib/utils'

const PIE_COLORS = ['#3B82F6','#F5A623','#10B981','#8B5CF6','#FF2D2D','#FF7700','#EC4899','#94A3B8','#F0F0F5']

export default function B2BDashboardPage() {
  const [days, setDays] = useState(30)

  const { data: forecast, isLoading: fLoading } = useQuery({
    queryKey: ['b2b-forecast', days],
    queryFn: async () => {
      const { data } = await api.get(`/api/b2b/demand-forecast/?days=${days}`)
      return data
    },
    staleTime: 1000 * 60 * 10,
  })

  const { data: origins = [] } = useQuery({
    queryKey: ['b2b-origins'],
    queryFn: async () => {
      const { data } = await api.get('/api/b2b/tourist-origins/')
      return data
    },
    staleTime: 1000 * 60 * 60,
  })

  const { data: peaks = [] } = useQuery({
    queryKey: ['b2b-peaks'],
    queryFn: async () => {
      const { data } = await api.get('/api/b2b/peak-periods/')
      return data
    },
    staleTime: 1000 * 60 * 60,
  })

  const chartData = forecast?.forecast?.slice(0, 14).map(
    (d: { date: string; expected_tourists: number; day_name: string }) => ({
      date: d.date.slice(5),
      tourists: d.expected_tourists,
      day: d.day_name.slice(0, 3),
    })
  ) || []

  const downloadCSV = () => {
    window.open(
      `/api/b2b/reports/download/?days=${days}`,
      '_blank'
    )
  }

  return (
    <div className="min-h-dvh bg-bg-base pt-safe pb-safe overflow-y-auto no-scrollbar">
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">
            🏢 B2B Dashboard
          </h1>
          <p className="text-text-muted text-sm">Tourism Analytics</p>
        </div>
        <KiliButton size="sm" variant="ghost" onClick={downloadCSV}
          icon={<Download size={14} />}>
          CSV
        </KiliButton>
      </div>

      {/* Summary */}
      {forecast?.summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 px-5 mb-5">
          {[
            { label:'Wastani/Siku', value: formatCount(forecast.summary.avg_daily),  color:'#F5A623', icon: TrendingUp },
            { label:'Siku za Kilele', value: forecast.summary.peak_days,              color:'#FF7700', icon: Calendar },
            { label:'Jumla 30 Siku', value: formatCount(forecast.summary.total_30day), color:'#10B981', icon: Globe },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl p-3 text-center relative overflow-hidden"
              style={{ background:`${s.color}12`, border:`1px solid ${s.color}25` }}>
              <div className="absolute top-0 right-0 w-12 h-12 rounded-full blur-2xl opacity-20"
                style={{ background: `radial-gradient(circle, ${s.color}, transparent)` }}
              />
              <div className="relative z-10">
                <s.icon size={16} className="mx-auto mb-1" style={{ color: s.color }} />
                <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-text-muted">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Days selector */}
      <div className="flex gap-2 px-5 mb-4">
        {[7, 14, 30].map((d, i) => (
          <motion.button key={d} onClick={() => setDays(d)}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 rounded-xl text-xs font-bold relative overflow-hidden"
            style={{
              background: days===d ? 'rgba(245,166,35,0.15)' : 'rgba(26,26,36,0.6)',
              border:`1px solid ${days===d ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.07)'}`,
              color: days===d ? '#F5A623' : '#8B8BA7',
            }}>
            {days===d && (
              <div className="absolute inset-0 opacity-20"
                style={{ background: 'radial-gradient(circle, #F5A623, transparent)' }}
              />
            )}
            <span className="relative z-10">Siku {d}</span>
          </motion.button>
        ))}
      </div>

      {/* Forecast chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-5 mb-5">
        <div className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background:'rgba(26,26,36,0.8)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10"
            style={{ background: 'radial-gradient(circle, #F5A623, transparent)' }}
          />
          <div className="relative z-10">
            <h2 className="font-bold text-text-primary text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-gold" />
              Utabiri wa Watalii
            </h2>
            {fLoading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-gold border-t-transparent animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#8B8BA7' }}
                    axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background:'#1A1A24',
                    border:'1px solid rgba(255,255,255,0.1)',
                    borderRadius:10, fontSize:11, color:'#F0F0F5' }} />
                  <Line type="monotone" dataKey="tourists" stroke="#F5A623"
                    strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tourist origins */}
      {origins.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="px-5 mb-5">
          <div className="rounded-3xl p-5 relative overflow-hidden"
            style={{ background:'rgba(26,26,36,0.8)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10"
              style={{ background: 'radial-gradient(circle, #3B82F6, transparent)' }}
            />
            <div className="relative z-10">
              <h2 className="font-bold text-text-primary text-sm mb-4 flex items-center gap-2">
                <Globe size={16} className="text-blue-400" />
                Asili ya Watalii
              </h2>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={origins} cx={65} cy={65}
                      innerRadius={38} outerRadius={62}
                      dataKey="percent" strokeWidth={0}>
                      {origins.map((_: unknown, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {origins.map((o: {
                    country: string; flag: string; percent: number
                  }, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-text-secondary flex-1 truncate">
                        {o.flag} {o.country}
                      </span>
                      <span className="text-xs font-bold text-text-primary">
                        {o.percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Peak periods */}
      {peaks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="px-5 pb-8">
          <div className="rounded-3xl p-5 relative overflow-hidden"
            style={{ background:'rgba(26,26,36,0.8)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10"
              style={{ background: 'radial-gradient(circle, #FF7700, transparent)' }}
            />
            <div className="relative z-10">
              <h2 className="font-bold text-text-primary text-sm mb-4 flex items-center gap-2">
                <Clock size={16} className="text-orange-400" />
                Nyakati za Kilele
              </h2>
              <div className="space-y-3">
                {peaks.map((p: {
                  period: string; demand_increase: string;
                  reason: string; recommendation: string; category: string
                }, i: number) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + (i * 0.05) }}
                    className="rounded-2xl p-3 relative overflow-hidden"
                    style={{
                      background: p.category === 'HIGH'
                        ? 'rgba(255,119,0,0.12)'
                        : 'rgba(245,166,35,0.08)',
                      border: `1px solid ${p.category === 'HIGH'
                        ? 'rgba(255,119,0,0.3)' : 'rgba(245,166,35,0.2)'}`,
                    }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-text-primary">
                        {p.period}
                      </p>
                      <span className="text-xs font-black text-kili-orange">
                        +{p.demand_increase}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mb-1">{p.reason}</p>
                    <p className="text-xs text-gold font-medium">
                      💡 {p.recommendation}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}