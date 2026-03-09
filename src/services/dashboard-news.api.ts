import apiClient from './api-client'

type DashboardNewsQueryParams = {
  category?: string
  limit?: number
  cursor?: string
}

export const DashboardNewsApi = {
  async getDashboardNews<T = unknown>(params?: DashboardNewsQueryParams): Promise<T> {
    const { data } = await apiClient.get<T>('/dashboard/news', { params })
    return data
  },

  async syncDashboardNews<T = unknown>(): Promise<T> {
    const { data } = await apiClient.post<T>('/sync/dashboard-news')
    return data
  },
}

