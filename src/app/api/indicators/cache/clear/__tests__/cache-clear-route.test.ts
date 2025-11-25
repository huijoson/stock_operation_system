import { NextRequest } from 'next/server'

// Create mock functions that will be used in the mock implementation
const mockInvalidate = jest.fn()
const mockClear = jest.fn()
const mockGetStats = jest.fn()

// Mock the cache service
jest.mock('@/services/indicator-cache.service', () => {
  const mockInvalidateFn = jest.fn()
  const mockClearFn = jest.fn()
  const mockGetStatsFn = jest.fn()
  
  return {
    IndicatorCacheService: jest.fn().mockImplementation(() => ({
      invalidate: mockInvalidateFn,
      clear: mockClearFn,
      getStats: mockGetStatsFn
    })),
    // Export the mocks so we can access them
    __mockInvalidate: mockInvalidateFn,
    __mockClear: mockClearFn,
    __mockGetStats: mockGetStatsFn
  }
})

// Import route after mocking
import { POST, GET } from '../route'
import * as CacheModule from '@/services/indicator-cache.service'

// Get the mock functions
const getMockInvalidate = () => (CacheModule as any).__mockInvalidate
const getMockClear = () => (CacheModule as any).__mockClear
const getMockGetStats = () => (CacheModule as any).__mockGetStats

describe('Cache Clear API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/indicators/cache/clear', () => {
    it('should clear cache for specific symbol', async () => {
      const mockInvalidate = getMockInvalidate()
      mockInvalidate.mockResolvedValue(undefined)

      const request = new NextRequest(
        'http://localhost:3000/api/indicators/cache/clear?symbol=AAPL'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.symbol).toBe('AAPL')
      expect(data.message).toContain('AAPL')
      expect(mockInvalidate).toHaveBeenCalledWith('AAPL')
    })

    it('should clear all cache when no symbol provided', async () => {
      const mockClear = getMockClear()
      mockClear.mockResolvedValue(42)

      const request = new NextRequest(
        'http://localhost:3000/api/indicators/cache/clear'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.count).toBe(42)
      expect(data.message).toContain('All cache cleared')
      expect(mockClear).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      const mockClear = getMockClear()
      mockClear.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest(
        'http://localhost:3000/api/indicators/cache/clear'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })
  })

  describe('GET /api/indicators/cache/clear', () => {
    it('should return cache statistics', async () => {
      const mockGetStats = getMockGetStats()
      const mockStats = {
        totalEntries: 100,
        expiredEntries: 10,
        byIndicatorType: {
          RSI: 30,
          MACD: 25,
          BOLLINGER: 20,
          ATR: 15,
          FIBONACCI: 10
        }
      }

      mockGetStats.mockResolvedValue(mockStats)

      const request = new NextRequest(
        'http://localhost:3000/api/indicators/cache/clear'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.stats).toEqual(mockStats)
      expect(mockGetStats).toHaveBeenCalled()
    })

    it('should handle errors when getting stats', async () => {
      const mockGetStats = getMockGetStats()
      mockGetStats.mockRejectedValue(new Error('Stats error'))

      const request = new NextRequest(
        'http://localhost:3000/api/indicators/cache/clear'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Stats error')
    })
  })
})
