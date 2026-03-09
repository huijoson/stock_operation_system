import apiClient from './api-client'

type QueryParams = Record<string, string | number | boolean | undefined>

export const RealizedPlApi = {
  async query<T = unknown>(params?: QueryParams): Promise<T> {
    const { data } = await apiClient.get<T>('/realized-pl', { params })
    return data
  },

  async getByPortfolio<T = unknown>(
    portfolioId: string,
    params?: QueryParams
  ): Promise<T> {
    const { data } = await apiClient.get<T>(`/realized-pl/portfolio/${portfolioId}`, { params })
    return data
  },
}

