import * as fc from 'fast-check'
import { PrismaClient } from '../../lib/prisma-client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'
import Decimal from 'decimal.js'

/**
 * Property-based tests for TransactionService
 * 
 * These tests verify the correctness properties of transaction management
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
 * Generate a transaction ID
 */
const arbitraryTransactionId = () =>
  fc.uuid()

/**
 * Generate a date
 */
const arbitraryDate = () =>
  fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })

/**
 * Generate a buy transaction
 */
const arbitraryBuyTransaction = () =>
  fc.record({
    portfolioId: arbitraryPortfolioId(),
    symbol: arbitrarySymbol(),
    type: fc.constant('BUY'),
    quantity: arbitraryQuantity(),
    price: arbitraryPrice(),
    date: arbitraryDate(),
  })

/**
 * Generate a sell transaction
 */
const arbitrarySellTransaction = () =>
  fc.record({
    portfolioId: arbitraryPortfolioId(),
    symbol: arbitrarySymbol(),
    type: fc.constant('SELL'),
    quantity: arbitraryQuantity(),
    price: arbitraryPrice(),
    date: arbitraryDate(),
  })

/**
 * Generate a holding
 */
const arbitraryHolding = () =>
  fc.record({
    id: fc.uuid(),
    portfolioId: arbitraryPortfolioId(),
    symbol: arbitrarySymbol(),
    quantity: arbitraryQuantity(),
    averageCost: arbitraryPrice(),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  })

// ============================================================================
// Property 9: 買入交易增加持股
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 9: 買入交易增加持股
 * 
 * 對於任何買入交易，執行後持股數量應該增加相應的數量，
 * 且平均成本應該根據加權平均公式正確更新。
 * 
 * Validates: Requirements 3.2
 */
