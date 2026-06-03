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
    // Read the file on the client and send its text in a JSON body. The backend
    // /transactions/import handler reads `req.body.file` as a string (no multer
    // dependency required).
    const fileContent = await file.text()

    const { data } = await apiClient.post<T>('/transactions/import', {
      file: fileContent,
      format,
      portfolioId,
    })

    return data
  },
}

