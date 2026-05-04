import { MangoConfig, QueryParams, QueryResult } from './types.js'
import { request } from './client.js'

export class CollectionAPI {
  private config: MangoConfig
  private name: string

  constructor(config: MangoConfig, name: string) {
    this.config = config
    this.name = name
  }

  async create<T extends Record<string, unknown>>(data: T): Promise<T & { id: string }> {
    const res = await request<{ code: number; data: T & { id: string } }>(
      this.config,
      `/api/${this.config.projectId}/${this.name}`,
      { method: 'POST', body: JSON.stringify(data) }
    )
    return res.data
  }

  async get<T extends Record<string, unknown>>(id: string): Promise<T & { id: string }> {
    const res = await request<{ code: number; data: T & { id: string } }>(
      this.config,
      `/api/${this.config.projectId}/${this.name}/${id}`
    )
    return res.data
  }

  async query<T extends Record<string, unknown>>(params?: QueryParams): Promise<QueryResult<T>> {
    const sp = new URLSearchParams()
    if (params?.page) sp.set('page', String(params.page))
    if (params?.limit) sp.set('limit', String(params.limit))
    if (params?.sort) sp.set('sort', params.sort)
    if (params?.search) sp.set('search', params.search)
    if (params?.filter) sp.set('filter', JSON.stringify(params.filter))
    const qs = sp.toString()
    const res = await request<QueryResult<T>>(
      this.config,
      `/api/${this.config.projectId}/${this.name}${qs ? `?${qs}` : ''}`
    )
    return res
  }

  async update<T extends Record<string, unknown>>(id: string, data: T): Promise<T & { id: string }> {
    const res = await request<{ code: number; data: T & { id: string } }>(
      this.config,
      `/api/${this.config.projectId}/${this.name}/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    )
    return res.data
  }

  async delete(id: string): Promise<void> {
    await request(
      this.config,
      `/api/${this.config.projectId}/${this.name}/${id}`,
      { method: 'DELETE' }
    )
  }
}
