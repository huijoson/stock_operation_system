import apiClient from './api-client'

export const TransactionApi = {
  async create<T = unknown, D = unknown>(payload: D): Promise<T> {
    const { data } = await apiClient.post<T>('/transactions', payload)
    return data
  },

  async update<T = unknown, D = unknown>(id: string, payload: D): Promise<T> {
    const { data } = await apiClient.put<T>(`/transactions/${id}`, payload)
    return data
  },

  async delete<T = unknown>(id: string): Promise<T> {
    const { data } = await apiClient.delete<T>(`/transactions/${id}`)
    return data
  },

  async createBulk<T = unknown>(payload: {
    portfolioId: string
    transactions: Array<{
      symbol: string
      type: 'BUY' | 'SELL'
      quantity: number
      price: number
      date: string
    }>
  }): Promise<T> {
    const { data } = await apiClient.post<T>('/transactions/bulk', payload)
    return data
  },

  async exportCsv(portfolioId: string): Promise<Blob> {
    const { data } = await apiClient.get<Blob>('/transactions/export', {
      params: { portfolioId },
      responseType: 'blob',
    })
    return data
  },

  async importCsv<T = unknown>(file: File, format: string, portfolioId?: string): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('format', format)
    if (portfolioId) {
      formData.append('portfolioId', portfolioId)
    }

    const { data } = await apiClient.post<T>('/transactions/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return data
  },
}

