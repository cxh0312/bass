const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface ApiError {
  code: number
  msg: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ msg: 'Request failed' })) as ApiError
    throw new Error(error.msg || `HTTP ${res.status}`)
  }

  return res.json()
}

// Auth
export interface LoginRequest { email: string; password: string }
export interface LoginResponse { code: number; msg: string; data: { token: string } }

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export interface User {
  id: string
  email: string
  name?: string
  role: 'admin' | 'editor' | 'viewer'
  createdAt: string
}

// Users
export async function getUsers(): Promise<{ code: number; msg: string; data: User[] }> {
  return request('/admin/users')
}

export async function createUser(data: { email: string; password: string; name?: string; role?: string }): Promise<{ code: number; msg: string; data: User }> {
  return request('/admin/users', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateUser(id: string, data: { name?: string; role?: string }): Promise<{ code: number; msg: string; data: User }> {
  return request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteUser(id: string): Promise<{ code: number; msg: string }> {
  return request(`/admin/users/${id}`, { method: 'DELETE' })
}

// Projects
export interface Project {
  id: string
  name: string
  description?: string
  ownerId: string
  apiKey: string
  createdAt: string
}

export async function getProjects(): Promise<{ code: number; msg: string; data: Project[] }> {
  return request('/admin/projects')
}

export async function createProject(data: { name: string; description?: string }): Promise<{ code: number; msg: string; data: Project }> {
  return request('/admin/projects', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateProject(id: string, data: { name?: string; description?: string }): Promise<{ code: number; msg: string; data: Project }> {
  return request(`/admin/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteProject(id: string): Promise<{ code: number; msg: string }> {
  return request(`/admin/projects/${id}`, { method: 'DELETE' })
}

// API Keys
export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  lastUsed?: string
  createdAt: string
}

export interface CreateApiKeyResponse {
  id: string
  name: string
  key: string
  keyPrefix: string
  createdAt: string
}

export async function getApiKeys(projectId?: string): Promise<{ code: number; msg: string; data: ApiKey[] }> {
  const query = projectId ? `?projectId=${projectId}` : ''
  return request(`/api-keys${query}`)
}

export async function createApiKey(data: { name: string; projectId: string }): Promise<{ code: number; msg: string; data: CreateApiKeyResponse }> {
  return request('/api-keys', { method: 'POST', body: JSON.stringify(data) })
}

export async function deleteApiKey(id: string): Promise<{ code: number; msg: string }> {
  return request(`/api-keys/${id}`, { method: 'DELETE' })
}

// Webhooks
export interface Webhook {
  id: string
  projectId: string
  name: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
}

export interface WebhookWithSecret extends Webhook {
  secret?: string
}

export async function getWebhooks(projectId: string): Promise<{ code: number; msg: string; data: Webhook[] }> {
  return request(`/webhooks?projectId=${projectId}`)
}

export async function createWebhook(data: { projectId: string; name: string; url: string; events: string[] }): Promise<{ code: number; msg: string; data: WebhookWithSecret }> {
  return request('/webhooks', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateWebhook(id: string, data: { name?: string; url?: string; events?: string[]; active?: boolean }): Promise<{ code: number; msg: string; data: Webhook }> {
  return request(`/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteWebhook(id: string): Promise<{ code: number; msg: string }> {
  return request(`/webhooks/${id}`, { method: 'DELETE' })
}

export async function testWebhook(id: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  return request(`/webhooks/${id}/test`, { method: 'POST' })
}

// Collections
export interface Collection {
  id: string
  projectId: string
  name: string
  schema?: any
  strict: boolean
  permissions?: any
  createdAt: string
}

export async function getCollections(): Promise<{ code: number; msg: string; data: Collection[] }> {
  return request('/admin/collections')
}

export async function getProjectCollections(projectId: string): Promise<{ code: number; msg: string; data: Collection[] }> {
  return request(`/admin/projects/${projectId}/collections`)
}

export async function getCollection(id: string): Promise<{ code: number; msg: string; data: Collection }> {
  const res = await request<{ code: number; msg: string; data: Collection[] }>('/admin/collections')
  if (res.code === 0) {
    const collection = res.data.find(c => c.id === id)
    if (collection) {
      return { code: 0, msg: 'success', data: collection }
    }
    return { code: 404, msg: 'Collection not found', data: null as any }
  }
  return res as any
}

export interface CollectionData {
  id: string
  collectionId: string
  projectId: string
  payload: any
  createdAt: string
  updatedAt?: string
}

export async function getCollectionData(collectionId: string, page = 1, limit = 20): Promise<{ code: number; msg: string; data: CollectionData[]; pagination: { page: number; limit: number; total: number } }> {
  return request(`/admin/collections/${collectionId}/data?page=${page}&limit=${limit}`)
}

// Audit Logs
export interface AuditLog {
  id: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  details?: any
  ip?: string
  userAgent?: string
  createdAt: string
}

export interface AuditLogsResponse {
  code: number
  msg: string
  data: AuditLog[]
  pagination: { page: number; limit: number; total: number }
}

export async function getAuditLogs(params?: { page?: number; limit?: number; userId?: string; action?: string; resource?: string }): Promise<AuditLogsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.userId) searchParams.set('userId', params.userId)
  if (params?.action) searchParams.set('action', params.action)
  if (params?.resource) searchParams.set('resource', params.resource)
  const query = searchParams.toString()
  return request(`/admin/audit-logs${query ? `?${query}` : ''}`)
}

// Stats
export interface DailyTrend {
  date: string
  count: number
}

export interface RecentApiKey {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
}

export interface RecentWebhook {
  id: string
  name: string
  url: string
  createdAt: string
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  details?: any
  ip?: string
  userAgent?: string
  createdAt: string
}

export interface ProjectStat {
  id: string
  name: string
  _count: {
    collections: number
    data: number
  }
}

export interface StatsResponse {
  userCount: number
  projectCount: number
  totalDataCount: number
  todayDataCount: number
  weekDataCount: number
  monthDataCount: number
  recentApiKeys: RecentApiKey[]
  recentWebhooks: RecentWebhook[]
  recentAuditLogs: AuditLog[]
  projectStats: ProjectStat[]
  dailyTrend: DailyTrend[]
}

export async function getStats(): Promise<{ code: number; msg: string; data: StatsResponse }> {
  return request('/admin/stats')
}

// Rate Limit Rules
export interface RateLimitRule {
  id: string
  name: string
  identifier: 'global' | 'project' | 'apikey' | 'user'
  key?: string
  limit: number
  windowSec: number
  projectId?: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export async function getRateLimits(): Promise<{ code: number; msg: string; data: RateLimitRule[] }> {
  return request('/admin/rate-limits')
}

export async function createRateLimit(data: {
  name: string
  identifier: 'global' | 'project' | 'apikey' | 'user'
  key?: string
  limit: number
  windowSec: number
  projectId?: string
  enabled?: boolean
}): Promise<{ code: number; msg: string; data: RateLimitRule }> {
  return request('/admin/rate-limits', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateRateLimit(id: string, data: {
  name?: string
  identifier?: 'global' | 'project' | 'apikey' | 'user'
  key?: string
  limit?: number
  windowSec?: number
  projectId?: string
  enabled?: boolean
}): Promise<{ code: number; msg: string; data: RateLimitRule }> {
  return request(`/admin/rate-limits/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteRateLimit(id: string): Promise<{ code: number; msg: string }> {
  return request(`/admin/rate-limits/${id}`, { method: 'DELETE' })
}

// Leaderboards
export interface Leaderboard {
  id: string
  projectId: string
  name: string
  description?: string
  metric: 'higher' | 'lower'
  updateStrategy: 'realtime' | 'scheduled'
  resetSchedule?: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface LeaderboardEntry {
  id: string
  leaderboardId: string
  oderId: string
  score: number
  metadata?: any
  rank?: number
  createdAt: string
  updatedAt: string
}

export async function getLeaderboards(query?: string): Promise<{ code: number; msg: string; data: Leaderboard[] }> {
  return request(`/admin/leaderboards${query || ''}`)
}

export async function getLeaderboard(id: string): Promise<{ code: number; msg: string; data: Leaderboard }> {
  return request(`/admin/leaderboards/${id}`)
}

export async function createLeaderboard(data: {
  projectId: string
  name: string
  description?: string
  metric?: 'higher' | 'lower'
  updateStrategy?: 'realtime' | 'scheduled'
  resetSchedule?: string
  enabled?: boolean
}): Promise<{ code: number; msg: string; data: Leaderboard }> {
  return request('/admin/leaderboards', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateLeaderboard(id: string, data: {
  name?: string
  description?: string
  metric?: 'higher' | 'lower'
  updateStrategy?: 'realtime' | 'scheduled'
  resetSchedule?: string
  enabled?: boolean
}): Promise<{ code: number; msg: string; data: Leaderboard }> {
  return request(`/admin/leaderboards/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteLeaderboard(id: string): Promise<{ code: number; msg: string }> {
  return request(`/admin/leaderboards/${id}`, { method: 'DELETE' })
}

export async function getLeaderboardEntries(id: string, page = 1, limit = 20): Promise<{
  code: number
  msg: string
  data: LeaderboardEntry[]
  pagination: { page: number; limit: number; total: number }
}> {
  return request(`/admin/leaderboards/${id}/entries?page=${page}&limit=${limit}`)
}

export async function deleteLeaderboardEntry(leaderboardId: string, entryId: string): Promise<{ code: number; msg: string }> {
  return request(`/admin/leaderboards/${leaderboardId}/entries/${entryId}`, { method: 'DELETE' })
}

// Alert Rules
export interface AlertRule {
  id: string
  name: string
  metric: 'error_rate' | 'response_time' | 'quota'
  threshold: number
  condition: string
  windowMin: number
  notifyWebhook?: string
  notifyEmail?: string
  enabled: boolean
  projectId?: string
  createdAt: string
  updatedAt: string
}

export async function getAlertRules(): Promise<{ code: number; msg: string; data: AlertRule[] }> {
  return request('/admin/alerts')
}

export async function createAlertRule(data: {
  name: string
  metric: string
  threshold: number
  condition?: string
  windowMin?: number
  notifyWebhook?: string
  notifyEmail?: string
  projectId?: string
}): Promise<{ code: number; msg: string; data: AlertRule }> {
  return request('/admin/alerts', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateAlertRule(id: string, data: Partial<AlertRule>): Promise<{ code: number; msg: string; data: AlertRule }> {
  return request(`/admin/alerts/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteAlertRule(id: string): Promise<{ code: number; msg: string }> {
  return request(`/admin/alerts/${id}`, { method: 'DELETE' })
}

export async function checkAlerts(): Promise<{ code: number; msg: string; data: any[] }> {
  return request('/admin/alerts/check', { method: 'POST' })
}

// Metrics
export interface MetricsOverview {
  totalCalls: number
  weekCalls: number
  errorRate: number
  avgDuration: number
  p95: number
  p99: number
  dailyTrend: { date: string; count: number; avgDuration: number; errorRate: number }[]
}

export async function getMetricsOverview(): Promise<{ code: number; msg: string; data: MetricsOverview }> {
  return request('/admin/alerts/metrics/overview')
}

export interface SlowQuery {
  id: string
  projectId: string
  endpoint: string
  method: string
  statusCode: number
  durationMs: number
  timestamp: string
}

export async function getSlowQueries(page = 1, limit = 20): Promise<{ code: number; msg: string; data: SlowQuery[]; pagination: { page: number; limit: number; total: number } }> {
  return request(`/admin/alerts/metrics/slow-queries?page=${page}&limit=${limit}`)
}

export interface ProjectUsage {
  totalCalls: number
  errorCount: number
  errorRate: number
  dailyCounts: Record<string, number>
  topEndpoints: { endpoint: string; count: number }[]
}

export async function getProjectUsage(projectId: string, days = 30): Promise<{ code: number; msg: string; data: ProjectUsage }> {
  return request(`/admin/alerts/metrics/project/${projectId}/usage?days=${days}`)
}

// Webhook Deliveries
export interface WebhookDelivery {
  id: string
  webhookId: string
  event: string
  payload: any
  response?: string
  statusCode?: number
  success: boolean
  attempt: number
  createdAt: string
}

export async function getWebhookDeliveries(webhookId: string, page = 1, limit = 20): Promise<{ success: boolean; data: WebhookDelivery[]; pagination?: { page: number; limit: number; total: number } }> {
  return request(`/webhooks/${webhookId}/deliveries?page=${page}&limit=${limit}`)
}

export async function retryDelivery(id: string): Promise<{ success: boolean }> {
  return request(`/webhooks/deliveries/${id}/retry`, { method: 'POST' })
}

// Project Members
export interface ProjectMember {
  id: string
  userId: string
  role: string
  user: { email: string; name?: string }
}

export async function getProjectMembers(projectId: string): Promise<{ code: number; msg: string; data: ProjectMember[] }> {
  return request(`/admin/projects/${projectId}/members`)
}

export async function addProjectMember(projectId: string, userId: string, role: string): Promise<{ code: number; msg: string; data: ProjectMember }> {
  return request(`/admin/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ userId, role }) })
}

export async function removeProjectMember(projectId: string, memberId: string): Promise<{ code: number; msg: string }> {
  return request(`/admin/projects/${projectId}/members/${memberId}`, { method: 'DELETE' })
}