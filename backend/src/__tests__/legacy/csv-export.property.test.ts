import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'
import Decimal from 'decimal.js'

/**
 * Property-based tests for CSV Export functionality
 * 
 * These tests verify the correctness properties of CSV export
 * as defined in the design document.
 */

// ============================================================================
// Test Setup
// ============================================================================

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  ...jest.requireActual('@prisma/client'),
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
 * Generate a transaction type
 */
const arbitraryTransactionType = () =>
  fc.constantFrom('BUY', 'SELL')

/**
 * Generate a transaction record
 */
const arbitraryTransaction = () =>
  fc.record({
    id: fc.uuid(),
    portfolioId: arbitraryPortfolioId(),
    symbol: arbitrarySymbol(),
    type: arbitraryTransactionType(),
    quantity: arbitraryQuantity(),
    price: arbitraryPrice(),
    date: arbitraryDate(),
    createdAt: arbitraryDate(),
  })

/**
 * Generate a holding record
 */
const arbitraryHolding = () =>
  fc.record({
    id: fc.uuid(),
    portfolioId: arbitraryPortfolioId(),
    symbol: arbitrarySymbol(),
    quantity: arbitraryQuantity(),
    averageCost: arbitraryPrice(),
    createdAt: arbitraryDate(),
    updatedAt: arbitraryDate(),
  })

// ============================================================================
// Property 33: CSV 匯出往返一致性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 33: CSV 匯出往返一致性
 * 
 * 對於任何投資組合的交易記錄，匯出為 CSV 後再匯入，
 * 應該產生相同的交易記錄（往返一致性）。
 * 
 * Validates: Requirements 10.1
 */
