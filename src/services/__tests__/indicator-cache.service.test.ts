import { IndicatorCacheService } from '../indicator-cache.service'
import prisma from '@/lib/db/prisma'

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    indicatorCache: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    }
  }
}))

describe('IndicatorCacheService', () => {
  let service: IndicatorCacheService

  beforeEach(() => {
    service = new IndicatorCacheService()
    jest.clearAllMocks()
  })

  describe('get', () => {
    it('should return cached data when cache hit and not expired', async () => {
      // Use a future expiration date to ensure it's not expired
      const futureDate = new Date(Date.now() + 3600000) // 1 hour from now
      
      const mockCached = {
        id: 'cache-1',
        symbol: 'AAPL',
        indicatorType: 'RSI',
        period: 14,
        data: { value: 65.5 },
        calculatedAt: new Date(),
        expiresAt: futureDate,
        createdAt: new Date()
      }

      ;(prisma.indicatorCache.findUnique as jest.Mock).mockResolvedValue(mockCached)

      const result = await service.get('AAPL', 'RSI', 14)

      expect(result).toEqual({
        id: 'cache-1',
        symbol: 'AAPL',
        indicatorType: 'RSI',
        period: 14,
        data: { value: 65.5 },
        calculatedAt: mockCached.calculatedAt,
        expiresAt: mockCached.expiresAt
      })
      expect(prisma.indicatorCache.findUnique).toHaveBeenCalledWith({
        where: {
          symbol_indicatorType_period: {
            symbol: 'AAPL',
            indicatorType: 'RSI',
            period: 14
          }
        }
      })
    })

    it('should return null when cache miss', async () => {
      ;(prisma.indicatorCache.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await service.get('AAPL', 'RSI', 14)

      expect(result).toBeNull()
    })

    it('should delete and return null when cache expired', async () => {
      // Use a past expiration date to ensure it's expired
      const pastDate = new Date(Date.now() - 3600000) // 1 hour ago
      
      const mockCached = {
        id: 'cache-1',
        symbol: 'AAPL',
        indicatorType: 'RSI',
        period: 14,
        data: { value: 65.5 },
        calculatedAt: new Date(Date.now() - 7200000), // 2 hours ago
        expiresAt: pastDate,
        createdAt: new Date(Date.now() - 7200000)
      }

      ;(prisma.indicatorCache.findUnique as jest.Mock).mockResolvedValue(mockCached)
      ;(prisma.indicatorCache.delete as jest.Mock).mockResolvedValue(mockCached)

      const result = await service.get('AAPL', 'RSI', 14)

      expect(result).toBeNull()
      expect(prisma.indicatorCache.delete).toHaveBeenCalledWith({
        where: { id: 'cache-1' }
      })
    })

    it('should return null on error', async () => {
      ;(prisma.indicatorCache.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'))

      const result = await service.get('AAPL', 'RSI', 14)

      expect(result).toBeNull()
    })
  })

  describe('set', () => {
    it('should create new cache entry with default TTL', async () => {
      const mockData = { value: 65.5, history: [60, 62, 65.5] }
      ;(prisma.indicatorCache.upsert as jest.Mock).mockResolvedValue({})

      const now = new Date('2024-01-01T10:00:00Z')
      jest.spyOn(global, 'Date').mockImplementation(() => now as any)

      await service.set('AAPL', 'RSI', 14, mockData)

      expect(prisma.indicatorCache.upsert).toHaveBeenCalledWith({
        where: {
          symbol_indicatorType_period: {
            symbol: 'AAPL',
            indicatorType: 'RSI',
            period: 14
          }
        },
        update: {
          data: JSON.stringify(mockData),
          calculatedAt: now,
          expiresAt: new Date('2024-01-01T11:00:00Z') // 1 hour later
        },
        create: {
          symbol: 'AAPL',
          indicatorType: 'RSI',
          period: 14,
          data: JSON.stringify(mockData),
          calculatedAt: now,
          expiresAt: new Date('2024-01-01T11:00:00Z')
        }
      })
    })

    it('should create cache entry with custom TTL', async () => {
      const mockData = { value: 65.5 }
      ;(prisma.indicatorCache.upsert as jest.Mock).mockResolvedValue({})

      const now = new Date('2024-01-01T10:00:00Z')
      jest.spyOn(global, 'Date').mockImplementation(() => now as any)

      await service.set('AAPL', 'RSI', 14, mockData, 2)

      const call = (prisma.indicatorCache.upsert as jest.Mock).mock.calls[0][0]
      expect(call.update.expiresAt).toEqual(new Date('2024-01-01T12:00:00Z')) // 2 hours later
    })

    it('should not throw on error', async () => {
      ;(prisma.indicatorCache.upsert as jest.Mock).mockRejectedValue(new Error('DB error'))

      await expect(service.set('AAPL', 'RSI', 14, {})).resolves.not.toThrow()
    })
  })

  describe('invalidate', () => {
    it('should delete all cache entries for a symbol', async () => {
      ;(prisma.indicatorCache.deleteMany as jest.Mock).mockResolvedValue({ count: 5 })

      await service.invalidate('AAPL')

      expect(prisma.indicatorCache.deleteMany).toHaveBeenCalledWith({
        where: { symbol: 'AAPL' }
      })
    })

    it('should not throw on error', async () => {
      ;(prisma.indicatorCache.deleteMany as jest.Mock).mockRejectedValue(new Error('DB error'))

      await expect(service.invalidate('AAPL')).resolves.not.toThrow()
    })
  })

  describe('clear', () => {
    it('should delete all cache entries', async () => {
      ;(prisma.indicatorCache.deleteMany as jest.Mock).mockResolvedValue({ count: 100 })

      const result = await service.clear()

      expect(result).toBe(100)
      expect(prisma.indicatorCache.deleteMany).toHaveBeenCalledWith({})
    })

    it('should return 0 on error', async () => {
      ;(prisma.indicatorCache.deleteMany as jest.Mock).mockRejectedValue(new Error('DB error'))

      const result = await service.clear()

      expect(result).toBe(0)
    })
  })

  describe('cleanExpired', () => {
    it('should delete expired cache entries', async () => {
      ;(prisma.indicatorCache.deleteMany as jest.Mock).mockResolvedValue({ count: 10 })

      const now = new Date('2024-01-01T12:00:00Z')
      jest.spyOn(global, 'Date').mockImplementation(() => now as any)

      const result = await service.cleanExpired()

      expect(result).toBe(10)
      expect(prisma.indicatorCache.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: now
          }
        }
      })
    })

    it('should return 0 on error', async () => {
      ;(prisma.indicatorCache.deleteMany as jest.Mock).mockRejectedValue(new Error('DB error'))

      const result = await service.cleanExpired()

      expect(result).toBe(0)
    })
  })

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      ;(prisma.indicatorCache.count as jest.Mock)
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(5)  // expired
      
      ;(prisma.indicatorCache.groupBy as jest.Mock).mockResolvedValue([
        { indicatorType: 'RSI', _count: 20 },
        { indicatorType: 'MACD', _count: 15 },
        { indicatorType: 'BOLLINGER', _count: 15 }
      ])

      const result = await service.getStats()

      expect(result).toEqual({
        totalEntries: 50,
        expiredEntries: 5,
        byIndicatorType: {
          RSI: 20,
          MACD: 15,
          BOLLINGER: 15
        }
      })
    })

    it('should return empty stats on error', async () => {
      ;(prisma.indicatorCache.count as jest.Mock).mockRejectedValue(new Error('DB error'))

      const result = await service.getStats()

      expect(result).toEqual({
        totalEntries: 0,
        expiredEntries: 0,
        byIndicatorType: {}
      })
    })
  })
})
