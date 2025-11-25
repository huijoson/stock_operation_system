import * as fc from 'fast-check'
import Decimal from 'decimal.js'
import { ATRService } from '@/services/atr.service'

describe('ATR Service - Property-Based Tests', () => {
  let service: ATRService

  beforeEach(() => {
    service = new ATRService()
  })

  // Custom arbitraries for generating test data
  const arbitraryPrice = () => fc.double({ min: 1, max: 10000, noNaN: true })
  
  /**
   * Generate a valid price sequence with highs, lows, and closes
   * Ensures: high >= close >= low for each candle
   */
  const arbitraryPriceSequence = (minLength: number = 15) => 
    fc.array(
      fc.record({
        low: arbitraryPrice(),
        high: arbitraryPrice(),
        close: arbitraryPrice()
      }).map(({ low, high, close }) => {
        // Ensure high >= low
        const actualLow = Math.min(low, high)
        const actualHigh = Math.max(low, high)
        // Ensure close is between low and high
        const actualClose = Math.min(Math.max(close, actualLow), actualHigh)
        return {
          high: actualHigh,
          low: actualLow,
          close: actualClose
        }
      }),
      { minLength, maxLength: 100 }
    )

  /**
   * Feature: technical-indicators, Property 15: ATR 公式正確性
   * Validates: Requirements 6.2
   * 
   * Property: For any price sequence (highs, lows, closes), the calculated ATR should
   * follow the formula: ATR = (Previous ATR × (period - 1) + Current TR) / period
   * where TR = max(High - Low, |High - Previous Close|, |Low - Previous Close|)
   */
  describe('Property 15: ATR Formula Correctness', () => {
    it('should calculate ATR following the smoothing formula', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20),
          fc.integer({ min: 5, max: 20 }),
          (priceData, period) => {
            // Skip if insufficient data
            if (priceData.length < period + 1) return true

            // Arrange: Extract price arrays
            const highs = priceData.map(p => new Decimal(p.high))
            const lows = priceData.map(p => new Decimal(p.low))
            const closes = priceData.map(p => new Decimal(p.close))

            // Act: Calculate ATR using the service
            const result = service.calculateATR(highs, lows, closes, period)

            // Assert: Manually verify the ATR calculation follows the formula
            // Step 1: Calculate all True Range values
            const trValues: Decimal[] = []
            for (let i = 1; i < highs.length; i++) {
              const tr = service.calculateTrueRange(highs[i], lows[i], closes[i - 1])
              trValues.push(tr)
            }

            // Step 2: Calculate first ATR as simple average of first 'period' TR values
            let expectedATR = trValues
              .slice(0, period)
              .reduce((sum, tr) => sum.plus(tr), new Decimal(0))
              .dividedBy(period)

            // Step 3: Verify subsequent ATR values using smoothing formula
            // ATR = (Previous ATR × (period - 1) + Current TR) / period
            for (let i = period; i < trValues.length; i++) {
              expectedATR = expectedATR
                .times(period - 1)
                .plus(trValues[i])
                .dividedBy(period)
            }

            // The final ATR should match our calculated expected ATR
            const difference = result.value.minus(expectedATR).abs()
            expect(difference.toNumber()).toBeLessThan(1e-10)

            // Verify the ATR history length is correct
            expect(result.history.length).toBe(trValues.length - period + 1)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate True Range correctly for all three cases', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          arbitraryPrice(),
          arbitraryPrice(),
          (price1, price2, price3) => {
            // Arrange: Create valid high, low, previousClose
            const high = Math.max(price1, price2, price3)
            const low = Math.min(price1, price2, price3)
            const previousClose = price2

            // Act: Calculate TR
            const tr = service.calculateTrueRange(high, low, previousClose)

            // Assert: TR should equal the maximum of three values
            const range1 = new Decimal(high).minus(low)
            const range2 = new Decimal(high).minus(previousClose).abs()
            const range3 = new Decimal(low).minus(previousClose).abs()

            const expectedTR = Decimal.max(range1, range2, range3)
            
            expect(tr.equals(expectedTR)).toBe(true)

            // TR should always be non-negative
            expect(tr.greaterThanOrEqualTo(0)).toBe(true)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain ATR formula correctness across different periods', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(30),
          fc.integer({ min: 5, max: 25 }),
          (priceData, period) => {
            // Skip if insufficient data
            if (priceData.length < period + 1) return true

            // Arrange
            const highs = priceData.map(p => new Decimal(p.high))
            const lows = priceData.map(p => new Decimal(p.low))
            const closes = priceData.map(p => new Decimal(p.close))

            // Act
            const result = service.calculateATR(highs, lows, closes, period)

            // Assert: Verify the first ATR value in history
            // It should be the simple average of the first 'period' TR values
            const trValues: Decimal[] = []
            for (let i = 1; i < highs.length; i++) {
              const tr = service.calculateTrueRange(highs[i], lows[i], closes[i - 1])
              trValues.push(tr)
            }

            const firstATR = trValues
              .slice(0, period)
              .reduce((sum, tr) => sum.plus(tr), new Decimal(0))
              .dividedBy(period)

            const firstHistoryValue = result.history[0].value
            const difference = firstHistoryValue.minus(firstATR).abs()
            expect(difference.toNumber()).toBeLessThan(1e-10)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce ATR values that are always positive', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20),
          fc.integer({ min: 5, max: 15 }),
          (priceData, period) => {
            // Skip if insufficient data
            if (priceData.length < period + 1) return true

            // Arrange
            const highs = priceData.map(p => new Decimal(p.high))
            const lows = priceData.map(p => new Decimal(p.low))
            const closes = priceData.map(p => new Decimal(p.close))

            // Act
            const result = service.calculateATR(highs, lows, closes, period)

            // Assert: ATR should always be positive
            expect(result.value.greaterThan(0)).toBe(true)

            // All history values should be positive
            result.history.forEach(item => {
              expect(item.value.greaterThan(0)).toBe(true)
            })

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should apply exponential smoothing correctly in ATR calculation', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(25),
          (priceData) => {
            // Use standard 14-period ATR
            const period = 14
            
            // Skip if insufficient data
            if (priceData.length < period + 1) return true

            // Arrange
            const highs = priceData.map(p => new Decimal(p.high))
            const lows = priceData.map(p => new Decimal(p.low))
            const closes = priceData.map(p => new Decimal(p.close))

            // Act
            const result = service.calculateATR(highs, lows, closes, period)

            // Assert: Verify the smoothing formula is applied correctly
            // Calculate TR values
            const trValues: Decimal[] = []
            for (let i = 1; i < highs.length; i++) {
              const tr = service.calculateTrueRange(highs[i], lows[i], closes[i - 1])
              trValues.push(tr)
            }

            // Calculate ATR step by step
            let atr = trValues
              .slice(0, period)
              .reduce((sum, tr) => sum.plus(tr), new Decimal(0))
              .dividedBy(period)

            // Verify each subsequent ATR value
            for (let i = period; i < trValues.length; i++) {
              // Apply smoothing formula: ATR = (Previous ATR × (period - 1) + Current TR) / period
              const previousATR = atr
              const currentTR = trValues[i]
              atr = previousATR.times(period - 1).plus(currentTR).dividedBy(period)

              // Verify this matches the history
              const historyIndex = i - period + 1
              if (historyIndex < result.history.length) {
                const historyValue = result.history[historyIndex].value
                const difference = historyValue.minus(atr).abs()
                expect(difference.toNumber()).toBeLessThan(1e-10)
              }
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case of minimum data length', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 15 }),
          (period) => {
            // Create exactly period + 1 data points (minimum required)
            const priceData = Array.from({ length: period + 1 }, (_, i) => ({
              high: 100 + i,
              low: 90 + i,
              close: 95 + i
            }))

            // Arrange
            const highs = priceData.map(p => new Decimal(p.high))
            const lows = priceData.map(p => new Decimal(p.low))
            const closes = priceData.map(p => new Decimal(p.close))

            // Act
            const result = service.calculateATR(highs, lows, closes, period)

            // Assert: Should successfully calculate ATR
            expect(result.value).toBeDefined()
            expect(result.value.greaterThan(0)).toBe(true)

            // Should have exactly 1 history entry (only the initial ATR)
            expect(result.history.length).toBe(1)

            // Verify the ATR value matches the simple average of TR values
            const trValues: Decimal[] = []
            for (let i = 1; i < highs.length; i++) {
              const tr = service.calculateTrueRange(highs[i], lows[i], closes[i - 1])
              trValues.push(tr)
            }

            const expectedATR = trValues
              .reduce((sum, tr) => sum.plus(tr), new Decimal(0))
              .dividedBy(period)

            const difference = result.value.minus(expectedATR).abs()
            expect(difference.toNumber()).toBeLessThan(1e-10)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain precision in ATR calculations with Decimal arithmetic', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20),
          fc.integer({ min: 10, max: 15 }),
          (priceData, period) => {
            // Skip if insufficient data
            if (priceData.length < period + 1) return true

            // Arrange
            const highs = priceData.map(p => new Decimal(p.high))
            const lows = priceData.map(p => new Decimal(p.low))
            const closes = priceData.map(p => new Decimal(p.close))

            // Act
            const result = service.calculateATR(highs, lows, closes, period)

            // Assert: Recalculate and verify precision is maintained
            // Calculate TR values
            const trValues: Decimal[] = []
            for (let i = 1; i < highs.length; i++) {
              const tr = service.calculateTrueRange(highs[i], lows[i], closes[i - 1])
              trValues.push(tr)
            }

            // Recalculate ATR
            let recalculatedATR = trValues
              .slice(0, period)
              .reduce((sum, tr) => sum.plus(tr), new Decimal(0))
              .dividedBy(period)

            for (let i = period; i < trValues.length; i++) {
              recalculatedATR = recalculatedATR
                .times(period - 1)
                .plus(trValues[i])
                .dividedBy(period)
            }

            // The recalculated ATR should exactly match the result
            expect(result.value.equals(recalculatedATR)).toBe(true)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle gaps correctly in True Range calculation', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          fc.double({ min: 0.1, max: 0.5, noNaN: true }),
          fc.boolean(),
          (basePrice, gapPercent, isGapUp) => {
            // Create a gap scenario
            const previousClose = basePrice
            
            if (isGapUp) {
              // Gap up: current low is above previous close
              const currentLow = basePrice * (1 + gapPercent)
              const currentHigh = currentLow * 1.05
              
              const tr = service.calculateTrueRange(currentHigh, currentLow, previousClose)
              
              // TR should be |High - Previous Close| since it's the largest
              const expectedTR = new Decimal(currentHigh).minus(previousClose)
              expect(tr.equals(expectedTR)).toBe(true)
            } else {
              // Gap down: current high is below previous close
              const currentHigh = basePrice * (1 - gapPercent)
              const currentLow = currentHigh * 0.95
              
              const tr = service.calculateTrueRange(currentHigh, currentLow, previousClose)
              
              // TR should be |Low - Previous Close| since it's the largest
              const expectedTR = new Decimal(previousClose).minus(currentLow)
              expect(tr.equals(expectedTR)).toBe(true)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce consistent ATR history with correct length', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(30),
          fc.integer({ min: 10, max: 20 }),
          (priceData, period) => {
            // Skip if insufficient data
            if (priceData.length < period + 1) return true

            // Arrange
            const highs = priceData.map(p => new Decimal(p.high))
            const lows = priceData.map(p => new Decimal(p.low))
            const closes = priceData.map(p => new Decimal(p.close))

            // Act
            const result = service.calculateATR(highs, lows, closes, period)

            // Assert: History length should be (data length - period)
            // Because we need period + 1 data points, and we lose 1 for TR calculation
            const expectedHistoryLength = highs.length - period
            expect(result.history.length).toBe(expectedHistoryLength)

            // Each history entry should have a date and value
            result.history.forEach(entry => {
              expect(entry.date).toBeInstanceOf(Date)
              expect(entry.value).toBeInstanceOf(Decimal)
              expect(entry.value.greaterThan(0)).toBe(true)
            })

            // The last history value should equal the final ATR value
            const lastHistoryValue = result.history[result.history.length - 1].value
            expect(lastHistoryValue.equals(result.value)).toBe(true)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
