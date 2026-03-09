import apiClient from './api-client'

export const NewsApi = {
  async getBySymbol<T = unknown>(symbol: string): Promise<T> {
    const { data } = await apiClient.get<T>(`/news/${symbol}`)
    return data
  },

  async getSources<T = unknown>(): Promise<T> {
    const { data } = await apiClient.get<T>('/news/sources')
    return data
  },

  async getSentiment<T = unknown>(symbol: string): Promise<T> {
    const { data } = await apiClient.get<T>(`/news/sentiment/${symbol}`)
    return data
  },

  async getPortfolioNews<T = unknown>(portfolioId: string): Promise<T> {
    const { data } = await apiClient.get<T>(`/news/portfolio/${portfolioId}`)
    return data
  },

  async getDashboardNews<T = unknown>(): Promise<T> {
    const { data } = await apiClient.get<T>('/dashboard/news')
    return data
  },
}

