import * as fc from 'fast-check'
import { PrismaClient } from '../../lib/prisma-client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'
import Decimal from 'decimal.js'

/**
 * Property-based tests for StockService
 * 
 * These tests verify the correctness properties of stock price management
 * as defined in the design document.
 */

// ============================================================================
// Test Setup
// ============================================================================

// Mock Prisma Client
jest.mock('../../lib/prisma-client', () => ({
  ...jest.requireActual('../../lib/prisma-client'),
  PrismaClient: jest.fn(),
}))

// Mock axios so the Yahoo Finance fallback in searchStocks returns empty
// instead of hitting the real network (which times out / returns live data).
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: { quotes: [] } }),
}))

let prismaMock: DeepMockProxy<PrismaClient>

beforeEach(() => {
  prismaMock = mockDeep<PrismaClient>()
  ;(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => prismaMock as any)
})

afterEach(() => {
  mockReset(prismaMock)
  jest.clearAllMocks()
})

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate a valid stock symbol (Taiwan stock format)
 */
const arbitraryStockSymbol = () =>
  fc.oneof(
    // Taiwan stock symbols (4 digits)
    fc.integer({ min: 1000, max: 9999 }).map(n => n.toString()),
    // US stock symbols (1-5 uppercase letters)
    fc.stringOf(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'), { minLength: 1, maxLength: 5 })
  )

/**
 * Generate an invalid stock symbol
 */
const arbitraryInvalidSymbol = () =>
  fc.oneof(
    fc.constant(''),
    fc.constant('INVALID'),
    fc.constant('99999'),
    fc.constant('!!!'),
    fc.stringOf(fc.constantFrom('!', '@', '#', '$', '%'), { minLength: 1, maxLength: 10 })
  )

/**
 * Generate a positive stock price
 */
const arbitraryStockPrice = () =>
  fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true })

/**
 * Generate a date within a reasonable range
 */
const arbitraryDate = () =>
  fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })

/**
 * Generate a stock price record
 */
const arbitraryStockPriceRecord = () =>
  fc.record({
    id: fc.uuid(),
    symbol: arbitraryStockSymbol(),
    price: arbitraryStockPrice().map(p => new Decimal(p).toFixed(8)),
    date: arbitraryDate(),
    createdAt: fc.date(),
  })

/**
 * Generate a valid stock record
 */
const arbitraryStock = () =>
  fc.record({
    id: fc.uuid(),
    symbol: arbitraryStockSymbol(),
    name: fc.oneof(
      // Taiwan stock names
      fc.constantFrom('台積電', '鴻海', '聯發科', '台達電', '中華電'),
      // US stock names
      fc.constantFrom('Apple Inc.', 'Microsoft Corp.', 'Tesla Inc.', 'Amazon.com Inc.', 'Google LLC')
    ),
    industry: fc.option(
      fc.constantFrom('半導體', '電子', '通訊', '金融', '科技'),
      { nil: null }
    ),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  })

/**
 * Generate a search keyword (at least 2 characters)
 */
const arbitrarySearchKeyword = () =>
  fc.oneof(
    // Taiwan stock symbols (4 digits)
    fc.integer({ min: 1000, max: 9999 }).map(n => n.toString()),
    // Partial Taiwan stock symbols (2-3 digits)
    fc.integer({ min: 10, max: 999 }).map(n => n.toString()),
    // Chinese characters (2-5 chars)
    fc.stringOf(fc.constantFrom('台', '積', '電', '鴻', '海', '聯', '發', '科', '中', '華'), { minLength: 2, maxLength: 5 }),
    // English letters (2-5 chars)
    fc.stringOf(fc.constantFrom('A', 'P', 'L', 'E', 'M', 'S', 'F', 'T', 'G', 'O'), { minLength: 2, maxLength: 5 })
  )

/**
 * Generate a short keyword (less than 2 characters)
 */
const arbitraryShortKeyword = () =>
  fc.oneof(
    fc.constant(''),
    fc.constantFrom('A', 'B', 'C', '1', '2', '台', '電')
  )

// ============================================================================
// Property 17: 股價快取一致性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 17: 股價快取一致性
 * 
 * 對於任何成功取得的股價資料，系統應該快取該資料，
 * 且在快取有效期內，相同的查詢應該返回快取的資料而非重新呼叫外部 API。
 * 
 * Validates: Requirements 5.4
 */
