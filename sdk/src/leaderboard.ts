import { MangoConfig, Leaderboard, LeaderboardEntry, RankedEntry, AroundResult } from './types.js'
import { request } from './client.js'

export class LeaderboardAPI {
  private config: MangoConfig

  constructor(config: MangoConfig) {
    this.config = config
  }

  async getBoards(): Promise<Leaderboard[]> {
    const res = await request<{ code: number; data: Leaderboard[] }>(
      this.config,
      '/api/leaderboards'
    )
    return res.data
  }

  async submit(boardId: string, oderId: string, score: number, metadata?: Record<string, unknown>): Promise<LeaderboardEntry> {
    const res = await request<{ code: number; data: LeaderboardEntry }>(
      this.config,
      `/api/leaderboards/${boardId}/submit`,
      { method: 'POST', body: JSON.stringify({ oderId, score, metadata }) }
    )
    return res.data
  }

  async getTop(boardId: string, n = 10): Promise<LeaderboardEntry[]> {
    const res = await request<{ code: number; data: LeaderboardEntry[] }>(
      this.config,
      `/api/leaderboards/${boardId}/top?n=${Math.min(n, 100)}`
    )
    return res.data
  }

  async getRank(boardId: string, oderId: string): Promise<RankedEntry> {
    const res = await request<{ code: number; data: RankedEntry }>(
      this.config,
      `/api/leaderboards/${boardId}/rank/${oderId}`
    )
    return res.data
  }

  async getAround(boardId: string, oderId: string, range = 5): Promise<AroundResult> {
    const res = await request<{ code: number; data: AroundResult }>(
      this.config,
      `/api/leaderboards/${boardId}/around/${oderId}?range=${Math.min(range, 20)}`
    )
    return res.data
  }
}
