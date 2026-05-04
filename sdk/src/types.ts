export interface MangoConfig {
  projectId: string
  apiKey: string
  baseUrl?: string
}

export interface Collection {
  id: string
  projectId: string
  name: string
  schema?: Record<string, unknown>
  strict: boolean
  createdAt: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages?: number
}

export interface QueryParams {
  filter?: Record<string, unknown>
  search?: string
  sort?: string
  page?: number
  limit?: number
}

export interface QueryResult<T> {
  data: T[]
  pagination: Pagination
}

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
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface RankedEntry extends LeaderboardEntry {
  rank: number
}

export interface AroundResult {
  entry: LeaderboardEntry
  rank: number
  above: LeaderboardEntry[]
  below: LeaderboardEntry[]
}

export class ApiRequestError extends Error {
  code: number
  body: unknown

  constructor(code: number, message: string, body: unknown) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = code
    this.body = body
  }
}