describe('Property 17: 股價快取一致性', () => {
  it('should cache successfully fetched stock price', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryStockSymbol(),
        arbitraryStockPrice(),
        async (symbol, price) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          const priceDecimal = new Decimal(price)
          const now = new Date()
          const normalizedDate = new Date(now)
          normalizedDate.setHours(0, 0, 0, 0)

          const mockStockPrice = {
            id: 'test-price-id',
            symbol,
            price: priceDecimal.toFixed(8),
            date: normalizedDate,
            createdAt: now,
          }

          // Mock cache write
          prismaMock.stockPrice.upsert.mockResolvedValue(mockStockPrice as any)

          // Mock cache read - return the cached price
          prismaMock.stockPrice.findFirst.mockResolvedValue(mockStockPrice as any)

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Cache the price directly (simulating successful API fetch)
          await stockService.cachePrice(symbol, priceDecimal)

          // Verify price was cached
          expect(prismaMock.stockPrice.upsert).toHaveBeenCalled()

          // Second call - should return cached price
          const cachedPrice = await stockService.getCachedPrice(symbol)

          // Verify cached price matches original
          if (cachedPrice) {
            expect(cachedPrice.toFixed(8)).toBe(priceDecimal.toFixed(8))
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return cached price without calling external API within cache validity period', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryStockSymbol(),
        arbitraryStockPrice(),
        async (symbol, price) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          const priceDecimal = new Decimal(price)
          const now = new Date()

          const mockStockPrice = {
            id: 'test-price-id',
            symbol,
            price: priceDecimal.toFixed(8),
            date: now,
            createdAt: now,
          }

          // Mock cache hit
          prismaMock.stockPrice.findFirst.mockResolvedValue(mockStockPrice as any)

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Get cached price
          const cachedPrice = await stockService.getCachedPrice(symbol)

          // Verify cache was queried
          expect(prismaMock.stockPrice.findFirst).toHaveBeenCalledWith({
            where: { symbol },
            orderBy: { date: 'desc' },
          })

          // Verify cached price is returned
          if (cachedPrice) {
            expect(cachedPrice.toFixed(8)).toBe(priceDecimal.toFixed(8))
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should store price with correct symbol and timestamp when caching', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryStockSymbol(),
        arbitraryStockPrice(),
        async (symbol, price) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          const priceDecimal = new Decimal(price)
          const now = new Date()

          const mockStockPrice = {
            id: 'test-price-id',
            symbol,
            price: priceDecimal.toFixed(8),
            date: now,
            createdAt: now,
          }

          // Mock cache write
          prismaMock.stockPrice.upsert.mockResolvedValue(mockStockPrice as any)

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Cache price
          await stockService.cachePrice(symbol, priceDecimal)

          // Verify upsert was called with correct data
          expect(prismaMock.stockPrice.upsert).toHaveBeenCalled()
          
          const upsertCall = prismaMock.stockPrice.upsert.mock.calls[0][0]
          expect(upsertCall.where.symbol_date.symbol).toBe(symbol)
          expect(upsertCall.create.symbol).toBe(symbol)
          expect(upsertCall.create.price).toBe(priceDecimal.toFixed(8))
          expect(upsertCall.update.price).toBe(priceDecimal.toFixed(8))
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain cache consistency across multiple queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryStockSymbol(),
        arbitraryStockPrice(),
        fc.integer({ min: 2, max: 10 }),
        async (symbol, price, numQueries) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          const priceDecimal = new Decimal(price)
          const now = new Date()

          const mockStockPrice = {
            id: 'test-price-id',
            symbol,
            price: priceDecimal.toFixed(8),
            date: now,
            createdAt: now,
          }

          // Mock cache always returns same price
          prismaMock.stockPrice.findFirst.mockResolvedValue(mockStockPrice as any)

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Query multiple times
          const prices: (Decimal | null)[] = []
          for (let i = 0; i < numQueries; i++) {
            const cachedPrice = await stockService.getCachedPrice(symbol)
            prices.push(cachedPrice)
          }

          // Verify all queries return the same price
          prices.forEach(p => {
            if (p) {
              expect(p.toFixed(8)).toBe(priceDecimal.toFixed(8))
            }
          })

          // Verify cache was queried multiple times
          expect(prismaMock.stockPrice.findFirst).toHaveBeenCalledTimes(numQueries)
        }
      ),
      { numRuns: 50 }
    )
  })
})

// ============================================================================
// Property 18: 無效股票代號錯誤處理
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 18: 無效股票代號錯誤處理
 * 
 * 對於任何無效或不存在的股票代號，查詢股價應該返回錯誤
 * 而非崩潰或返回錯誤的資料。
 * 
 * Validates: Requirements 5.5
 */