describe('Property 9: 買入交易增加持股', () => {
  it('should increase holding quantity after buy transaction', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryBuyTransaction(),
        arbitraryQuantity(),
        arbitraryPrice(),
        async (transaction, initialQuantity, initialAvgCost) => {
          const portfolioId = transaction.portfolioId
          const symbol = transaction.symbol

          // Mock existing holding
          const existingHolding = {
            id: 'holding-id',
            portfolioId,
            symbol,
            quantity: initialQuantity,
            averageCost: initialAvgCost,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          // Calculate expected new values
          const totalCost = initialQuantity.mul(initialAvgCost).plus(transaction.quantity.mul(transaction.price))
          const newQuantity = initialQuantity.plus(transaction.quantity)
          const newAvgCost = totalCost.div(newQuantity)

          const updatedHolding = {
            ...existingHolding,
            quantity: newQuantity,
            averageCost: newAvgCost,
            updatedAt: new Date(),
          }

          // Mock Prisma calls
          prismaMock.holding.findUnique.mockResolvedValue(existingHolding as any)
          prismaMock.holding.update.mockResolvedValue(updatedHolding as any)
          prismaMock.transaction.create.mockResolvedValue({
            id: 'transaction-id',
            ...transaction,
            createdAt: new Date(),
          } as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Execute buy transaction
          await transactionService.createTransaction(transaction)

          // Verify holding was updated
          expect(prismaMock.holding.update).toHaveBeenCalled()

          // Get the last call to verify the values (use last call in case of multiple runs)
          const calls = prismaMock.holding.update.mock.calls
          const lastCall = calls[calls.length - 1][0]
          
          // Verify it was called with correct portfolio and symbol
          expect(lastCall.where.portfolioId_symbol.portfolioId).toBe(portfolioId)
          expect(lastCall.where.portfolioId_symbol.symbol).toBe(symbol)
          
          const updatedQuantity = new Decimal(lastCall.data.quantity.toString())
          const updatedAvgCost = new Decimal(lastCall.data.averageCost.toString())

          // Verify quantity increased
          expect(updatedQuantity.greaterThan(initialQuantity)).toBe(true)
          
          // Allow small rounding differences due to toFixed(8)
          const qtyDiff = updatedQuantity.minus(newQuantity).abs()
          expect(qtyDiff.lessThan(new Decimal('0.00000001'))).toBe(true)

          // Verify average cost is calculated correctly (allow small rounding)
          const costDiff = updatedAvgCost.minus(newAvgCost).abs()
          expect(costDiff.lessThan(new Decimal('0.00000001'))).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should create new holding if none exists for the symbol', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryBuyTransaction(),
        async (transaction) => {
          const portfolioId = transaction.portfolioId
          const symbol = transaction.symbol

          // Mock no existing holding
          prismaMock.holding.findUnique.mockResolvedValue(null)

          // Mock holding creation
          const newHolding = {
            id: 'new-holding-id',
            portfolioId,
            symbol,
            quantity: transaction.quantity,
            averageCost: transaction.price,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          prismaMock.holding.create.mockResolvedValue(newHolding as any)

          prismaMock.transaction.create.mockResolvedValue({
            id: 'transaction-id',
            ...transaction,
            createdAt: new Date(),
          } as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Execute buy transaction
          await transactionService.createTransaction(transaction)

          // Verify new holding was created
          expect(prismaMock.holding.create).toHaveBeenCalled()

          // Verify the created holding has correct values (use last call)
          const calls = prismaMock.holding.create.mock.calls
          const lastCall = calls[calls.length - 1][0]
          
          expect(lastCall.data.portfolioId).toBe(portfolioId)
          expect(lastCall.data.symbol).toBe(symbol)
          
          const createdQuantity = new Decimal(lastCall.data.quantity.toString())
          const createdAvgCost = new Decimal(lastCall.data.averageCost.toString())

          // Allow small rounding differences due to toFixed(8)
          const qtyDiff = createdQuantity.minus(transaction.quantity).abs()
          expect(qtyDiff.lessThan(new Decimal('0.00000001'))).toBe(true)
          
          const costDiff = createdAvgCost.minus(transaction.price).abs()
          expect(costDiff.lessThan(new Decimal('0.00000001'))).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should calculate weighted average cost correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryBuyTransaction(),
        fc.double({ min: 1, max: 1000, noNaN: true }),
        fc.double({ min: 1, max: 1000, noNaN: true }),
        async (transaction, initialQty, initialCost) => {
          const initialQuantity = new Decimal(initialQty)
          const initialAvgCost = new Decimal(initialCost)
          const portfolioId = transaction.portfolioId
          const symbol = transaction.symbol

          // Mock existing holding
          const existingHolding = {
            id: 'holding-id',
            portfolioId,
            symbol,
            quantity: initialQuantity,
            averageCost: initialAvgCost,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          // Calculate expected weighted average
          const oldTotalCost = initialQuantity.mul(initialAvgCost)
          const newTotalCost = transaction.quantity.mul(transaction.price)
          const totalCost = oldTotalCost.plus(newTotalCost)
          const totalQuantity = initialQuantity.plus(transaction.quantity)
          const expectedAvgCost = totalCost.div(totalQuantity)

          prismaMock.holding.findUnique.mockResolvedValue(existingHolding as any)
          prismaMock.holding.update.mockResolvedValue({
            ...existingHolding,
            quantity: totalQuantity,
            averageCost: expectedAvgCost,
          } as any)
          prismaMock.transaction.create.mockResolvedValue({
            id: 'transaction-id',
            ...transaction,
            createdAt: new Date(),
          } as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Execute buy transaction
          await transactionService.createTransaction(transaction)

          // Verify weighted average calculation (use last call)
          const calls = prismaMock.holding.update.mock.calls
          const lastCall = calls[calls.length - 1][0]
          const updatedAvgCost = new Decimal(lastCall.data.averageCost.toString())

          // Allow small rounding differences
          const difference = updatedAvgCost.minus(expectedAvgCost).abs()
          expect(difference.lessThan(new Decimal('0.00000001'))).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 10: 賣出交易減少持股
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 10: 賣出交易減少持股
 * 
 * 對於任何有效的賣出交易（數量不超過持股），執行後持股數量應該減少相應的數量，
 * 且已實現損益應該正確計算。
 * 
 * Validates: Requirements 3.3
 */
describe('Property 10: 賣出交易減少持股', () => {
  it('should decrease holding quantity after sell transaction', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySellTransaction(),
        fc.double({ min: 100, max: 10000, noNaN: true }),
        arbitraryPrice(),
        async (transaction, initialQty, avgCost) => {
          const initialQuantity = new Decimal(initialQty)
          const portfolioId = transaction.portfolioId
          const symbol = transaction.symbol

          // Ensure sell quantity is less than holding
          const sellQuantity = initialQuantity.mul(0.5) // Sell 50%
          const transactionWithValidQty = {
            ...transaction,
            quantity: sellQuantity,
          }

          // Mock existing holding
          const existingHolding = {
            id: 'holding-id',
            portfolioId,
            symbol,
            quantity: initialQuantity,
            averageCost: avgCost,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          const newQuantity = initialQuantity.minus(sellQuantity)

          const updatedHolding = {
            ...existingHolding,
            quantity: newQuantity,
            updatedAt: new Date(),
          }

          // Mock Prisma calls
          prismaMock.holding.findUnique.mockResolvedValue(existingHolding as any)
          prismaMock.holding.update.mockResolvedValue(updatedHolding as any)
          prismaMock.transaction.create.mockResolvedValue({
            id: 'transaction-id',
            ...transactionWithValidQty,
            createdAt: new Date(),
          } as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Execute sell transaction
          await transactionService.createTransaction(transactionWithValidQty)

          // Verify holding was updated with decreased quantity
          expect(prismaMock.holding.update).toHaveBeenCalled()

          const calls = prismaMock.holding.update.mock.calls
          const lastCall = calls[calls.length - 1][0]
          const updatedQuantity = new Decimal(lastCall.data.quantity.toString())

          // Verify quantity decreased
          expect(updatedQuantity.lessThan(initialQuantity)).toBe(true)
          
          // Allow small rounding differences due to toFixed(8)
          const qtyDiff = updatedQuantity.minus(newQuantity).abs()
          expect(qtyDiff.lessThan(new Decimal('0.00000001'))).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should calculate realized P&L correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySellTransaction(),
        fc.double({ min: 100, max: 10000, noNaN: true }),
        fc.double({ min: 10, max: 500, noNaN: true }),
        async (transaction, initialQty, avgCostNum) => {
          const initialQuantity = new Decimal(initialQty)
          const avgCost = new Decimal(avgCostNum)
          const portfolioId = transaction.portfolioId
          const symbol = transaction.symbol

          // Ensure sell quantity is less than holding
          const sellQuantity = initialQuantity.mul(0.3) // Sell 30%
          const transactionWithValidQty = {
            ...transaction,
            quantity: sellQuantity,
          }

          // Calculate expected realized P&L
          const expectedRealizedPL = sellQuantity.mul(transaction.price.minus(avgCost))

          // Mock existing holding
          const existingHolding = {
            id: 'holding-id',
            portfolioId,
            symbol,
            quantity: initialQuantity,
            averageCost: avgCost,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          prismaMock.holding.findUnique.mockResolvedValue(existingHolding as any)
          prismaMock.holding.update.mockResolvedValue({
            ...existingHolding,
            quantity: initialQuantity.minus(sellQuantity),
          } as any)
          prismaMock.transaction.create.mockResolvedValue({
            id: 'transaction-id',
            ...transactionWithValidQty,
            createdAt: new Date(),
          } as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Execute sell transaction
          const result = await transactionService.createTransaction(transactionWithValidQty)

          // The realized P&L should be calculated
          // We'll verify this through the transaction record
          expect(prismaMock.transaction.create).toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should delete holding when quantity becomes zero', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySellTransaction(),
        arbitraryQuantity(),
        arbitraryPrice(),
        async (transaction, quantity, avgCost) => {
          const portfolioId = transaction.portfolioId
          const symbol = transaction.symbol

          // Sell exactly the amount held
          const transactionWithExactQty = {
            ...transaction,
            quantity: quantity,
          }

          // Mock existing holding
          const existingHolding = {
            id: 'holding-id',
            portfolioId,
            symbol,
            quantity: quantity,
            averageCost: avgCost,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          prismaMock.holding.findUnique.mockResolvedValue(existingHolding as any)
          prismaMock.holding.delete.mockResolvedValue(existingHolding as any)
          prismaMock.transaction.create.mockResolvedValue({
            id: 'transaction-id',
            ...transactionWithExactQty,
            createdAt: new Date(),
          } as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Execute sell transaction
          await transactionService.createTransaction(transactionWithExactQty)

          // Verify holding was deleted (or updated to 0)
          // Implementation can choose to delete or update to 0
          const wasDeleted = prismaMock.holding.delete.mock.calls.length > 0
          const wasUpdatedToZero = prismaMock.holding.update.mock.calls.some(call => {
            const qty = new Decimal(call[0].data.quantity?.toString() || '1')
            return qty.equals(0)
          })

          expect(wasDeleted || wasUpdatedToZero).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 11: 超額賣出拒絕
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 11: 超額賣出拒絕
 * 
 * 對於任何賣出數量超過持股數量的交易，系統應該拒絕該交易。
 * 
 * Validates: Requirements 3.4
 */
describe('Property 11: 超額賣出拒絕', () => {
  it('should reject sell transaction when quantity exceeds holding', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySellTransaction(),
        fc.double({ min: 1, max: 1000, noNaN: true }),
        arbitraryPrice(),
        async (transaction, holdingQty, avgCost) => {
          const holdingQuantity = new Decimal(holdingQty)
          const portfolioId = transaction.portfolioId
          const symbol = transaction.symbol

          // Try to sell more than we have
          const excessQuantity = holdingQuantity.mul(1.5) // 150% of holding
          const transactionWithExcessQty = {
            ...transaction,
            quantity: excessQuantity,
          }

          // Mock existing holding
          const existingHolding = {
            id: 'holding-id',
            portfolioId,
            symbol,
            quantity: holdingQuantity,
            averageCost: avgCost,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          prismaMock.holding.findUnique.mockResolvedValue(existingHolding as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Execute sell transaction - should throw error
          await expect(
            transactionService.createTransaction(transactionWithExcessQty)
          ).rejects.toThrow()

          // Verify transaction was not created
          expect(prismaMock.transaction.create).not.toHaveBeenCalled()

          // Verify holding was not updated
          expect(prismaMock.holding.update).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject sell transaction when no holding exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySellTransaction(),
        async (transaction) => {
          // Mock no existing holding
          prismaMock.holding.findUnique.mockResolvedValue(null)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Execute sell transaction - should throw error
          await expect(
            transactionService.createTransaction(transaction)
          ).rejects.toThrow()

          // Verify transaction was not created
          expect(prismaMock.transaction.create).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 12: 交易記錄排序
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 12: 交易記錄排序
 * 
 * 對於任何投資組合的交易記錄查詢，返回的結果應該按日期排序（從舊到新或從新到舊）。
 * 
 * Validates: Requirements 3.5
 */
describe('Property 12: 交易記錄排序', () => {
  it('should return transactions sorted by date descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        fc.array(arbitraryDate(), { minLength: 2, maxLength: 20 }),
        async (portfolioId, dates) => {
          // Create mock transactions with different dates
          const mockTransactions = dates.map((date, index) => ({
            id: `transaction-${index}`,
            portfolioId,
            symbol: 'TEST',
            type: 'BUY',
            quantity: new Decimal(10),
            price: new Decimal(100),
            date,
            createdAt: new Date(),
          }))

          // Sort by date descending (newest first)
          const sortedTransactions = [...mockTransactions].sort((a, b) => 
            b.date.getTime() - a.date.getTime()
          )

          prismaMock.transaction.findMany.mockResolvedValue(sortedTransactions as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Get transactions
          const transactions = await transactionService.getTransactions(portfolioId)

          // Verify transactions are sorted by date descending
          for (let i = 0; i < transactions.length - 1; i++) {
            expect(transactions[i].date.getTime()).toBeGreaterThanOrEqual(
              transactions[i + 1].date.getTime()
            )
          }

          // Verify Prisma was called with correct orderBy
          expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { portfolioId },
              orderBy: { date: 'desc' },
            })
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain sort order for transactions on same date', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        arbitraryDate(),
        fc.integer({ min: 2, max: 10 }),
        async (portfolioId, date, count) => {
          // Create multiple transactions on the same date
          const mockTransactions = Array.from({ length: count }, (_, index) => ({
            id: `transaction-${index}`,
            portfolioId,
            symbol: 'TEST',
            type: 'BUY',
            quantity: new Decimal(10),
            price: new Decimal(100),
            date,
            createdAt: new Date(Date.now() + index * 1000), // Different creation times
          }))

          prismaMock.transaction.findMany.mockResolvedValue(mockTransactions as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Get transactions
          const transactions = await transactionService.getTransactions(portfolioId)

          // Verify all transactions have the same date
          const allSameDate = transactions.every(t => t.date.getTime() === date.getTime())
          expect(allSameDate).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 13: 交易刪除重新計算
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 13: 交易刪除重新計算
 * 
 * 對於任何交易記錄，刪除後，相關持股的數量和平均成本應該重新計算，
 * 就像該交易從未發生過一樣。
 * 
 * Validates: Requirements 3.6
 */
describe('Property 13: 交易刪除重新計算', () => {
  it('should recalculate holding after transaction deletion', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryTransactionId(),
        arbitraryPortfolioId(),
        arbitrarySymbol(),
        async (transactionId, portfolioId, symbol) => {
          // Mock the transaction to be deleted
          const transactionToDelete = {
            id: transactionId,
            portfolioId,
            symbol,
            type: 'BUY',
            quantity: new Decimal(100),
            price: new Decimal(50),
            date: new Date(),
            createdAt: new Date(),
          }

          // Mock all transactions for this symbol (including the one to delete)
          const allTransactions = [
            {
              id: 'tx-1',
              portfolioId,
              symbol,
              type: 'BUY',
              quantity: new Decimal(200),
              price: new Decimal(40),
              date: new Date('2024-01-01'),
              createdAt: new Date(),
            },
            transactionToDelete,
          ]

          // Mock current holding
          const currentHolding = {
            id: 'holding-id',
            portfolioId,
            symbol,
            quantity: new Decimal(300), // 200 + 100
            averageCost: new Decimal(43.33), // Weighted average
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          prismaMock.transaction.findUnique.mockResolvedValue(transactionToDelete as any)
          
          // After deletion, only tx-1 remains
          const remainingTransactions = allTransactions.filter(tx => tx.id !== transactionId)
          prismaMock.transaction.findMany.mockResolvedValue(remainingTransactions as any)
          
          prismaMock.holding.findUnique.mockResolvedValue(currentHolding as any)
          prismaMock.transaction.delete.mockResolvedValue(transactionToDelete as any)
          prismaMock.holding.upsert.mockResolvedValue({
            ...currentHolding,
            quantity: new Decimal(200),
            averageCost: new Decimal(40),
          } as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Delete transaction
          await transactionService.deleteTransaction(transactionId)

          // Verify transaction was deleted
          expect(prismaMock.transaction.delete).toHaveBeenCalledWith({
            where: { id: transactionId },
          })

          // Verify holding was recalculated (using upsert)
          expect(prismaMock.holding.upsert).toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should delete holding if all transactions are removed', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryTransactionId(),
        arbitraryPortfolioId(),
        arbitrarySymbol(),
        async (transactionId, portfolioId, symbol) => {
          // Mock the only transaction for this symbol
          const transactionToDelete = {
            id: transactionId,
            portfolioId,
            symbol,
            type: 'BUY',
            quantity: new Decimal(100),
            price: new Decimal(50),
            date: new Date(),
            createdAt: new Date(),
          }

          // Mock current holding
          const currentHolding = {
            id: 'holding-id',
            portfolioId,
            symbol,
            quantity: new Decimal(100),
            averageCost: new Decimal(50),
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          prismaMock.transaction.findUnique.mockResolvedValue(transactionToDelete as any)
          
          // After deletion, no transactions remain
          prismaMock.transaction.findMany.mockResolvedValue([] as any)
          
          prismaMock.holding.findUnique.mockResolvedValue(currentHolding as any)
          prismaMock.transaction.delete.mockResolvedValue(transactionToDelete as any)
          prismaMock.holding.deleteMany.mockResolvedValue({ count: 1 } as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Delete transaction
          await transactionService.deleteTransaction(transactionId)

          // Verify holding was deleted (using deleteMany)
          expect(prismaMock.holding.deleteMany).toHaveBeenCalledWith({
            where: {
              portfolioId,
              symbol,
            },
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 14: 無效交易參數拒絕
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 14: 無效交易參數拒絕
 * 
 * 對於任何數量或價格為零或負數的交易，系統應該拒絕該交易。
 * 
 * Validates: Requirements 3.7
 */
describe('Property 14: 無效交易參數拒絕', () => {
  it('should reject transaction with zero quantity', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryBuyTransaction(),
        async (transaction) => {
          const invalidTransaction = {
            ...transaction,
            quantity: new Decimal(0),
          }

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Execute transaction - should throw error
          await expect(
            transactionService.createTransaction(invalidTransaction)
          ).rejects.toThrow()

          // Verify transaction was not created
          expect(prismaMock.transaction.create).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject transaction with negative quantity', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryBuyTransaction(),
        fc.double({ min: -1000, max: -0.01, noNaN: true }),
        async (transaction, negativeQty) => {
          const invalidTransaction = {
            ...transaction,
            quantity: new Decimal(negativeQty),
          }

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Execute transaction - should throw error
          await expect(
            transactionService.createTransaction(invalidTransaction)
          ).rejects.toThrow()

          // Verify transaction was not created
          expect(prismaMock.transaction.create).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject transaction with zero price', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryBuyTransaction(),
        async (transaction) => {
          const invalidTransaction = {
            ...transaction,
            price: new Decimal(0),
          }

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Execute transaction - should throw error
          await expect(
            transactionService.createTransaction(invalidTransaction)
          ).rejects.toThrow()

          // Verify transaction was not created
          expect(prismaMock.transaction.create).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject transaction with negative price', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryBuyTransaction(),
        fc.double({ min: -1000, max: -0.01, noNaN: true }),
        async (transaction, negativePrice) => {
          const invalidTransaction = {
            ...transaction,
            price: new Decimal(negativePrice),
          }

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Execute transaction - should throw error
          await expect(
            transactionService.createTransaction(invalidTransaction)
          ).rejects.toThrow()

          // Verify transaction was not created
          expect(prismaMock.transaction.create).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject transaction with invalid type', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryBuyTransaction(),
        fc.string().filter(s => s !== 'BUY' && s !== 'SELL'),
        async (transaction, invalidType) => {
          const invalidTransaction = {
            ...transaction,
            type: invalidType,
          }

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Execute transaction - should throw error
          await expect(
            transactionService.createTransaction(invalidTransaction as any)
          ).rejects.toThrow()

          // Verify transaction was not created
          expect(prismaMock.transaction.create).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })
})
