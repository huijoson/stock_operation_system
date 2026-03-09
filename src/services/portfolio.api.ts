import apiClient from './api-client'

export const PortfolioApi = {
  async getAll<T = unknown>(): Promise<T> {
    const { data } = await apiClient.get<T>('/portfolios')
    return data
  },

  async create<T = unknown, D = unknown>(payload: D): Promise<T> {
    const { data } = await apiClient.post<T>('/portfolios', payload)
    return data
  },

  async getById<T = unknown>(id: string): Promise<T> {
    const { data } = await apiClient.get<T>(`/portfolios/${id}`)
    return data
  },

  async update<T = unknown, D = unknown>(id: string, payload: D): Promise<T> {
    const { data } = await apiClient.put<T>(`/portfolios/${id}`, payload)
    return data
  },

  async delete<T = unknown>(id: string): Promise<T> {
    const { data } = await apiClient.delete<T>(`/portfolios/${id}`)
    return data
  },

  async getHoldings<T = unknown>(id: string): Promise<T> {
    const { data } = await apiClient.get<T>(`/portfolios/${id}/holdings`)
    return data
  },

  async getTransactions<T = unknown>(id: string): Promise<T> {
    const { data } = await apiClient.get<T>(`/portfolios/${id}/transactions`)
    return data
  },

  async exportHoldingsCsv(portfolioId: string): Promise<Blob> {
    const { data } = await apiClient.get<Blob>('/holdings/export', {
      params: { portfolioId },
      responseType: 'blob',
    })
    return data
  },
}