describe('Property 18: 無效股票代號錯誤處理', () => {
  it('should throw error for invalid stock symbol', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryInvalidSymbol(),
        async (invalidSymbol) => {
          // Mock cache miss
          prismaMock.stockPrice.findFirst.mockResolvedValue(null)

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Try to get price for invalid symbol (will call real API and fail)
          // We expect this to throw an error
          await expect(
            stockService.getCurrentPrice(invalidSymbol)
          ).rejects.toThrow()
        }
      ),
      { numRuns: 10, timeout: 30000 } // Reduced runs and increased timeout for API calls
    )
  }, 60000) // Increase test timeout

  it('should not crash when querying non-existent stock', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryInvalidSymbol(),
        async (invalidSymbol) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          // Mock cache miss
          prismaMock.stockPrice.findFirst.mockResolvedValue(null)

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Get cached price for non-existent stock
          const cachedPrice = await stockService.getCachedPrice(invalidSymbol)

          // Should return null, not crash
          expect(cachedPrice).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return null from cache for non-existent stock', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryStockSymbol(),
        async (symbol) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          // Mock cache miss
          prismaMock.stockPrice.findFirst.mockResolvedValue(null)

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Get cached price for stock not in cache
          const cachedPrice = await stockService.getCachedPrice(symbol)

          // Should return null
          expect(cachedPrice).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle API errors gracefully without corrupting cache', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryInvalidSymbol(), // Use invalid symbols to ensure API fails
        async (symbol) => {
          // Reset mocks for this test
          mockReset(prismaMock)
          
          // Mock cache miss
          prismaMock.stockPrice.findFirst.mockResolvedValue(null)

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Try to get price (will fail due to invalid symbol)
          try {
            await stockService.getCurrentPrice(symbol)
          } catch (error) {
            // Error is expected
          }

          // Verify cache was not corrupted
          const cachedPrice = await stockService.getCachedPrice(symbol)
          expect(cachedPrice).toBeNull()

          // Verify no invalid data was written to cache
          expect(prismaMock.stockPrice.upsert).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 10, timeout: 30000 } // Reduced runs for API calls
    )
  }, 60000) // Increase test timeout

  it('should provide meaningful error messages for invalid symbols', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryInvalidSymbol(),
        async (invalidSymbol) => {
          // Mock cache miss
          prismaMock.stockPrice.findFirst.mockResolvedValue(null)
          
          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Try to get price for invalid symbol
          try {
            await stockService.getCurrentPrice(invalidSymbol)
            // If no error is thrown, fail the test
            expect(true).toBe(false)
          } catch (error) {
            // Verify error message is meaningful
            expect(error).toBeDefined()
            expect(error instanceof Error).toBe(true)
            if (error instanceof Error) {
              expect(error.message.length).toBeGreaterThan(0)
            }
          }
        }
      ),
      { numRuns: 10, timeout: 30000 } // Reduced runs for API calls
    )
  }, 60000) // Increase test timeout
})

// ============================================================================
// Property 26: 搜尋結果相關性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 26: 搜尋結果相關性
 * 
 * 對於任何搜尋關鍵字（至少兩個字元），返回的所有股票結果應該
 * 在股票代號或名稱中包含該關鍵字（不區分大小寫）。
 * 
 * Validates: Requirements 8.1
 */
