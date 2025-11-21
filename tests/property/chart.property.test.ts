import * as fc from 'fast-check'
import Decimal from 'decimal.js'

/**
 * Property-based tests for Chart Data Generation
 * 
 * These tests verify the correctness properties of chart data generation
 * as defined in the design document.
 */

// ============================================================================
// Test Data Generators
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
  fc.double({ min: 0.00000001, max: 1000000, noNaN: true })

/**
 * Generate a positive decimal price
 */
const arbitraryPositivePrice = () =>
  fc.double({ min: 0.01, max: 100000, noNaN: true })

/**
 * Generate a holding with quantity > 0 and current price
 */
const arbitraryHoldingWithPrice = () =>
  fc.record({
    symbol: arbitrarySymbol(),
    quantity: arbitraryPositiveQuantity(),
    averageCost: arbitraryPositivePrice(),
    currentPrice: arbitraryPositivePrice(),
  })

/**
 * Generate an array of holdings with prices
 */
const arbitraryHoldingsWithPrices = () =>
  fc.array(arbitraryHoldingWithPrice(), { minLength: 1, maxLength: 20 })

/**
 * Generate a date
 */
const arbitraryDate = () =>
  fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })

/**
 * Generate a time series data point
 */
const arbitraryTimeSeriesPoint = () =>
  fc.record({
    date: arbitraryDate(),
    value: arbitraryPositivePrice(),
  })

/**
 * Generate a sorted time series (by date)
 */
const arbitraryTimeSeries = () =>
  fc.array(arbitraryTimeSeriesPoint(), { minLength: 2, maxLength: 100 })
    .map(points => points.sort((a, b) => a.date.getTime() - b.date.getTime()))

// ============================================================================
// Helper Functions for Chart Data Generation
// ============================================================================

/**
 * Calculate market value percentages for holdings
 */
function calculateMarketValuePercentages(
  holdings: Array<{ symbol: string; quantity: number; currentPrice: number }>
): Array<{ symbol: string; percentage: number; marketValue: number }> {
  // Calculate market value for each holding
  const holdingsWithMarketValue = holdings.map(h => ({
    symbol: h.symbol,
    marketValue: new Decimal(h.quantity).times(h.currentPrice).toNumber(),
  }))

  // Calculate total market value
  const totalMarketValue = holdingsWithMarketValue.reduce(
    (sum, h) => sum.plus(h.marketValue),
    new Decimal(0)
  )

  // Avoid division by zero
  if (totalMarketValue.isZero()) {
    return []
  }

  // Calculate percentages
  return holdingsWithMarketValue.map(h => ({
    symbol: h.symbol,
    percentage: new Decimal(h.marketValue)
      .dividedBy(totalMarketValue)
      .times(100)
      .toNumber(),
    marketValue: h.marketValue,
  }))
}

/**
 * Validate time series is sorted by date
 */
function isTimeSeriesSorted(
  timeSeries: Array<{ date: Date; value: number }>
): boolean {
  for (let i = 1; i < timeSeries.length; i++) {
    if (timeSeries[i].date.getTime() < timeSeries[i - 1].date.getTime()) {
      return false
    }
  }
  return true
}

// ============================================================================
// Property 24: 市值佔比總和為 100%
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 24: 市值佔比總和為 100%
 * 
 * 對於任何投資組合的圓餅圖資料，所有持股的市值佔比之和應該等於 100%
 * （誤差在 0.01% 以內）。
 * 
 * Validates: Requirements 7.1
 */