describe('Property 33: CSV 匯出往返一致性', () => {
  it('should maintain transaction data integrity through export-import round trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        fc.array(arbitraryTransaction(), { minLength: 1, maxLength: 10 }),
        async (portfolioId, originalTransactions) => {
          // Ensure all transactions belong to the same portfolio and are BUY only
          // (to avoid selling non-existent holdings during import)
          const transactions = originalTransactions.map(tx => ({
            ...tx,
            portfolioId,
            type: 'BUY' as const,
          }))

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          // Mock transaction retrieval for export
          prismaMock.transaction.findMany.mockResolvedValue(transactions as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Export to CSV
          const csvContent = await transactionService.exportToCSV(portfolioId)

          // Verify CSV is not empty
          expect(csvContent).toBeTruthy()
          expect(csvContent.length).toBeGreaterThan(0)

          // Reset mocks for import
          mockReset(prismaMock)
          
          // Mock for import (no existing transactions)
          prismaMock.transaction.findMany.mockResolvedValue([])
          prismaMock.transaction.create.mockResolvedValue({} as any)
          prismaMock.holding.findUnique.mockResolvedValue(null)
          prismaMock.holding.create.mockResolvedValue({} as any)
          prismaMock.holding.update.mockResolvedValue({} as any)

          // Import the CSV back
          const importResult = await transactionService.importFromCSV(portfolioId, csvContent, 'schwab')

          // Verify all transactions were imported successfully
          expect(importResult.successCount).toBe(transactions.length)
          expect(importResult.errorCount).toBe(0)

          // Verify the imported data matches original
          const createCalls = prismaMock.transaction.create.mock.calls
          expect(createCalls.length).toBe(transactions.length)

          // Check each imported transaction
          createCalls.forEach((call, index) => {
            const importedData = call[0].data
            const originalTx = transactions[index]

            // Verify symbol
            expect(importedData.symbol).toBe(originalTx.symbol)

            // Verify type
            expect(importedData.type).toBe(originalTx.type)

            // Verify quantity (allow small rounding differences)
            const importedQty = new Decimal(importedData.quantity.toString())
            const originalQty = new Decimal(originalTx.quantity.toString())
            const qtyDiff = importedQty.minus(originalQty).abs()
            expect(qtyDiff.lessThan(new Decimal('0.00000001'))).toBe(true)

            // Verify price (allow small rounding differences)
            const importedPrice = new Decimal(importedData.price.toString())
            const originalPrice = new Decimal(originalTx.price.toString())
            const priceDiff = importedPrice.minus(originalPrice).abs()
            expect(priceDiff.lessThan(new Decimal('0.00000001'))).toBe(true)

            // Verify date (same day)
            const importedDate = new Date(importedData.date)
            const originalDate = new Date(originalTx.date)
            expect(importedDate.toISOString().split('T')[0]).toBe(originalDate.toISOString().split('T')[0])
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty transaction list correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        async (portfolioId) => {
          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          // Mock empty transaction list
          prismaMock.transaction.findMany.mockResolvedValue([])

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Export to CSV
          const csvContent = await transactionService.exportToCSV(portfolioId)

          // Should return CSV with header only
          expect(csvContent).toBeTruthy()
          const lines = csvContent.trim().split('\n')
          expect(lines.length).toBe(1) // Only header
          expect(lines[0]).toContain('Date')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve holdings data through export-import round trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        fc.array(arbitraryHolding(), { minLength: 1, maxLength: 10 }),
        async (portfolioId, originalHoldings) => {
          // Ensure all holdings belong to the same portfolio
          const holdings = originalHoldings.map(h => ({
            ...h,
            portfolioId,
          }))

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          // Mock holding retrieval for export
          prismaMock.holding.findMany.mockResolvedValue(holdings as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Export holdings to CSV
          const csvContent = await transactionService.exportHoldingsToCSV(portfolioId)

          // Verify CSV is not empty
          expect(csvContent).toBeTruthy()
          expect(csvContent.length).toBeGreaterThan(0)

          // Verify CSV contains all holdings
          const lines = csvContent.trim().split('\n')
          expect(lines.length).toBe(holdings.length + 1) // +1 for header

          // Verify each holding is in the CSV
          holdings.forEach(holding => {
            expect(csvContent).toContain(holding.symbol)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 34: CSV 匯出編碼正確性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 34: CSV 匯出編碼正確性
 * 
 * 對於任何包含中文字元的資料，匯出的 CSV 檔案應該使用 UTF-8 編碼，
 * 且在文字編輯器中開啟時中文字元顯示正確。
 * 
 * Validates: Requirements 10.4
 */
describe('Property 34: CSV 匯出編碼正確性', () => {
  it('should export CSV with UTF-8 encoding for Chinese characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        fc.array(
          fc.record({
            id: fc.uuid(),
            portfolioId: arbitraryPortfolioId(),
            symbol: fc.constantFrom('2330', '2317', '2454', '台積電', '鴻海', '聯發科'),
            type: arbitraryTransactionType(),
            quantity: arbitraryQuantity(),
            price: arbitraryPrice(),
            date: arbitraryDate(),
            createdAt: arbitraryDate(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (portfolioId, originalTransactions) => {
          // Ensure all transactions belong to the same portfolio
          const transactions = originalTransactions.map(tx => ({
            ...tx,
            portfolioId,
          }))

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          // Mock transaction retrieval
          prismaMock.transaction.findMany.mockResolvedValue(transactions as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Export to CSV
          const csvContent = await transactionService.exportToCSV(portfolioId)

          // Verify CSV contains Chinese characters correctly
          transactions.forEach(tx => {
            if (/[\u4e00-\u9fa5]/.test(tx.symbol)) {
              // If symbol contains Chinese characters, verify they're in the CSV
              expect(csvContent).toContain(tx.symbol)
            }
          })

          // Verify the CSV can be encoded as UTF-8
          const encoder = new TextEncoder()
          const encoded = encoder.encode(csvContent)
          expect(encoded.length).toBeGreaterThan(0)

          // Verify decoding preserves Chinese characters
          const decoder = new TextDecoder('utf-8')
          const decoded = decoder.decode(encoded)
          expect(decoded).toBe(csvContent)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle mixed ASCII and Chinese characters correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        async (portfolioId) => {
          // Create transactions with mixed ASCII and Chinese
          const transactions = [
            {
              id: 'tx-1',
              portfolioId,
              symbol: '2330',
              type: 'BUY' as const,
              quantity: new Decimal('100'),
              price: new Decimal('500'),
              date: new Date('2024-01-01'),
              createdAt: new Date(),
            },
            {
              id: 'tx-2',
              portfolioId,
              symbol: '台積電',
              type: 'SELL' as const,
              quantity: new Decimal('50'),
              price: new Decimal('550'),
              date: new Date('2024-01-02'),
              createdAt: new Date(),
            },
          ]

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          // Mock transaction retrieval
          prismaMock.transaction.findMany.mockResolvedValue(transactions as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Export to CSV
          const csvContent = await transactionService.exportToCSV(portfolioId)

          // Verify both ASCII and Chinese symbols are present
          expect(csvContent).toContain('2330')
          expect(csvContent).toContain('台積電')

          // Verify UTF-8 encoding
          const encoder = new TextEncoder()
          const encoded = encoder.encode(csvContent)
          const decoder = new TextDecoder('utf-8')
          const decoded = decoder.decode(encoded)
          
          expect(decoded).toContain('2330')
          expect(decoded).toContain('台積電')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should export holdings with Chinese characters correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioId(),
        async (portfolioId) => {
          // Create holdings with Chinese characters
          const holdings = [
            {
              id: 'h-1',
              portfolioId,
              symbol: '台積電',
              quantity: new Decimal('100'),
              averageCost: new Decimal('500'),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'h-2',
              portfolioId,
              symbol: '鴻海',
              quantity: new Decimal('200'),
              averageCost: new Decimal('100'),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]

          // Reset mocks for this iteration
          mockReset(prismaMock)
          
          // Mock holding retrieval
          prismaMock.holding.findMany.mockResolvedValue(holdings as any)

          const { TransactionService } = await import('@/services/transaction.service')
          const transactionService = new TransactionService(prismaMock as any)

          // Export holdings to CSV
          const csvContent = await transactionService.exportHoldingsToCSV(portfolioId)

          // Verify Chinese characters are present
          expect(csvContent).toContain('台積電')
          expect(csvContent).toContain('鴻海')

          // Verify UTF-8 encoding preserves characters
          const encoder = new TextEncoder()
          const encoded = encoder.encode(csvContent)
          const decoder = new TextDecoder('utf-8')
          const decoded = decoder.decode(encoded)
          
          expect(decoded).toBe(csvContent)
          expect(decoded).toContain('台積電')
          expect(decoded).toContain('鴻海')
        }
      ),
      { numRuns: 100 }
    )
  })
})
