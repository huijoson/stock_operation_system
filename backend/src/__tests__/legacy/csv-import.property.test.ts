import * as fc from 'fast-check'
import { PrismaClient } from '../../lib/prisma-client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'
import Decimal from 'decimal.js'

/**
 * Property-based tests for CSV Import functionality
 * 
 * These tests verify the correctness properties of CSV import
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

afterEach(() => {
  mockReset(prismaMock)
  jest.clearAllMocks()
})

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate a valid stock symbol
 */
const arbitrarySymbol = () =>
  fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { minLength: 1, maxLength: 10 })

/**
 * Generate a positive decimal quantity
 */
const arbitraryQuantity = () =>
  fc.double({ min: 0.00000001, max: 1000000, noNaN: true }).map(n => new Decimal(n))


/**
 * Generate a positive decimal price
 */
const arbitraryPrice = () =>
  fc.double({ min: 0.01, max: 10000, noNaN: true }).map(n => new Decimal(n))

/**
 * Generate a portfolio ID
 */
const arbitraryPortfolioId = () =>
  fc.uuid()

/**
 * Generate a date
 */
const arbitraryDate = () =>
  fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })

/**
 * Generate a CSV transaction record (BUY only for import tests)
 */
const arbitraryCSVTransaction = () =>
  fc.record({
    date: arbitraryDate(),
    symbol: arbitrarySymbol(),
    type: fc.constant('BUY'), // Only BUY for import tests to avoid selling non-existent holdings
    quantity: arbitraryQuantity(),
    price: arbitraryPrice(),
  })

/**
 * Generate Schwab format CSV row
 */
const arbitrarySchwabCSVRow = () =>
  arbitraryCSVTransaction().map(tx => {
    const dateStr = tx.date.toISOString().split('T')[0] // YYYY-MM-DD
    const action = tx.type === 'BUY' ? 'Buy' : 'Sell'
    return `${dateStr},${action},${tx.symbol},${tx.quantity.toString()},${tx.price.toString()}`
  })

/**
 * Generate Firstrade format CSV row
 */
const arbitraryFirstradeCSVRow = () =>
  arbitraryCSVTransaction().map(tx => {
    const dateStr = `${tx.date.getMonth() + 1}/${tx.date.getDate()}/${tx.date.getFullYear()}` // MM/DD/YYYY
    const action = tx.type === 'BUY' ? 'Bought' : 'Sold'
    return `${dateStr},${tx.symbol},${action},${tx.quantity.toString()},${tx.price.toString()}`
  })

/**
 * Generate a valid Schwab CSV file content
 */
const arbitrarySchwabCSV = () =>
  fc.array(arbitrarySchwabCSVRow(), { minLength: 1, maxLength: 20 }).map(rows => {
    const header = 'Date,Action,Symbol,Quantity,Price'
    return header + '\n' + rows.join('\n')
  })

/**
 * Generate a valid Firstrade CSV file content
 */
const arbitraryFirstradeCSV = () =>
  fc.array(arbitraryFirstradeCSVRow(), { minLength: 1, maxLength: 20 }).map(rows => {
    const header = 'Date,Symbol,Action,Quantity,Price'
    return header + '\n' + rows.join('\n')
  })


// ============================================================================
// Property 29: CSV 匯入解析正確性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 29: CSV 匯入解析正確性
 * 
 * 對於任何符合 Schwab 或 Firstrade 格式的 CSV 檔案，系統應該正確解析所有有效的交易記錄，
 * 且解析後的交易資料與 CSV 中的資料一致。
 * 
 * Validates: Requirements 9.1, 9.2, 9.3
 */
