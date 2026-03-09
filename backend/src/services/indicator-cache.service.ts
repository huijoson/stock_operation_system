import prisma from '../lib/prisma'

/**
 * Cached indicator data structure
 */
export interface CachedIndicator {
  id: string
  symbol: string
  indicatorType: string
  period: number
  data: any
  calculatedAt: Date
  expiresAt: Date
}

/**
 * IndicatorCacheService handles caching of technical indicator calculations
 * to improve performance and reduce redundant computations.
 * 
 * Cache entries have a default TTL of 1 hour and are automatically invalidated
 * when stock price data is updated.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
export class IndicatorCacheService {
  private readonly DEFAULT_TTL_HOURS = 1

  /**
   * Generate a cache key from symbol, indicator type, and period
   * 
   * @param symbol - Stock symbol
   * @param indicatorType - Type of indicator (e.g., 'RSI', 'MACD', 'BOLLINGER')
   * @param period - Period parameter for the indicator
   * @returns Cache key string
   */
  private generateKey(symbol: string, indicatorType: string, period: number): string {
    return `${symbol}:${indicatorType}:${period}`
  }

  /**
   * Get cached indicator data
   * 
   * Returns cached data if it exists and hasn't expired.
   * Returns null if cache miss or data has expired.
   * 
   * @param symbol - Stock symbol
   * @param indicatorType - Type of indicator
   * @param period - Period parameter
   * @returns Cached indicator data or null
   * 
   * Requirements: 11.2
   * Property 23: Cache hit return
   */
  async get(
    symbol: string,
    indicatorType: string,
    period: number
  ): Promise<CachedIndicator | null> {
    try {
      const cached = await prisma.indicatorCache.findUnique({
        where: {
          symbol_indicatorType_period: {
            symbol,
            indicatorType,
            period
          }
        }
      })

      if (!cached) {
        return null
      }

      // Check if cache has expired
      const now = new Date()
      if (cached.expiresAt < now) {
        // Cache expired, delete it
        await prisma.indicatorCache.delete({
          where: { id: cached.id }
        })
        return null
      }

      // Parse JSON data and revive Date objects
      const parsedData = typeof cached.data === 'string' ? JSON.parse(cached.data, (key, value) => {
        // Revive Date objects from ISO strings
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
          return new Date(value)
        }
        return value
      }) : cached.data
      
      return {
        id: cached.id,
        symbol: cached.symbol,
        indicatorType: cached.indicatorType,
        period: cached.period,
        data: parsedData,
        calculatedAt: cached.calculatedAt,
        expiresAt: cached.expiresAt
      }
    } catch (error) {
      console.error('Error getting cached indicator:', error)
      return null
    }
  }

  /**
   * Store indicator data in cache
   * 
   * Creates or updates cache entry with the provided data and TTL.
   * Default TTL is 1 hour.
   * 
   * @param symbol - Stock symbol
   * @param indicatorType - Type of indicator
   * @param period - Period parameter
   * @param data - Indicator calculation result to cache
   * @param ttlHours - Time to live in hours (default: 1)
   * 
   * Requirements: 11.1, 11.5
   */
  async set(
    symbol: string,
    indicatorType: string,
    period: number,
    data: any,
    ttlHours: number = this.DEFAULT_TTL_HOURS
  ): Promise<void> {
    try {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000)

      // Serialize data to JSON string for SQLite compatibility
      const serializedData = typeof data === 'string' ? data : JSON.stringify(data)
      
      await prisma.indicatorCache.upsert({
        where: {
          symbol_indicatorType_period: {
            symbol,
            indicatorType,
            period
          }
        },
        update: {
          data: serializedData,
          calculatedAt: now,
          expiresAt
        },
        create: {
          symbol,
          indicatorType,
          period,
          data: serializedData,
          calculatedAt: now,
          expiresAt
        }
      })
    } catch (error) {
      console.error('Error setting cached indicator:', error)
      // Don't throw - cache failures should not break the application
    }
  }

  /**
   * Invalidate (clear) all cached indicators for a specific stock
   * 
   * This is called when stock price data is updated to ensure
   * indicators are recalculated with the latest data.
   * 
   * @param symbol - Stock symbol to invalidate cache for
   * 
   * Requirements: 11.3
   * Property 24: Cache invalidation mechanism
   */
  async invalidate(symbol: string): Promise<void> {
    try {
      await prisma.indicatorCache.deleteMany({
        where: { symbol }
      })
    } catch (error) {
      console.error('Error invalidating cache for symbol:', symbol, error)
      // Don't throw - cache failures should not break the application
    }
  }

  /**
   * Clear all cached indicators
   * 
   * Removes all cache entries from the database.
   * Useful for maintenance or when cache needs to be completely refreshed.
   * 
   * @returns Number of cache entries deleted
   * 
   * Requirements: 11.4
   */
  async clear(): Promise<number> {
    try {
      const result = await prisma.indicatorCache.deleteMany({})
      return result.count
    } catch (error) {
      console.error('Error clearing all cache:', error)
      return 0
    }
  }

  /**
   * Clean up expired cache entries
   * 
   * Removes all cache entries that have passed their expiration time.
   * This can be run periodically to keep the cache table clean.
   * 
   * @returns Number of expired entries deleted
   * 
   * Requirements: 11.5
   */
  async cleanExpired(): Promise<number> {
    try {
      const now = new Date()
      const result = await prisma.indicatorCache.deleteMany({
        where: {
          expiresAt: {
            lt: now
          }
        }
      })
      return result.count
    } catch (error) {
      console.error('Error cleaning expired cache:', error)
      return 0
    }
  }

  /**
   * Get cache statistics
   * 
   * Returns information about the current cache state.
   * Useful for monitoring and debugging.
   * 
   * @returns Cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number
    expiredEntries: number
    byIndicatorType: Record<string, number>
  }> {
    try {
      const now = new Date()
      
      const [totalEntries, expiredEntries, byType] = await Promise.all([
        prisma.indicatorCache.count(),
        prisma.indicatorCache.count({
          where: {
            expiresAt: {
              lt: now
            }
          }
        }),
        prisma.indicatorCache.groupBy({
          by: ['indicatorType'],
          _count: true
        })
      ])

      const byIndicatorType: Record<string, number> = {}
      byType.forEach(item => {
        byIndicatorType[item.indicatorType] = item._count
      })

      return {
        totalEntries,
        expiredEntries,
        byIndicatorType
      }
    } catch (error) {
      console.error('Error getting cache stats:', error)
      return {
        totalEntries: 0,
        expiredEntries: 0,
        byIndicatorType: {}
      }
    }
  }
}

// Export singleton instance
export const indicatorCacheService = new IndicatorCacheService()

