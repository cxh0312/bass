import { MangoConfig, ApiRequestError } from './types.js'
import { CollectionAPI } from './collection.js'
import { LeaderboardAPI } from './leaderboard.js'

export async function request<T>(config: MangoConfig, path: string, options?: RequestInit): Promise<T> {
  const baseUrl = config.baseUrl ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
      ...options?.headers,
    },
  })

  const body = await res.json()

  if (!res.ok || (body.code && body.code !== 0)) {
    throw new ApiRequestError(body.code ?? res.status, body.msg ?? `HTTP ${res.status}`, body)
  }

  return body as T
}

export class MangoClient {
  private config: MangoConfig

  constructor(config: MangoConfig) {
    this.config = config
  }

  collection(name: string): CollectionAPI {
    return new CollectionAPI(this.config, name)
  }

  get leaderboard(): LeaderboardAPI {
    return new LeaderboardAPI(this.config)
  }
}
