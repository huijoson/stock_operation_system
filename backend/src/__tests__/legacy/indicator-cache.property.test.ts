import * as fc from 'fast-check'
import { IndicatorCacheService } from '@/services/indicator-cache.service'
import prisma from '@/lib/prisma'

// These tests require a real PostgreSQL database. Skip when no DATABASE_URL is
// set (e.g. local runs without a DB); CI provides a Postgres service.
const describeDb = process.env.DATABASE_URL ? describe : describe.skip

describeDb('IndicatorCacheService - Property-Based Tests', () => {
  let service: IndicatorCacheService

  beforeEach(() => {
    service = new IndicatorCacheService()
  })

  // Clean up test data after each test
  afterEach(async () => {
    await prisma.indicatorCache.deleteMany({
      where: {
        symbol: {
          startsWith: 'TEST_'
        }
      }
    })
  })

  // Custom arbitraries for generating test data
  const arbitrarySymbol = () => fc.string({ minLength: 1, maxLength: 10 })
    .map(s => `TEST_${s.toUpperCase().replace(/[^A-Z0-9]/g, '')}`)
    .filter(s => s.length > 5) // Ensure we have at least TEST_X

  const arbitraryIndicatorType = () => fc.constantFrom(
    'RSI',
    'MACD',
    'BOLLINGER',
    'ATR',
    'FIBONACCI',
    'SUPPORT_RESISTANCE'
  )

  const arbitraryPeriod = () => fc.integer({ min: 1, max: 200 })

  const arbitraryIndicatorData = () => fc.record({
    value: fc.double({ min: 0, max: 100, noNaN: true }),
    timestamp: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
    metadata: fc.record({
      calculated: fc.boolean(),
      source: fc.constantFrom('api', 'cache', 'calculation')
    })
  })

  /**
   * Feature: technical-indicators, Property 23: 快取命中返回
   * Validates: Requirements 11.2
   * 
   * Property: For any cached indicator query, the system should directly return
   * cached data without recalculation when cache is valid.
   */
  describe('Property 23: Cache Hit Return', () => {
    it('should return the same data that was set when cache is valid', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitrarySymbol(),
          arbitraryIndicatorType(),
          arbitraryPeriod(),
          arbitraryIndicatorData(),
          async (symbol, indicatorType, period, data) => {
            // Arrange: Set cache with data
            await service.set(symbol, indicatorType, period, data, 1)

            // Act: Get the cached data
            const cached = await service.get(symbol, indicatorType, period)

            // Assert: Should return the exact data we set
            expect(cached).not.toBeNull()
            expect(cached?.symbol).toBe(symbol)
            expect(cached?.indicatorType).toBe(indicatorType)
            expect(cached?.period).toBe(period)
            expect(cached?.data).toEqual(data)
            
            // Assert: Should have valid expiration time (in the future)
            expect(cached?.expiresAt.getTime()).toBeGreaterThan(Date.now())
          }
        ),
        { numRuns: 100 }
      )
    }, 30000) // 30 second timeout for database operations

    it('should return null for cache miss', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitrarySymbol(),
          arbitraryIndicatorType(),
          arbitraryPeriod(),
          async (symbol, indicatorType, period) => {
            // Act: Try to get non-existent cache
            const cached = await service.get(symbol, indicatorType, period)

            // Assert: Should return null for cache miss
            expect(cached).toBeNull()
          }
        ),
        { numRuns: 50 }
      )
    }, 30000)

    it('should return null when cache has expired', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitrarySymbol(),
          arbitraryIndicatorType(),
          arbitraryPeriod(),
          arbitraryIndicatorData(),
          async (symbol, indicatorType, period, data) => {
            // Arrange: Set cache with very short TTL (0.001 hours = 3.6 seconds)
            await service.set(symbol, indicatorType, period, data, 0.001)

            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 4000))

            // Act: Try to get expired cache
            const cached = await service.get(symbol, indicatorType, period)

            // Assert: Should return null for expired cache
            expect(cached).toBeNull()
          }
        ),
        { numRuns: 10 } // Fewer runs due to timeout
      )
    }, 60000) // 60 second timeout due to sleep
  })

  /**
   * Feature: technical-indicators, Property 24: 快取失效機制
   * Validates: Requirements 11.3
   * 
   * Property: For any stock, when its price data is updated, the system should
   * automatically clear all indicator caches for that stock.
   */
  describe('Property 24: Cache Invalidation Mechanism', () => {
    it('should clear all cache entries for a symbol when invalidated', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitrarySymbol(),
          fc.array(arbitraryIndicatorType(), { minLength: 1, maxLength: 5 }),
          fc.array(arbitraryPeriod(), { minLength: 1, maxLength: 3 }),
          arbitraryIndicatorData(),
          async (symbol, indicatorTypes, periods, data) => {
            // Arrange: Set multiple cache entries for the same symbol
            for (const indicatorType of indicatorTypes) {
              for (const period of periods) {
                await service.set(symbol, indicatorType, period, data, 1)
              }
            }

            // Verify caches exist
            for (const indicatorType of indicatorTypes) {
              for (const period of periods) {
                const cached = await service.get(symbol, indicatorType, period)
                expect(cached).not.toBeNull()
              }
            }

            // Act: Invalidate all caches for this symbol
            await service.invalidate(symbol)

            // Assert: All caches for this symbol should be cleared
            for (const indicatorType of indicatorTypes) {
              for (const period of periods) {
                const cached = await service.get(symbol, indicatorType, period)
                expect(cached).toBeNull()
              }
            }
          }
        ),
        { numRuns: 50 }
      )
    }, 60000)

    it('should not affect caches for other symbols when invalidating one symbol', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(arbitrarySymbol(), arbitrarySymbol()).filter(([s1, s2]) => s1 !== s2),
          arbitraryIndicatorType(),
          arbitraryPeriod(),
          arbitraryIndicatorData(),
          async ([symbol1, symbol2], indicatorType, period, data) => {
            // Arrange: Set cache for two different symbols
            await service.set(symbol1, indicatorType, period, data, 1)
            await service.set(symbol2, indicatorType, period, data, 1)

            // Act: Invalidate cache for symbol1 only
            await service.invalidate(symbol1)

            // Assert: symbol1 cache should be cleared
            const cached1 = await service.get(symbol1, indicatorType, period)
            expect(cached1).toBeNull()

            // Assert: symbol2 cache should still exist
            const cached2 = await service.get(symbol2, indicatorType, period)
            expect(cached2).not.toBeNull()
            expect(cached2?.symbol).toBe(symbol2)
          }
        ),
        { numRuns: 50 }
      )
    }, 60000)

    it('should successfully clear all caches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbitrarySymbol(), { minLength: 2, maxLength: 5 }),
          arbitraryIndicatorType(),
          arbitraryPeriod(),
          arbitraryIndicatorData(),
          async (symbols, indicatorType, period, data) => {
            // Arrange: Set cache for multiple symbols
            for (const symbol of symbols) {
              await service.set(symbol, indicatorType, period, data, 1)
            }

            // Get unique symbol count (since duplicates only create one cache entry)
            const uniqueSymbols = new Set(symbols)

            // Act: Clear all caches
            const count = await service.clear()

            // Assert: Should have cleared at least the number of unique symbols we added
            expect(count).toBeGreaterThanOrEqual(uniqueSymbols.size)

            // Assert: All caches should be cleared
            for (const symbol of symbols) {
              const cached = await service.get(symbol, indicatorType, period)
              expect(cached).toBeNull()
            }
          }
        ),
        { numRuns: 20 }
      )
    }, 60000)
  })

  /**
   * Additional property: Cache update should overwrite existing data
   */
  describe('Additional Property: Cache Update', () => {
    it('should overwrite existing cache when setting with same key', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitrarySymbol(),
          arbitraryIndicatorType(),
          arbitraryPeriod(),
          arbitraryIndicatorData(),
          arbitraryIndicatorData(),
          async (symbol, indicatorType, period, data1, data2) => {
            // Arrange: Set initial cache
            await service.set(symbol, indicatorType, period, data1, 1)

            // Act: Update cache with new data
            await service.set(symbol, indicatorType, period, data2, 1)

            // Get the cached data
            const cached = await service.get(symbol, indicatorType, period)

            // Assert: Should return the updated data, not the original
            expect(cached).not.toBeNull()
            expect(cached?.data).toEqual(data2)
            expect(cached?.data).not.toEqual(data1)
          }
        ),
        { numRuns: 50 }
      )
    }, 30000)
  })
})
