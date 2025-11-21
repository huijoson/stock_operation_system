import * as fc from 'fast-check'
import Decimal from 'decimal.js'

/**
 * Property-based tests for CalculationService
 * 
 * These tests verify the correctness properties of financial calculations
 * as defined in the design document.
 */

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate a realistic stock price (positive number with up to 8 decimal places)
 */
const arbitraryPrice = () =>
  fc
    .double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true })
    .map((n) => new Decimal(parseFloat(n.toFixed(8))))

/**
 * Generate a realistic quantity (positive number with up to 8 decimal places)
 */
const arbitraryQuantity = () =>
  fc
    .double({ min: 0.01, max: 100000, noNaN: true, noDefaultInfinity: true })
    .map((n) => new Decimal(parseFloat(n.toFixed(8))))

/**
 * Generate a holding with random symbol, quantity, and average cost
 */
const arbitraryHolding = () =>
  fc.record({
    symbol: fc.string({ minLength: 1, maxLength: 10 }).map(s => s.toUpperCase()),
    quantity: arbitraryQuantity(),
    averageCost: arbitraryPrice(),
  })

/**
 * Generate a transaction (buy or sell)
 */
const arbitraryTransaction = () =>
  fc.record({
    symbol: fc.string({ minLength: 1, maxLength: 10 }).map(s => s.toUpperCase()),
    type: fc.constantFrom('BUY', 'SELL'),
    quantity: arbitraryQuantity(),
    price: arbitraryPrice(),
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
  })

// ============================================================================
// Property 19: 未實現損益計算正確性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 19: 未實現損益計算正確性
 * 
 * 對於任何持股和目前股價，未實現損益應該等於（目前股價 - 平均成本）× 持股數量。
 * 
 * Validates: Requirements 6.1
 */
