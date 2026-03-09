import apiClient from './api-client'

export const RiskAssessmentApi = {
  async getBySymbol<T = unknown>(symbol: string): Promise<T> {
    const { data } = await apiClient.get<T>(`/risk-assessment/${symbol}`)
    return data
  },

  async batchAssess<T = unknown>(symbols: string[]): Promise<T> {
    const { data } = await apiClient.post<T>('/risk-assessment/batch', { symbols })
    return data
  },

  async getByPortfolio<T = unknown>(portfolioId: string): Promise<T> {
    const { data } = await apiClient.get<T>(`/risk-assessment/portfolio/${portfolioId}`)
    return data
  },
}

