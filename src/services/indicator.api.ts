import apiClient from './api-client'

export const IndicatorApi = {
  async getRSI<T = unknown>(symbol: string, period: number): Promise<T> {
    const { data } = await apiClient.get<T>('/indicators/rsi', {
      params: { symbol, period },
    })
    return data
  },

  async getMACD<T = unknown>(
    symbol: string,
    fastPeriod: number,
    slowPeriod: number,
    signalPeriod: number
  ): Promise<T> {
    const { data } = await apiClient.get<T>('/indicators/macd', {
      params: { symbol, fastPeriod, slowPeriod, signalPeriod },
    })
    return data
  },

  async getBollinger<T = unknown>(
    symbol: string,
    period: number,
    stdDev: number
  ): Promise<T> {
    const { data } = await apiClient.get<T>('/indicators/bollinger', {
      params: { symbol, period, stdDev },
    })
    return data
  },

  async getATR<T = unknown>(symbol: string, period: number): Promise<T> {
    const { data } = await apiClient.get<T>('/indicators/atr', {
      params: { symbol, period },
    })
    return data
  },

  async getTechnicalScore<T = unknown>(symbol: string): Promise<T> {
    const { data } = await apiClient.get<T>('/indicators/technical-score', {
      params: { symbol },
    })
    return data
  },

  async getCandlestickPatterns<T = unknown>(symbol: string): Promise<T> {
    const { data } = await apiClient.get<T>('/indicators/candlestick-patterns', {
      params: { symbol },
    })
    return data
  },

  async getSupportResistance<T = unknown>(symbol: string): Promise<T> {
    const { data } = await apiClient.get<T>('/indicators/support-resistance', {
      params: { symbol },
    })
    return data
  },

  async getFibonacciRetracement<T = unknown>(
    high: number,
    low: number,
    isUptrend: boolean
  ): Promise<T> {
    const { data } = await apiClient.get<T>('/indicators/fibonacci/retracement', {
      params: { high, low, isUptrend },
    })
    return data
  },

  async getFibonacciExtension<T = unknown>(
    start: number,
    retracement: number,
    breakout: number
  ): Promise<T> {
    const { data } = await apiClient.get<T>('/indicators/fibonacci/extension', {
      params: { start, retracement, breakout },
    })
    return data
  },
}
