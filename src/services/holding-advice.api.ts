import apiClient from './api-client'

export const HoldingAdviceApi = {
  async getBySymbol<T = unknown>(symbol: string): Promise<T> {
    const { data } = await apiClient.get<T>(`/holding-advice/${symbol}`)
    return data
  },

  async getByPortfolio<T = unknown>(portfolioId: string): Promise<T> {
    const { data } = await apiClient.get<T>(`/holding-advice/portfolio/${portfolioId}`)
    return data
  },
}