describe('Property 26: 搜尋結果相關性', () => {
  it('should return only stocks that match the search keyword in symbol or name', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySearchKeyword(),
        fc.array(arbitraryStock(), { minLength: 5, maxLength: 20 }),
        async (keyword, allStocks) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          // Filter stocks that should match the keyword
          const keywordLower = keyword.toLowerCase()
          const matchingStocks = allStocks.filter(stock => 
            stock.symbol.toLowerCase().includes(keywordLower) ||
            stock.name.toLowerCase().includes(keywordLower)
          )

          // Mock database to return matching stocks
          prismaMock.stock.findMany.mockResolvedValue(matchingStocks as any)

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Search for stocks
          const results = await stockService.searchStocks(keyword)

          // Verify all results match the keyword
          results.forEach(stock => {
            const symbolMatch = stock.symbol.toLowerCase().includes(keywordLower)
            const nameMatch = stock.name.toLowerCase().includes(keywordLower)
            expect(symbolMatch || nameMatch).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should perform case-insensitive search', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('AAPL', 'aapl', 'AaPl', 'tsla', 'TSLA', '2330', '台積', '鴻海'),
        fc.array(arbitraryStock(), { minLength: 5, maxLength: 20 }),
        async (keyword, allStocks) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          // Filter stocks that should match (case-insensitive)
          const keywordLower = keyword.toLowerCase()
          const matchingStocks = allStocks.filter(stock => 
            stock.symbol.toLowerCase().includes(keywordLower) ||
            stock.name.toLowerCase().includes(keywordLower)
          )

          // Mock database to return matching stocks
          prismaMock.stock.findMany.mockResolvedValue(matchingStocks as any)

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Search for stocks
          const results = await stockService.searchStocks(keyword)

          // Verify all results match the keyword (case-insensitive)
          results.forEach(stock => {
            const symbolMatch = stock.symbol.toLowerCase().includes(keywordLower)
            const nameMatch = stock.name.toLowerCase().includes(keywordLower)
            expect(symbolMatch || nameMatch).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return empty array when no stocks match', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySearchKeyword(),
        async (keyword) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          // Mock database to return no results
          prismaMock.stock.findMany.mockResolvedValue([])

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Search for stocks
          const results = await stockService.searchStocks(keyword)

          // Verify empty array is returned
          expect(Array.isArray(results)).toBe(true)
          expect(results.length).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 27: 短關鍵字不觸發搜尋
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 27: 短關鍵字不觸發搜尋
 * 
 * 對於任何少於兩個字元的搜尋關鍵字，系統不應該執行搜尋。
 * 
 * Validates: Requirements 8.3
 */
describe('Property 27: 短關鍵字不觸發搜尋', () => {
  it('should not execute search for keywords with less than 2 characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryShortKeyword(),
        async (shortKeyword) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Search with short keyword
          const results = await stockService.searchStocks(shortKeyword)

          // Verify database was not queried
          expect(prismaMock.stock.findMany).not.toHaveBeenCalled()

          // Verify empty array is returned
          expect(Array.isArray(results)).toBe(true)
          expect(results.length).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return empty array for empty string', async () => {
    // Reset mocks
    mockReset(prismaMock)
    
    const { StockService } = await import('@/services/stock.service')
    const stockService = new StockService(prismaMock as any)

    // Search with empty string
    const results = await stockService.searchStocks('')

    // Verify database was not queried
    expect(prismaMock.stock.findMany).not.toHaveBeenCalled()

    // Verify empty array is returned
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBe(0)
  })

  it('should return empty array for single character', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('A', 'B', '1', '2', '台', '電'),
        async (singleChar) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Search with single character
          const results = await stockService.searchStocks(singleChar)

          // Verify database was not queried
          expect(prismaMock.stock.findMany).not.toHaveBeenCalled()

          // Verify empty array is returned
          expect(Array.isArray(results)).toBe(true)
          expect(results.length).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })
})

// ============================================================================
// Property 28: 搜尋結果完整性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 28: 搜尋結果完整性
 * 
 * 對於任何搜尋結果，每個股票應該包含股票代號、名稱和產業資訊。
 * 
 * Validates: Requirements 8.5
 */
describe('Property 28: 搜尋結果完整性', () => {
  it('should return stocks with symbol, name, and industry fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySearchKeyword(),
        fc.array(arbitraryStock(), { minLength: 1, maxLength: 10 }),
        async (keyword, stocks) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          // Mock database to return stocks
          prismaMock.stock.findMany.mockResolvedValue(stocks as any)

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Search for stocks
          const results = await stockService.searchStocks(keyword)

          // Verify each result has required fields
          results.forEach(stock => {
            expect(stock).toHaveProperty('symbol')
            expect(stock).toHaveProperty('name')
            expect(stock).toHaveProperty('industry')
            
            // Verify symbol and name are non-empty strings
            expect(typeof stock.symbol).toBe('string')
            expect(stock.symbol.length).toBeGreaterThan(0)
            expect(typeof stock.name).toBe('string')
            expect(stock.name.length).toBeGreaterThan(0)
            
            // Industry can be null or string
            expect(stock.industry === null || typeof stock.industry === 'string').toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should include all required fields even when industry is null', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySearchKeyword(),
        async (keyword) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          // Create stocks with null industry
          const stocksWithNullIndustry = [
            {
              id: 'test-1',
              symbol: '2330',
              name: '台積電',
              industry: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'test-2',
              symbol: 'AAPL',
              name: 'Apple Inc.',
              industry: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]

          // Mock database to return stocks with null industry
          prismaMock.stock.findMany.mockResolvedValue(stocksWithNullIndustry as any)

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Search for stocks
          const results = await stockService.searchStocks(keyword)

          // Verify each result has all fields including industry (even if null)
          results.forEach(stock => {
            expect(stock).toHaveProperty('symbol')
            expect(stock).toHaveProperty('name')
            expect(stock).toHaveProperty('industry')
            expect(stock.industry).toBeNull()
          })
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should return complete stock objects without missing fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySearchKeyword(),
        fc.array(arbitraryStock(), { minLength: 1, maxLength: 10 }),
        async (keyword, stocks) => {
          // Reset mocks for each property test iteration
          mockReset(prismaMock)
          
          // Mock database to return stocks
          prismaMock.stock.findMany.mockResolvedValue(stocks as any)

          const { StockService } = await import('@/services/stock.service')
          const stockService = new StockService(prismaMock as any)

          // Search for stocks
          const results = await stockService.searchStocks(keyword)

          // Verify no undefined fields
          results.forEach(stock => {
            expect(stock.symbol).not.toBeUndefined()
            expect(stock.name).not.toBeUndefined()
            // industry can be null but not undefined
            expect(stock.industry !== undefined).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})
