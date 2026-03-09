import apiClient from './api-client'

export const StrategyApi = {
  async getAll<T = unknown>(): Promise<T> {
    const { data } = await apiClient.get<T>('/strategies')
    return data
  },

  async create<T = unknown, D = unknown>(payload: D): Promise<T> {
    const { data } = await apiClient.post<T>('/strategies', payload)
    return data
  },

  async getById<T = unknown>(id: string): Promise<T> {
    const { data } = await apiClient.get<T>(`/strategies/${id}`)
    return data
  },

  async update<T = unknown, D = unknown>(id: string, payload: D): Promise<T> {
    const { data } = await apiClient.put<T>(`/strategies/${id}`, payload)
    return data
  },

  async delete<T = unknown>(id: string): Promise<T> {
    const { data } = await apiClient.delete<T>(`/strategies/${id}`)
    return data
  },

  async runBacktest<T = unknown>(
    id: string,
    params?: Record<string, string | number>
  ): Promise<T> {
    const { data } = await apiClient.get<T>(`/strategies/${id}/backtest`, { params })
    return data
  },
}