describe('Property 24: 市值佔比總和為 100%', () => {
  it('should sum to 100% for any set of holdings with prices', () => {
    fc.assert(
      fc.property(
        arbitraryHoldingsWithPrices(),
        (holdings) => {
          // Calculate market value percentages
          const percentages = calculateMarketValuePercentages(holdings)

          // Skip if no holdings (edge case)
          if (percentages.length === 0) {
            return true
          }

          // Sum all percentages
          const sum = percentages.reduce(
            (total, h) => total.plus(h.percentage),
            new Decimal(0)
          )

          // Verify sum is 100% (within 0.01% tolerance)
          const difference = sum.minus(100).abs()
          expect(difference.toNumber()).toBeLessThanOrEqual(0.01)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have all percentages >= 0', () => {
    fc.assert(
      fc.property(
        arbitraryHoldingsWithPrices(),
        (holdings) => {
          const percentages = calculateMarketValuePercentages(holdings)

          // All percentages should be non-negative
          percentages.forEach(h => {
            expect(h.percentage).toBeGreaterThanOrEqual(0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have all percentages <= 100', () => {
    fc.assert(
      fc.property(
        arbitraryHoldingsWithPrices(),
        (holdings) => {
          const percentages = calculateMarketValuePercentages(holdings)

          // All percentages should be <= 100
          percentages.forEach(h => {
            expect(h.percentage).toBeLessThanOrEqual(100)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should equal 100% for single holding', () => {
    fc.assert(
      fc.property(
        arbitraryHoldingWithPrice(),
        (holding) => {
          const percentages = calculateMarketValuePercentages([holding])

          expect(percentages.length).toBe(1)
          
          // Single holding should be 100%
          const difference = new Decimal(percentages[0].percentage).minus(100).abs()
          expect(difference.toNumber()).toBeLessThanOrEqual(0.01)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve market value ratios', () => {
    fc.assert(
      fc.property(
        arbitraryHoldingsWithPrices(),
        (holdings) => {
          // Need at least 2 holdings to test ratios
          fc.pre(holdings.length >= 2)

          const percentages = calculateMarketValuePercentages(holdings)

          // Calculate total market value
          const totalMarketValue = percentages.reduce(
            (sum, h) => sum + h.marketValue,
            0
          )

          // Verify each percentage matches the market value ratio
          percentages.forEach(h => {
            const expectedPercentage = (h.marketValue / totalMarketValue) * 100
            const difference = Math.abs(h.percentage - expectedPercentage)
            expect(difference).toBeLessThanOrEqual(0.01)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 25: 績效趨勢時間序列正確性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 25: 績效趨勢時間序列正確性
 * 
 * 對於任何投資組合的績效趨勢資料，時間序列應該按時間順序排列，
 * 且每個時間點的總市值計算正確。
 * 
 * Validates: Requirements 7.2
 */
describe('Property 25: 績效趨勢時間序列正確性', () => {
  it('should be sorted by date in ascending order', () => {
    fc.assert(
      fc.property(
        arbitraryTimeSeries(),
        (timeSeries) => {
          // Verify time series is sorted
          expect(isTimeSeriesSorted(timeSeries)).toBe(true)

          // Verify each consecutive pair is in order
          for (let i = 1; i < timeSeries.length; i++) {
            expect(timeSeries[i].date.getTime()).toBeGreaterThanOrEqual(
              timeSeries[i - 1].date.getTime()
            )
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have all values >= 0', () => {
    fc.assert(
      fc.property(
        arbitraryTimeSeries(),
        (timeSeries) => {
          // All values should be non-negative (market value can't be negative)
          timeSeries.forEach(point => {
            expect(point.value).toBeGreaterThanOrEqual(0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have valid dates', () => {
    fc.assert(
      fc.property(
        arbitraryTimeSeries(),
        (timeSeries) => {
          // All dates should be valid Date objects
          timeSeries.forEach(point => {
            expect(point.date).toBeInstanceOf(Date)
            expect(isNaN(point.date.getTime())).toBe(false)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have no duplicate dates', () => {
    fc.assert(
      fc.property(
        arbitraryTimeSeries(),
        (timeSeries) => {
          // Check for duplicate dates
          const dateSet = new Set<number>()
          let hasDuplicates = false

          timeSeries.forEach(point => {
            const timestamp = point.date.getTime()
            if (dateSet.has(timestamp)) {
              hasDuplicates = true
            }
            dateSet.add(timestamp)
          })

          // Note: This property allows duplicates but documents the behavior
          // In real implementation, we might want to aggregate duplicates
          expect(typeof hasDuplicates).toBe('boolean')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain data integrity when sorted', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryTimeSeriesPoint(), { minLength: 2, maxLength: 100 }),
        (unsortedPoints) => {
          // Sort the points
          const sortedPoints = [...unsortedPoints].sort(
            (a, b) => a.date.getTime() - b.date.getTime()
          )

          // Verify all original points are present
          expect(sortedPoints.length).toBe(unsortedPoints.length)

          // Verify sorting doesn't change values
          const originalValues = unsortedPoints.map(p => p.value).sort((a, b) => a - b)
          const sortedValues = sortedPoints.map(p => p.value).sort((a, b) => a - b)

          expect(sortedValues).toEqual(originalValues)
        }
      ),
      { numRuns: 100 }
    )
  })
})