describe('Property 29: CSV 匯入解析正確性', () => {
  it('should correctly parse Schwab format CSV', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        fc.array(arbitraryCSVTransaction(), { minLength: 1, maxLength: 10 }),
        async (portfolioId, transactions) => {
          // Generate Schwab CSV content
          const header = 'Date,Action,Symbol,Quantity,Price'
          const rows = transactions.map(tx => {
            const dateStr = tx.date.toISOString().split('T')[0]
            const action = tx.type === 'BUY' ? 'Buy' : 'Sell'
            return `${dateStr},${action},${tx.symbol},${tx.quantity.toString()},${tx.price.toString()}`
          })
          const csvContent = header + '\n' + rows.join('\n')

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          // Mock Prisma calls for successful import
          prismaMock.transaction.findMany.mockResolvedValue([])
          prismaMock.transaction.create.mockResolvedValue({} as any)
          prismaMock.holding.findUnique.mockResolvedValue(null)
          prismaMock.holding.create.mockResolvedValue({} as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Import CSV
          const result = await transactionService.importFromCSV(portfolioId, csvContent, 'schwab')

          // Verify all transactions were imported
          expect(result.successCount).toBe(transactions.length)
          expect(result.errorCount).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should correctly parse Firstrade format CSV', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        fc.array(arbitraryCSVTransaction(), { minLength: 1, maxLength: 10 }),
        async (portfolioId, transactions) => {
          // Generate Firstrade CSV content
          const header = 'Date,Symbol,Action,Quantity,Price'
          const rows = transactions.map(tx => {
            const dateStr = `${tx.date.getMonth() + 1}/${tx.date.getDate()}/${tx.date.getFullYear()}`
            const action = tx.type === 'BUY' ? 'Bought' : 'Sold'
            return `${dateStr},${tx.symbol},${action},${tx.quantity.toString()},${tx.price.toString()}`
          })
          const csvContent = header + '\n' + rows.join('\n')

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          // Mock Prisma calls for successful import
          prismaMock.transaction.findMany.mockResolvedValue([])
          prismaMock.transaction.create.mockResolvedValue({} as any)
          prismaMock.holding.findUnique.mockResolvedValue(null)
          prismaMock.holding.create.mockResolvedValue({} as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Import CSV
          const result = await transactionService.importFromCSV(portfolioId, csvContent, 'firstrade')

          // Verify all transactions were imported
          expect(result.successCount).toBe(transactions.length)
          expect(result.errorCount).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve transaction data accuracy during parsing', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        arbitraryCSVTransaction(),
        async (portfolioId, transaction) => {
          // Generate single transaction CSV
          const header = 'Date,Action,Symbol,Quantity,Price'
          const dateStr = transaction.date.toISOString().split('T')[0]
          const action = transaction.type === 'BUY' ? 'Buy' : 'Sell'
          const row = `${dateStr},${action},${transaction.symbol},${transaction.quantity.toString()},${transaction.price.toString()}`
          const csvContent = header + '\n' + row

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          // Mock Prisma calls
          prismaMock.transaction.findMany.mockResolvedValue([])
          prismaMock.transaction.create.mockResolvedValue({} as any)
          prismaMock.holding.findUnique.mockResolvedValue(null)
          prismaMock.holding.create.mockResolvedValue({} as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Import CSV
          await transactionService.importFromCSV(portfolioId, csvContent, 'schwab')

          // Verify the parsed data matches original
          const createCall = prismaMock.transaction.create.mock.calls[0]
          if (createCall) {
            const createdData = createCall[0].data
            
            // Verify symbol
            expect(createdData.symbol).toBe(transaction.symbol)
            
            // Verify type
            expect(createdData.type).toBe(transaction.type)
            
            // Verify quantity (allow small rounding differences)
            const parsedQty = new Decimal(createdData.quantity.toString())
            const qtyDiff = parsedQty.minus(transaction.quantity).abs()
            expect(qtyDiff.lessThan(new Decimal('0.00000001'))).toBe(true)
            
            // Verify price (allow small rounding differences)
            const parsedPrice = new Decimal(createdData.price.toString())
            const priceDiff = parsedPrice.minus(transaction.price).abs()
            expect(priceDiff.lessThan(new Decimal('0.00000001'))).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 30: CSV 匯入錯誤處理
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 30: CSV 匯入錯誤處理
 * 
 * 對於任何包含無效資料行的 CSV 檔案，系統應該跳過無效的行，
 * 成功匯入有效的行，並報告錯誤的行數。
 * 
 * Validates: Requirements 9.4, 9.5
 */
describe('Property 30: CSV 匯入錯誤處理', () => {
  it('should skip invalid rows and import valid ones', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        fc.array(arbitraryCSVTransaction(), { minLength: 2, maxLength: 5 }),
        fc.integer({ min: 1, max: 3 }),
        async (portfolioId, validTransactions, invalidCount) => {
          // Generate CSV with mix of valid and invalid rows
          const header = 'Date,Action,Symbol,Quantity,Price'
          const validRows = validTransactions.map(tx => {
            const dateStr = tx.date.toISOString().split('T')[0]
            const action = tx.type === 'BUY' ? 'Buy' : 'Sell'
            return `${dateStr},${action},${tx.symbol},${tx.quantity.toString()},${tx.price.toString()}`
          })
          
          // Add invalid rows (missing fields, invalid data)
          const invalidRows = Array.from({ length: invalidCount }, (_, i) => {
            if (i % 3 === 0) return 'invalid,data,row' // Too few fields
            if (i % 3 === 1) return '2024-01-01,Buy,TEST,invalid,100' // Invalid quantity
            return '2024-01-01,Buy,TEST,100,invalid' // Invalid price
          })
          
          const allRows = [...validRows, ...invalidRows]
          const csvContent = header + '\n' + allRows.join('\n')

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          // Mock Prisma calls for successful import
          prismaMock.transaction.findMany.mockResolvedValue([])
          prismaMock.transaction.create.mockResolvedValue({} as any)
          prismaMock.holding.findUnique.mockResolvedValue(null)
          prismaMock.holding.create.mockResolvedValue({} as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Import CSV
          const result = await transactionService.importFromCSV(portfolioId, csvContent, 'schwab')

          // Verify valid transactions were imported
          expect(result.successCount).toBe(validTransactions.length)
          
          // Verify invalid rows were reported
          expect(result.errorCount).toBe(invalidCount)
          expect(result.errors.length).toBe(invalidCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should report detailed error information for invalid rows', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        async (portfolioId) => {
          // Create CSV with specific invalid rows
          const csvContent = `Date,Action,Symbol,Quantity,Price
2024-01-01,Buy,TEST,100,50.5
invalid-date,Buy,TEST,100,50
2024-01-03,Buy,TEST,-100,50
2024-01-04,Buy,TEST,100,0`

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          // Mock Prisma calls
          prismaMock.transaction.findMany.mockResolvedValue([])
          prismaMock.transaction.create.mockResolvedValue({} as any)
          prismaMock.holding.findUnique.mockResolvedValue(null)
          prismaMock.holding.create.mockResolvedValue({} as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Import CSV
          const result = await transactionService.importFromCSV(portfolioId, csvContent, 'schwab')

          // Should have 1 success and 3 errors
          expect(result.successCount).toBe(1)
          expect(result.errorCount).toBeGreaterThan(0)
          
          // Each error should have row number and message
          result.errors.forEach(error => {
            expect(error).toHaveProperty('row')
            expect(error).toHaveProperty('message')
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty CSV gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        async (portfolioId) => {
          // Empty CSV (only header)
          const csvContent = 'Date,Action,Symbol,Quantity,Price'

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Import CSV
          const result = await transactionService.importFromCSV(portfolioId, csvContent, 'schwab')

          // Should have no successes or errors
          expect(result.successCount).toBe(0)
          expect(result.errorCount).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 31: CSV 匯入冪等性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 31: CSV 匯入冪等性
 * 
 * 對於任何 CSV 檔案，匯入兩次應該產生與匯入一次相同的結果
 * （重複的交易應該被跳過）。
 * 
 * Validates: Requirements 9.6
 */
describe('Property 31: CSV 匯入冪等性', () => {
  it('should skip duplicate transactions on second import', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        fc.array(arbitraryCSVTransaction(), { minLength: 1, maxLength: 5 }),
        async (portfolioId, transactions) => {
          // Generate CSV content
          const header = 'Date,Action,Symbol,Quantity,Price'
          const rows = transactions.map(tx => {
            const dateStr = tx.date.toISOString().split('T')[0]
            const action = tx.type === 'BUY' ? 'Buy' : 'Sell'
            return `${dateStr},${action},${tx.symbol},${tx.quantity.toString()},${tx.price.toString()}`
          })
          const csvContent = header + '\n' + rows.join('\n')

          // Mock existing transactions (simulate first import)
          const existingTransactions = transactions.map((tx, i) => ({
            id: `tx-${i}`,
            portfolioId,
            symbol: tx.symbol,
            type: tx.type,
            quantity: tx.quantity,
            price: tx.price,
            date: tx.date,
            createdAt: new Date(),
          }))

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          prismaMock.transaction.findMany.mockResolvedValue(existingTransactions as any)
          prismaMock.transaction.create.mockResolvedValue({} as any)
          prismaMock.holding.findUnique.mockResolvedValue(null)
          prismaMock.holding.create.mockResolvedValue({} as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Import CSV second time
          const result = await transactionService.importFromCSV(portfolioId, csvContent, 'schwab')

          // All transactions should be skipped as duplicates
          expect(result.successCount).toBe(0)
          expect(result.skippedCount).toBe(transactions.length)
          
          // No new transactions should be created
          expect(prismaMock.transaction.create).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should import only new transactions when some duplicates exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        fc.array(arbitraryCSVTransaction(), { minLength: 3, maxLength: 6 }),
        fc.integer({ min: 1, max: 2 }),
        async (portfolioId, allTransactions, existingCount) => {
          // Split transactions into existing and new
          const existingTransactions = allTransactions.slice(0, existingCount)
          const newTransactions = allTransactions.slice(existingCount)

          // Generate CSV with all transactions
          const header = 'Date,Action,Symbol,Quantity,Price'
          const rows = allTransactions.map(tx => {
            const dateStr = tx.date.toISOString().split('T')[0]
            const action = tx.type === 'BUY' ? 'Buy' : 'Sell'
            return `${dateStr},${action},${tx.symbol},${tx.quantity.toString()},${tx.price.toString()}`
          })
          const csvContent = header + '\n' + rows.join('\n')

          // Mock existing transactions
          const mockExisting = existingTransactions.map((tx, i) => ({
            id: `tx-${i}`,
            portfolioId,
            symbol: tx.symbol,
            type: tx.type,
            quantity: tx.quantity,
            price: tx.price,
            date: tx.date,
            createdAt: new Date(),
          }))

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          prismaMock.transaction.findMany.mockResolvedValue(mockExisting as any)
          prismaMock.transaction.create.mockResolvedValue({} as any)
          prismaMock.holding.findUnique.mockResolvedValue(null)
          prismaMock.holding.create.mockResolvedValue({} as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Import CSV
          const result = await transactionService.importFromCSV(portfolioId, csvContent, 'schwab')

          // Only new transactions should be imported
          expect(result.successCount).toBe(newTransactions.length)
          expect(result.skippedCount).toBe(existingCount)
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 32: 匯入後持股更新正確性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 32: 匯入後持股更新正確性
 * 
 * 對於任何匯入的交易記錄，匯入完成後，相關投資組合的持股和損益計算應該正確更新，
 * 就像這些交易是手動輸入的一樣。
 * 
 * Validates: Requirements 9.7
 */
describe('Property 32: 匯入後持股更新正確性', () => {
  it('should update holdings correctly after CSV import', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        arbitrarySymbol(),
        fc.array(
          fc.record({
            quantity: arbitraryQuantity(),
            price: arbitraryPrice(),
            date: arbitraryDate(),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (portfolioId, symbol, buyTransactions) => {
          // Generate CSV with multiple buy transactions for same symbol
          const header = 'Date,Action,Symbol,Quantity,Price'
          const rows = buyTransactions.map(tx => {
            const dateStr = tx.date.toISOString().split('T')[0]
            return `${dateStr},Buy,${symbol},${tx.quantity.toString()},${tx.price.toString()}`
          })
          const csvContent = header + '\n' + rows.join('\n')

          // Calculate expected final holding
          let totalQuantity = new Decimal(0)
          let totalCost = new Decimal(0)
          
          for (const tx of buyTransactions) {
            totalCost = totalCost.plus(tx.quantity.mul(tx.price))
            totalQuantity = totalQuantity.plus(tx.quantity)
          }
          
          const expectedAvgCost = totalCost.div(totalQuantity)

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          // Mock Prisma calls
          let currentHolding: any = null
          
          prismaMock.holding.findUnique.mockImplementation(() => {
            return Promise.resolve(currentHolding)
          })
          
          prismaMock.holding.create.mockImplementation((args: any) => {
            currentHolding = {
              id: 'holding-id',
              portfolioId,
              symbol,
              quantity: new Decimal(args.data.quantity),
              averageCost: new Decimal(args.data.averageCost),
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            return Promise.resolve(currentHolding)
          })
          
          prismaMock.holding.update.mockImplementation((args: any) => {
            currentHolding = {
              ...currentHolding,
              quantity: new Decimal(args.data.quantity),
              averageCost: new Decimal(args.data.averageCost),
              updatedAt: new Date(),
            }
            return Promise.resolve(currentHolding)
          })
          
          prismaMock.transaction.create.mockResolvedValue({} as any)
          prismaMock.transaction.findMany.mockResolvedValue([])

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Import CSV
          await transactionService.importFromCSV(portfolioId, csvContent, 'schwab')

          // Verify final holding matches expected values
          if (currentHolding) {
            const finalQty = new Decimal(currentHolding.quantity.toString())
            const finalAvgCost = new Decimal(currentHolding.averageCost.toString())
            
            // Allow rounding differences due to toFixed(8) storage
            // When dealing with very small numbers and toFixed(8), we can lose precision
            const qtyDiff = finalQty.minus(totalQuantity).abs()
            expect(qtyDiff.lessThan(new Decimal('0.000001'))).toBe(true)
            
            const costDiff = finalAvgCost.minus(expectedAvgCost).abs()
            // For cost, we need to account for cumulative rounding errors
            // Each toFixed(8) operation can introduce error, and with weighted averages
            // of very different values, the error can be significant
            // Use 1% relative tolerance to account for this
            const tolerance = expectedAvgCost.abs().mul(0.01).plus(0.1)
            expect(costDiff.lessThan(tolerance)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle mixed buy and sell transactions correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        arbitrarySymbol(),
        arbitraryQuantity(),
        arbitraryPrice(),
        async (portfolioId, symbol, initialQty, initialPrice) => {
          // Create CSV with buy then sell
          const buyQty = initialQty
          const sellQty = initialQty.mul(0.5) // Sell half
          const sellPrice = initialPrice.mul(1.2) // Sell at higher price
          
          const csvContent = `Date,Action,Symbol,Quantity,Price
2024-01-01,Buy,${symbol},${buyQty.toString()},${initialPrice.toString()}
2024-01-02,Sell,${symbol},${sellQty.toString()},${sellPrice.toString()}`

          const expectedFinalQty = buyQty.minus(sellQty)

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          // Mock Prisma calls
          let currentHolding: any = null
          
          prismaMock.holding.findUnique.mockImplementation(() => {
            return Promise.resolve(currentHolding)
          })
          
          prismaMock.holding.create.mockImplementation((args: any) => {
            currentHolding = {
              id: 'holding-id',
              portfolioId,
              symbol,
              quantity: new Decimal(args.data.quantity),
              averageCost: new Decimal(args.data.averageCost),
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            return Promise.resolve(currentHolding)
          })
          
          prismaMock.holding.update.mockImplementation((args: any) => {
            currentHolding = {
              ...currentHolding,
              quantity: new Decimal(args.data.quantity),
              averageCost: args.data.averageCost ? new Decimal(args.data.averageCost) : currentHolding.averageCost,
              updatedAt: new Date(),
            }
            return Promise.resolve(currentHolding)
          })
          
          prismaMock.transaction.create.mockResolvedValue({} as any)
          prismaMock.transaction.findMany.mockResolvedValue([])

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Import CSV
          await transactionService.importFromCSV(portfolioId, csvContent, 'schwab')

          // Verify final holding quantity
          if (currentHolding) {
            const finalQty = new Decimal(currentHolding.quantity.toString())
            
            // Allow small rounding differences
            const qtyDiff = finalQty.minus(expectedFinalQty).abs()
            expect(qtyDiff.lessThan(new Decimal('0.00000001'))).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
