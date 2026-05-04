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

  subscribe(eventHandler: (event: string, data: any) => void): () => void {
    const baseUrl = this.config.baseUrl ?? 'http://localhost:3000'
    const url = `${baseUrl}/realtime/events/${this.config.projectId}?apiKey=${encodeURIComponent(this.config.apiKey)}`
    const eventSource = new EventSource(url)

    const handler = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data)
        eventHandler(msg.event, msg.data)
      } catch {}
    }
    eventSource.onmessage = handler

    return () => eventSource.close()
  }
}