describe('Property 19: 未實現損益計算正確性', () => {
  it('should calculate unrealized P&L as (currentPrice - averageCost) * quantity', () => {
    fc.assert(
      fc.property(
        arbitraryHolding(),
        arbitraryPrice(),
        (holding, currentPrice) => {
          // Import the calculation function
          const { calculateUnrealizedPL } = require('@/lib/calculations/calculation-service')
          
          // Calculate unrealized P&L
          const unrealizedPL = calculateUnrealizedPL(holding, currentPrice)
          
          // Expected: (currentPrice - averageCost) * quantity
          const expected = currentPrice.minus(holding.averageCost).mul(holding.quantity)
          
          // Verify the result matches the formula
          expect(unrealizedPL.equals(expected)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return zero when current price equals average cost', () => {
    fc.assert(
      fc.property(
        arbitraryHolding(),
        (holding) => {
          const { calculateUnrealizedPL } = require('@/lib/calculations/calculation-service')
          
          // Use average cost as current price
          const unrealizedPL = calculateUnrealizedPL(holding, holding.averageCost)
          
          // Should be zero
          expect(unrealizedPL.isZero()).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return positive P&L when current price is higher than average cost', () => {
    fc.assert(
      fc.property(
        arbitraryHolding(),
        (holding) => {
          const { calculateUnrealizedPL } = require('@/lib/calculations/calculation-service')
          
          // Use a price higher than average cost
          const currentPrice = holding.averageCost.mul(1.5)
          const unrealizedPL = calculateUnrealizedPL(holding, currentPrice)
          
          // Should be positive
          expect(unrealizedPL.isPositive()).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return negative P&L when current price is lower than average cost', () => {
    fc.assert(
      fc.property(
        arbitraryHolding(),
        (holding) => {
          const { calculateUnrealizedPL } = require('@/lib/calculations/calculation-service')
          
          // Use a price lower than average cost
          const currentPrice = holding.averageCost.mul(0.5)
          const unrealizedPL = calculateUnrealizedPL(holding, currentPrice)
          
          // Should be negative
          expect(unrealizedPL.isNegative()).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ============================================================================
// Property 20: 總未實現損益聚合正確性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 20: 總未實現損益聚合正確性
 * 
 * 對於任何投資組合，總未實現損益應該等於所有持股的未實現損益之和。
 * 
 * Validates: Requirements 6.2
 */
describe('Property 20: 總未實現損益聚合正確性', () => {
  it('should calculate total unrealized P&L as sum of all holdings unrealized P&L', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryHolding(), { minLength: 1, maxLength: 10 }),
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }).map(s => s.toUpperCase()),
          arbitraryPrice(),
          { minKeys: 1, maxKeys: 20 }
        ),
        (holdings, priceMap) => {
          const { calculateUnrealizedPL, calculateTotalUnrealizedPL } = 
            require('@/lib/calculations/calculation-service')
          
          // Calculate total using the service
          const totalUnrealizedPL = calculateTotalUnrealizedPL(holdings, priceMap)
          
          // Calculate expected by summing individual unrealized P&L
          let expectedTotal = new Decimal(0)
          for (const holding of holdings) {
            const currentPrice = priceMap[holding.symbol]
            if (currentPrice) {
              const unrealizedPL = calculateUnrealizedPL(holding, currentPrice)
              expectedTotal = expectedTotal.plus(unrealizedPL)
            }
          }
          
          // Verify the result matches the sum
          expect(totalUnrealizedPL.equals(expectedTotal)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return zero when all holdings have zero unrealized P&L', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryHolding(), { minLength: 1, maxLength: 10 }),
        (holdings) => {
          const { calculateTotalUnrealizedPL } = 
            require('@/lib/calculations/calculation-service')
          
          // Create price map where all prices equal average cost
          const priceMap: Record<string, Decimal> = {}
          holdings.forEach(h => {
            priceMap[h.symbol] = h.averageCost
          })
          
          const totalUnrealizedPL = calculateTotalUnrealizedPL(holdings, priceMap)
          
          // Should be zero
          expect(totalUnrealizedPL.isZero()).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty holdings array', () => {
    const { calculateTotalUnrealizedPL } = 
      require('@/lib/calculations/calculation-service')
    
    const totalUnrealizedPL = calculateTotalUnrealizedPL([], {})
    
    // Should be zero
    expect(totalUnrealizedPL.isZero()).toBe(true)
  })
})

// ============================================================================
// Property 21: 已實現損益計算正確性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 21: 已實現損益計算正確性
 * 
 * 對於任何賣出交易序列，已實現損益應該等於所有賣出交易的
 * （賣出價格 - 買入時平均成本）× 賣出數量之和。
 * 
 * Validates: Requirements 6.3
 */
describe('Property 21: 已實現損益計算正確性', () => {
  it('should calculate realized P&L as sum of (sellPrice - avgCost) * quantity for all sell transactions', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryTransaction(), { minLength: 1, maxLength: 20 }),
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }).map(s => s.toUpperCase()),
          arbitraryPrice(),
          { minKeys: 1, maxKeys: 20 }
        ),
        (transactions, avgCostMap) => {
          const { calculateRealizedPL } = 
            require('@/lib/calculations/calculation-service')
          
          // Calculate realized P&L
          const realizedPL = calculateRealizedPL(transactions, avgCostMap)
          
          // Calculate expected by summing (sellPrice - avgCost) * quantity for SELL transactions
          let expectedTotal = new Decimal(0)
          for (const tx of transactions) {
            if (tx.type === 'SELL') {
              const avgCost = avgCostMap[tx.symbol]
              if (avgCost) {
                const pl = tx.price.minus(avgCost).mul(tx.quantity)
                expectedTotal = expectedTotal.plus(pl)
              }
            }
          }
          
          // Verify the result matches the sum
          expect(realizedPL.equals(expectedTotal)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return zero when there are no sell transactions', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryTransaction(), { minLength: 1, maxLength: 10 })
          .map(txs => txs.map(tx => ({ ...tx, type: 'BUY' }))),
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }).map(s => s.toUpperCase()),
          arbitraryPrice(),
          { minKeys: 1, maxKeys: 20 }
        ),
        (transactions, avgCostMap) => {
          const { calculateRealizedPL } = 
            require('@/lib/calculations/calculation-service')
          
          const realizedPL = calculateRealizedPL(transactions, avgCostMap)
          
          // Should be zero (no sell transactions)
          expect(realizedPL.isZero()).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty transactions array', () => {
    const { calculateRealizedPL } = 
      require('@/lib/calculations/calculation-service')
    
    const realizedPL = calculateRealizedPL([], {})
    
    // Should be zero
    expect(realizedPL.isZero()).toBe(true)
  })

  it('should return positive P&L when sell price is higher than average cost', () => {
    fc.assert(
      fc.property(
        arbitraryTransaction().filter(tx => tx.type === 'SELL'),
        (sellTx) => {
          const { calculateRealizedPL } = 
            require('@/lib/calculations/calculation-service')
          
          // Set average cost lower than sell price
          const avgCost = sellTx.price.mul(0.8)
          const avgCostMap = { [sellTx.symbol]: avgCost }
          
          const realizedPL = calculateRealizedPL([sellTx], avgCostMap)
          
          // Should be positive
          expect(realizedPL.isPositive()).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 22: 報酬率計算正確性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 22: 報酬率計算正確性
 * 
 * 對於任何投資組合，報酬率應該等於（總損益 / 總成本）× 100%。
 * 
 * Validates: Requirements 6.5
 */
describe('Property 22: 報酬率計算正確性', () => {
  it('should calculate return rate as (totalPL / totalCost) * 100', () => {
    fc.assert(
      fc.property(
        arbitraryPrice().filter(p => p.greaterThan(0)),
        arbitraryPrice(),
        (totalCost, totalPL) => {
          const { calculateReturnRate } = 
            require('@/lib/calculations/calculation-service')
          
          // Calculate return rate
          const returnRate = calculateReturnRate(totalPL, totalCost)
          
          // Expected: (totalPL / totalCost) * 100
          const expected = totalPL.div(totalCost).mul(100)
          
          // Verify the result matches the formula
          expect(returnRate.equals(expected)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return zero when total P&L is zero', () => {
    fc.assert(
      fc.property(
        arbitraryPrice().filter(p => p.greaterThan(0)),
        (totalCost) => {
          const { calculateReturnRate } = 
            require('@/lib/calculations/calculation-service')
          
          const returnRate = calculateReturnRate(new Decimal(0), totalCost)
          
          // Should be zero
          expect(returnRate.isZero()).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 100% when total P&L equals total cost', () => {
    fc.assert(
      fc.property(
        arbitraryPrice().filter(p => p.greaterThan(0)),
        (totalCost) => {
          const { calculateReturnRate } = 
            require('@/lib/calculations/calculation-service')
          
          const returnRate = calculateReturnRate(totalCost, totalCost)
          
          // Should be 100%
          expect(returnRate.equals(new Decimal(100))).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return positive rate when total P&L is positive', () => {
    fc.assert(
      fc.property(
        arbitraryPrice().filter(p => p.greaterThan(0)),
        (totalCost) => {
          const { calculateReturnRate } = 
            require('@/lib/calculations/calculation-service')
          
          const totalPL = totalCost.mul(0.2) // 20% profit
          const returnRate = calculateReturnRate(totalPL, totalCost)
          
          // Should be positive
          expect(returnRate.isPositive()).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return negative rate when total P&L is negative', () => {
    fc.assert(
      fc.property(
        arbitraryPrice().filter(p => p.greaterThan(0)),
        (totalCost) => {
          const { calculateReturnRate } = 
            require('@/lib/calculations/calculation-service')
          
          const totalPL = totalCost.mul(-0.2) // 20% loss
          const returnRate = calculateReturnRate(totalPL, totalCost)
          
          // Should be negative
          expect(returnRate.isNegative()).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should throw error when total cost is zero', () => {
    const { calculateReturnRate } = 
      require('@/lib/calculations/calculation-service')
    
    expect(() => {
      calculateReturnRate(new Decimal(100), new Decimal(0))
    }).toThrow()
  })
})
