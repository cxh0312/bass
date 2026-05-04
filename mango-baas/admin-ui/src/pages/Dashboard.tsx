import { useEffect, useState } from 'react'
import type { StatsResponse, MetricsOverview } from '@/lib/api'
import { getStats, getMetricsOverview } from '@/lib/api'
import { Users, FolderKanban, Database, TrendingUp, Clock, Key, Webhook, Activity, AlertTriangle, Timer } from 'lucide-react'

export function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [metrics, setMetrics] = useState<MetricsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      setLoading(true)
      const [statsRes, metricsRes] = await Promise.allSettled([
        getStats(),
        getMetricsOverview(),
      ])

      if (statsRes.status === 'fulfilled' && statsRes.value.code === 0) {
        setStats(statsRes.value.data)
      }
      if (metricsRes.status === 'fulfilled' && metricsRes.value.code === 0) {
        setMetrics(metricsRes.value.data)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>
  }

  if (error) {
    return <div className="text-destructive">Error: {error}</div>
  }

  if (!stats) {
    return null
  }

  const maxTrend = Math.max(...stats.dailyTrend.map(d => d.count), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">System overview and recent activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.userCount}
          icon={Users}
        />
        <StatCard
          title="Total Projects"
          value={stats.projectCount}
          icon={FolderKanban}
        />
        <StatCard
          title="Total Data"
          value={stats.totalDataCount}
          icon={Database}
        />
        <StatCard
          title="API Calls Today"
          value={stats.todayDataCount}
          icon={TrendingUp}
        />
      </div>

      {/* API Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total API Calls"
            value={metrics.totalCalls}
            icon={Activity}
          />
          <StatCard
            title="Error Rate"
            value={metrics.errorRate}
            icon={AlertTriangle}
            suffix="%"
            valueClassName={metrics.errorRate > 5 ? 'text-destructive' : undefined}
          />
          <StatCard
            title="Avg Response Time"
            value={metrics.avgDuration}
            icon={Timer}
            suffix="ms"
            valueClassName={metrics.avgDuration > 500 ? 'text-yellow-500' : undefined}
          />
          <StatCard
            title="P95 Response Time"
            value={metrics.p95}
            icon={Timer}
            suffix="ms"
            valueClassName={metrics.p95 > 1000 ? 'text-destructive' : undefined}
          />
        </div>
      )}

      {/* Trend Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 7-Day Trend */}
        <div className="bg-card rounded-lg border p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            7-Day Trend
          </h2>
          <div className="flex items-end gap-2 h-32">
            {stats.dailyTrend.map(day => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary rounded-t transition-all"
                  style={{ height: `${Math.max((day.count / maxTrend) * 100, 4)}%` }}
                />
                <span className="text-xs text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Today</p>
              <p className="text-xl font-semibold">{stats.todayDataCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">This Week</p>
              <p className="text-xl font-semibold">{stats.weekDataCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">This Month</p>
              <p className="text-xl font-semibold">{stats.monthDataCount}</p>
            </div>
          </div>
        </div>

        {/* API Metrics Trend */}
        {metrics && (
          <div className="bg-card rounded-lg border p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              API Call Volume
            </h2>
            <div className="flex items-end gap-2 h-32">
              {metrics.dailyTrend.map(day => {
                const maxCalls = Math.max(...metrics.dailyTrend.map(d => d.count), 1)
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all"
                      style={{ height: `${Math.max((day.count / maxCalls) * 100, 4)}%` }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Week Calls</p>
                <p className="text-xl font-semibold">{metrics.weekCalls.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Error Rate</p>
                <p className="text-xl font-semibold">{metrics.errorRate}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">P99</p>
                <p className="text-xl font-semibold">{metrics.p99}ms</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent API Keys */}
        <div className="bg-card rounded-lg border p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Key className="w-4 h-4" />
            Recent API Keys
          </h2>
          <div className="space-y-3">
            {stats.recentApiKeys.length === 0 ? (
              <p className="text-muted-foreground text-sm">No API keys yet</p>
            ) : (
              stats.recentApiKeys.map(key => (
                <div key={key.id} className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{key.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {key.keyPrefix}... • {formatTime(key.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Webhooks */}
        <div className="bg-card rounded-lg border p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Recent Webhooks
          </h2>
          <div className="space-y-3">
            {stats.recentWebhooks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No webhooks yet</p>
            ) : (
              stats.recentWebhooks.map(webhook => (
                <div key={webhook.id} className="flex items-center gap-3">
                  <Webhook className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{webhook.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {webhook.url} • {formatTime(webhook.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="bg-card rounded-lg border p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {stats.recentAuditLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No activity yet</p>
            ) : (
              stats.recentAuditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{log.action}</span>{' '}
                      <span className="text-muted-foreground">{log.resource}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  suffix?: string
  valueClassName?: string
}

function StatCard({ title, value, icon: Icon, suffix, valueClassName }: StatCardProps) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-semibold mt-1 ${valueClassName || ''}`}>
            {typeof value === 'number' && !Number.isInteger(value)
              ? value.toFixed(1)
              : value.toLocaleString()}
            {suffix ? ` ${suffix}` : ''}
          </p>
        </div>
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
    </div>
  )
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}