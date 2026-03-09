import apiClient from './api-client'

export const AuthApi = {
  async login<T = unknown>(email: string, password: string): Promise<T> {
    const { data } = await apiClient.post<T>('/auth/login', { email, password })
    return data
  },

  async logout<T = unknown>(): Promise<T> {
    const { data } = await apiClient.post<T>('/auth/logout')
    return data
  },

  async register<T = unknown>(email: string, password: string, name?: string): Promise<T> {
    const { data } = await apiClient.post<T>('/auth/register', { email, password, name })
    return data
  },

  async getCurrentUser<T = unknown>(): Promise<T> {
    const { data } = await apiClient.get<T>('/auth/me')
    return data
  },
}

