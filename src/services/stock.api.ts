import apiClient from './api-client'

export const StockApi = {
  async search<T = unknown>(keyword: string): Promise<T> {
    const { data } = await apiClient.get<T>('/stocks/search', {
      params: { q: keyword },
    })
    return data
  },

  async getPrice<T = unknown>(symbol: string): Promise<T> {
    const { data } = await apiClient.get<T>(`/stocks/${symbol}/price`)
    return data
  },

  async getHistory<T = unknown>(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<T> {
    const { data } = await apiClient.get<T>(`/stocks/${symbol}/history`, {
      params: { startDate, endDate },
    })
    return data
  },

  async getHistoryByDays<T = unknown>(symbol: string, days: number): Promise<T> {
    const { data } = await apiClient.get<T>(`/stocks/${symbol}/history`, {
      params: { days },
    })
    return data
  },
}
