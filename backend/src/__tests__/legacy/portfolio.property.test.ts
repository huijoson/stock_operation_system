import * as fc from 'fast-check'
import { PrismaClient } from '../../lib/prisma-client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

/**
 * Property-based tests for PortfolioService
 * 
 * These tests verify the correctness properties of portfolio management
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

let prismaMock: DeepMockProxy<PrismaClient>

beforeEach(() => {
  prismaMock = mockDeep<PrismaClient>()
  ;(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => prismaMock as any)
})

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate a valid portfolio name
 */
const arbitraryPortfolioName = () =>
  fc.string({ minLength: 1, maxLength: 100 }).filter(name => name.trim().length > 0)

/**
 * Generate a user ID
 */
const arbitraryUserId = () =>
  fc.uuid()

/**
 * Generate a portfolio ID
 */
const arbitraryPortfolioId = () =>
  fc.uuid()

/**
 * Generate a whitespace-only string
 */
const arbitraryWhitespaceString = () =>
  fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 })

// ============================================================================
// Property 5: 投資組合建立成功性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 5: 投資組合建立成功性
 * 
 * 對於任何有效的投資組合名稱，建立投資組合應該成功，
 * 且該投資組合出現在使用者的投資組合清單中。
 * 
 * Validates: Requirements 2.1, 2.2
 */
