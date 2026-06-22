'use client'
// Force dynamic rendering to prevent static pre-rendering during build
// This ensures auth state is evaluated at runtime, not build time
export const dynamic = 'force-dynamic'

import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'
import { experiencesService } from '@/services/experiences.service'
import { momentsService } from '@/services/moments.service'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { formatCount } from '@/lib/utils'

const COLORS = ['#F5A623', '#10B981', '#3B82F6', '#8B5CF6', '#FF2D2D']

export default function AnalyticsPage() {
  const { data: myExps = [], isLoading } = useQuery({
    queryKey: ['my-experiences'],
    queryFn: experiencesService.getMyExperiences,
    staleTime: 1000 * 60 * 5,
  })

  const { data: myMoments = [] } = useQuery({
    queryKey: ['my-moments'],
    queryFn: momentsService.getMyMoments,
    staleTime: 1000 * 60 * 5,
  })

  // Category breakdown
  const categoryData = myExps.reduce<Record<string, number>>((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + 1
    return acc
  }, {})

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name, value,
  }))

  // Experience views chart
  const expViewsData = myExps
    .sort((a, b) => b.views - a.views)
    .slice(0, 6)
    .map((e) => ({ name: e.title.slice(0, 12), views: e.views }))

  // Moments trending scores
  const momentsData = myMoments.slice(0, 7).map((m, i) => ({
    day: `Siku ${i + 1}`,
    score: Math.round(m.trending_score),
    likes: m.like_count,
  }))

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: Array<{ value: number }>
    label?: string
  }) => {
    if (active && payload?.length) {
      return (
        <div
          className="rounded-xl px-3 py-2 text-xs"
          style={{
            background: '#1A1A24',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <p className="text-text-muted">{label}</p>
          <p className="text-gold font-bold">{payload[0].value}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-dvh bg-bg-base pt-safe pb-safe overflow-y-auto no-scrollbar px-4">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-black text-text-primary mb-1">
          📊 Analytics
        </h1>
        <p className="text-text-muted text-sm">
          Takwimu za uzoefu na moments wako
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="h-48" rounded="xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-5 pb-10">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Uzoefu',
                value: myExps.length,
                color: '#F5A623',
                emoji: '⭐',
              },
              {
                label: 'Maoni',
                value: formatCount(
                  myExps.reduce((s, e) => s + e.views, 0)
                ),
                color: '#3B82F6',
                emoji: '👁️',
              },
              {
                label: 'Moments',
                value: myMoments.length,
                color: '#10B981',
                emoji: '📸',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-3 text-center"
                style={{
                  background: `${stat.color}08`,
                  border: `1px solid ${stat.color}20`,
                }}
              >
                <div className="text-xl mb-1">{stat.emoji}</div>
                <p
                  className="text-lg font-black"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </p>
                <p className="text-[10px] text-text-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Experience views chart */}
          {expViewsData.length > 0 && (
            <div
              className="rounded-3xl p-5"
              style={{
                background: 'rgba(26,26,36,0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <h2 className="font-bold text-text-primary text-sm mb-4">
                📈 Maoni kwa Uzoefu
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={expViewsData}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#8B8BA7' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="views"
                    fill="#F5A623"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Moments trending */}
          {momentsData.length > 0 && (
            <div
              className="rounded-3xl p-5"
              style={{
                background: 'rgba(26,26,36,0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <h2 className="font-bold text-text-primary text-sm mb-4">
                🔥 Trending Score ya Moments
              </h2>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={momentsData}>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: '#8B8BA7' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#F5A623"
                    strokeWidth={2.5}
                    dot={{ fill: '#F5A623', strokeWidth: 0, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category pie */}
          {pieData.length > 0 && (
            <div
              className="rounded-3xl p-5"
              style={{
                background: 'rgba(26,26,36,0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <h2 className="font-bold text-text-primary text-sm mb-4">
                🌍 Uzoefu kwa Aina
              </h2>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx={65}
                      cy={65}
                      innerRadius={40}
                      outerRadius={65}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map((item, i) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          background: COLORS[i % COLORS.length],
                        }}
                      />
                      <span className="text-xs text-text-secondary">
                        {item.name}: {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}