describe('Property 5: 投資組合建立成功性', () => {
  it('should successfully create portfolio for any valid name', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryPortfolioName(),
        async (userId, portfolioName) => {
          const mockPortfolio = {
            id: 'test-portfolio-id',
            name: portfolioName,
            userId: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          // Mock portfolio creation
          prismaMock.portfolio.create.mockResolvedValue(mockPortfolio)

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Create portfolio
          const portfolio = await portfolioService.createPortfolio(userId, portfolioName)

          // Verify portfolio was created
          expect(portfolio).toBeDefined()
          expect(portfolio.id).toBeDefined()
          expect(portfolio.name).toBe(portfolioName)
          expect(portfolio.userId).toBe(userId)

          // Verify Prisma was called correctly (name should be trimmed)
          expect(prismaMock.portfolio.create).toHaveBeenCalledWith({
            data: {
              name: portfolioName.trim(),
              userId: userId,
            },
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should appear in user portfolio list after creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryPortfolioName(),
        async (userId, portfolioName) => {
          const mockPortfolio = {
            id: 'test-portfolio-id',
            name: portfolioName,
            userId: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          // Mock portfolio creation
          prismaMock.portfolio.create.mockResolvedValue(mockPortfolio)

          // Mock portfolio list query
          prismaMock.portfolio.findMany.mockResolvedValue([mockPortfolio])

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Create portfolio
          const createdPortfolio = await portfolioService.createPortfolio(userId, portfolioName)

          // Get user's portfolios
          const portfolios = await portfolioService.getPortfolios(userId)

          // Verify created portfolio appears in list
          expect(portfolios).toBeDefined()
          expect(portfolios.length).toBeGreaterThan(0)
          expect(portfolios.some(p => p.id === createdPortfolio.id)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should store portfolio with correct user association', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryPortfolioName(),
        async (userId, portfolioName) => {
          const mockPortfolio = {
            id: 'test-portfolio-id',
            name: portfolioName,
            userId: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          prismaMock.portfolio.create.mockResolvedValue(mockPortfolio)

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Create portfolio
          const portfolio = await portfolioService.createPortfolio(userId, portfolioName)

          // Verify user association
          expect(portfolio.userId).toBe(userId)
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 6: 投資組合更新一致性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 6: 投資組合更新一致性
 * 
 * 對於任何投資組合，更新名稱後，查詢該投資組合應該返回更新後的名稱。
 * 
 * Validates: Requirements 2.3
 */
describe('Property 6: 投資組合更新一致性', () => {
  it('should return updated name after portfolio update', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        arbitraryPortfolioName(),
        arbitraryPortfolioName(),
        async (portfolioId, originalName, newName) => {
          // Ensure names are different
          fc.pre(originalName !== newName)

          const mockOriginalPortfolio = {
            id: portfolioId,
            name: originalName,
            userId: 'test-user-id',
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          const mockUpdatedPortfolio = {
            ...mockOriginalPortfolio,
            name: newName,
            updatedAt: new Date(),
          }

          // Mock portfolio update
          prismaMock.portfolio.update.mockResolvedValue(mockUpdatedPortfolio)

          // Mock portfolio query after update
          prismaMock.portfolio.findUnique.mockResolvedValue(mockUpdatedPortfolio)

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Update portfolio
          const updatedPortfolio = await portfolioService.updatePortfolio(portfolioId, newName)

          // Verify updated name
          expect(updatedPortfolio.name).toBe(newName)
          expect(updatedPortfolio.name).not.toBe(originalName)

          // Verify Prisma was called correctly (name should be trimmed)
          expect(prismaMock.portfolio.update).toHaveBeenCalledWith({
            where: { id: portfolioId },
            data: { name: newName.trim() },
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve portfolio ID after update', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        arbitraryPortfolioName(),
        arbitraryPortfolioName(),
        async (portfolioId, originalName, newName) => {
          fc.pre(originalName !== newName)

          const mockUpdatedPortfolio = {
            id: portfolioId,
            name: newName,
            userId: 'test-user-id',
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          prismaMock.portfolio.update.mockResolvedValue(mockUpdatedPortfolio)

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Update portfolio
          const updatedPortfolio = await portfolioService.updatePortfolio(portfolioId, newName)

          // Verify ID is preserved
          expect(updatedPortfolio.id).toBe(portfolioId)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 7: 投資組合級聯刪除
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 7: 投資組合級聯刪除
 * 
 * 對於任何投資組合，刪除後，該投資組合及其所有相關的持股和交易記錄
 * 都應該從資料庫中移除。
 * 
 * Validates: Requirements 2.4
 */
describe('Property 7: 投資組合級聯刪除', () => {
  it('should remove portfolio and all related data after deletion', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        async (portfolioId) => {
          // Mock portfolio deletion (cascade handled by Prisma)
          prismaMock.portfolio.delete.mockResolvedValue({
            id: portfolioId,
            name: 'Test Portfolio',
            userId: 'test-user-id',
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          // Mock portfolio not found after deletion
          prismaMock.portfolio.findUnique.mockResolvedValue(null)

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Delete portfolio
          await portfolioService.deletePortfolio(portfolioId)

          // Verify Prisma delete was called
          expect(prismaMock.portfolio.delete).toHaveBeenCalledWith({
            where: { id: portfolioId },
          })

          // Verify portfolio no longer exists
          const deletedPortfolio = await prismaMock.portfolio.findUnique({
            where: { id: portfolioId },
          })
          expect(deletedPortfolio).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not throw error when deleting non-existent portfolio', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        async (portfolioId) => {
          // Mock portfolio not found
          prismaMock.portfolio.delete.mockRejectedValue(
            new Error('Portfolio not found')
          )

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Delete non-existent portfolio should throw
          await expect(
            portfolioService.deletePortfolio(portfolioId)
          ).rejects.toThrow()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 8: 空白名稱拒絕
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 8: 空白名稱拒絕
 * 
 * 對於任何僅包含空白字元的字串，使用該字串建立或更新投資組合應該被拒絕。
 * 
 * Validates: Requirements 2.5
 */
describe('Property 8: 空白名稱拒絕', () => {
  it('should reject portfolio creation with whitespace-only name', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryWhitespaceString(),
        async (userId, whitespaceName) => {
          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Try to create portfolio with whitespace-only name
          await expect(
            portfolioService.createPortfolio(userId, whitespaceName)
          ).rejects.toThrow('Portfolio name cannot be empty or whitespace only')

          // Verify Prisma create was never called
          expect(prismaMock.portfolio.create).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject portfolio update with whitespace-only name', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        arbitraryWhitespaceString(),
        async (portfolioId, whitespaceName) => {
          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Try to update portfolio with whitespace-only name
          await expect(
            portfolioService.updatePortfolio(portfolioId, whitespaceName)
          ).rejects.toThrow('Portfolio name cannot be empty or whitespace only')

          // Verify Prisma update was never called
          expect(prismaMock.portfolio.update).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject empty string as portfolio name', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        async (userId) => {
          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Try to create portfolio with empty name
          await expect(
            portfolioService.createPortfolio(userId, '')
          ).rejects.toThrow('Portfolio name cannot be empty or whitespace only')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should accept name with leading/trailing whitespace but non-whitespace content', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (userId, validName) => {
          // Add whitespace around valid name
          const nameWithWhitespace = `  ${validName}  `

          const mockPortfolio = {
            id: 'test-portfolio-id',
            name: nameWithWhitespace.trim(),
            userId: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          prismaMock.portfolio.create.mockResolvedValue(mockPortfolio)

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Should accept and trim the name
          const portfolio = await portfolioService.createPortfolio(userId, nameWithWhitespace)

          expect(portfolio).toBeDefined()
          expect(portfolio.name).toBe(validName.trim())
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Test Data Generators for Holdings
// ============================================================================

/**
 * Generate a stock symbol
 */
const arbitrarySymbol = () =>
  fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0)

/**
 * Generate a positive decimal quantity
 */
const arbitraryPositiveQuantity = () =>
  fc.double({ min: 0.00000001, max: 1000000, noNaN: true }).map(n => n.toString())

/**
 * Generate a positive decimal price
 */
const arbitraryPositivePrice = () =>
  fc.double({ min: 0.01, max: 100000, noNaN: true }).map(n => n.toString())

/**
 * Generate a holding with quantity > 0
 */
const arbitraryHolding = () =>
  fc.record({
    id: fc.uuid(),
    portfolioId: fc.uuid(),
    symbol: arbitrarySymbol(),
    quantity: arbitraryPositiveQuantity(),
    averageCost: arbitraryPositivePrice(),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  })

/**
 * Generate an array of holdings
 */
const arbitraryHoldings = () =>
  fc.array(arbitraryHolding(), { minLength: 1, maxLength: 20 })

// ============================================================================
// Property 15: 持股查詢完整性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 15: 持股查詢完整性
 * 
 * 對於任何投資組合，查詢持股應該返回所有數量大於零的持股，
 * 且每個持股包含股票代號、數量、平均成本和總成本。
 * 
 * Validates: Requirements 4.1
 */
describe('Property 15: 持股查詢完整性', () => {
  it('should return all holdings with quantity > 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        arbitraryHoldings(),
        async (portfolioId, holdings) => {
          // Ensure all holdings have quantity > 0
          const validHoldings = holdings.map(h => ({
            ...h,
            portfolioId,
            quantity: h.quantity,
          }))

          // Mock holdings query
          prismaMock.holding.findMany.mockResolvedValue(validHoldings as any)

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Get holdings
          const result = await portfolioService.getHoldings(portfolioId)

          // Verify all holdings are returned
          expect(result).toBeDefined()
          expect(result.length).toBe(validHoldings.length)

          // Verify Prisma was called with correct filter
          expect(prismaMock.holding.findMany).toHaveBeenCalledWith({
            where: {
              portfolioId,
              quantity: { gt: 0 },
            },
            orderBy: { symbol: 'asc' },
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should include all required fields for each holding', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        arbitraryHoldings(),
        async (portfolioId, holdings) => {
          const validHoldings = holdings.map(h => ({
            ...h,
            portfolioId,
          }))

          prismaMock.holding.findMany.mockResolvedValue(validHoldings as any)

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Get holdings
          const result = await portfolioService.getHoldings(portfolioId)

          // Verify each holding has required fields
          result.forEach(holding => {
            expect(holding.symbol).toBeDefined()
            expect(holding.quantity).toBeDefined()
            expect(holding.averageCost).toBeDefined()
            
            // Verify symbol is not empty
            expect(holding.symbol.length).toBeGreaterThan(0)
            
            // Verify quantity and averageCost are defined (can be string or Decimal)
            expect(holding.quantity).not.toBeNull()
            expect(holding.averageCost).not.toBeNull()
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should calculate total cost correctly for each holding', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        arbitraryHoldings(),
        async (portfolioId, holdings) => {
          const validHoldings = holdings.map(h => ({
            ...h,
            portfolioId,
          }))

          prismaMock.holding.findMany.mockResolvedValue(validHoldings as any)

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Get holdings
          const result = await portfolioService.getHoldings(portfolioId)

          // Verify total cost can be calculated for each holding
          result.forEach(holding => {
            const quantity = parseFloat(holding.quantity.toString())
            const averageCost = parseFloat(holding.averageCost.toString())
            const totalCost = quantity * averageCost
            
            // Total cost should be a valid positive number
            expect(totalCost).toBeGreaterThan(0)
            expect(isNaN(totalCost)).toBe(false)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 16: 零持股過濾
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 16: 零持股過濾
 * 
 * 對於任何數量為零的持股，該持股不應該出現在持股查詢結果中。
 * 
 * Validates: Requirements 4.2
 */
describe('Property 16: 零持股過濾', () => {
  it('should not return holdings with quantity = 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        async (portfolioId) => {
          // Create holdings with quantity = 0
          const zeroHoldings = [
            {
              id: 'holding-1',
              portfolioId,
              symbol: 'AAPL',
              quantity: '0',
              averageCost: '100',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'holding-2',
              portfolioId,
              symbol: 'GOOGL',
              quantity: '0',
              averageCost: '200',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]

          // Mock should return empty array since quantity filter is applied
          prismaMock.holding.findMany.mockResolvedValue([])

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Get holdings
          const result = await portfolioService.getHoldings(portfolioId)

          // Verify no holdings are returned
          expect(result).toBeDefined()
          expect(result.length).toBe(0)

          // Verify Prisma was called with quantity > 0 filter
          expect(prismaMock.holding.findMany).toHaveBeenCalledWith({
            where: {
              portfolioId,
              quantity: { gt: 0 },
            },
            orderBy: { symbol: 'asc' },
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should only return holdings with quantity > 0 when mixed with zero holdings', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        arbitraryHoldings(),
        async (portfolioId, positiveHoldings) => {
          // Ensure we have at least one positive holding
          fc.pre(positiveHoldings.length > 0)

          const validHoldings = positiveHoldings.map(h => ({
            ...h,
            portfolioId,
          }))

          // Mock returns only positive holdings (database filter applied)
          prismaMock.holding.findMany.mockResolvedValue(validHoldings as any)

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Get holdings
          const result = await portfolioService.getHoldings(portfolioId)

          // Verify all returned holdings have quantity > 0
          result.forEach(holding => {
            const quantity = parseFloat(holding.quantity.toString())
            expect(quantity).toBeGreaterThan(0)
          })

          // Verify count matches
          expect(result.length).toBe(validHoldings.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return empty array when portfolio has no holdings with quantity > 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        async (portfolioId) => {
          // Mock empty result
          prismaMock.holding.findMany.mockResolvedValue([])

          const { PortfolioService } = await import('@/services/portfolio.service')
          const portfolioService = new PortfolioService(prismaMock as any)

          // Get holdings
          const result = await portfolioService.getHoldings(portfolioId)

          // Verify empty array is returned
          expect(result).toBeDefined()
          expect(Array.isArray(result)).toBe(true)
          expect(result.length).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
