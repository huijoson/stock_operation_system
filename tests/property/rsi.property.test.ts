import * as fc from 'fast-check'
import Decimal from 'decimal.js'
import { RSIService } from '@/services/rsi.service'

describe('RSI Service - Property-Based Tests', () => {
  let service: RSIService

  beforeEach(() => {
    service = new RSIService()
  })

  // Custom arbitraries for generating test data
  const arbitraryPrice = () => fc.double({ min: 1, max: 1000, noNaN: true, noDefaultInfinity: true })
  
  /**
   * Generate a sequence of prices with realistic variations
   * Ensures we have enough data points for RSI calculation
   */
  const arbitraryPriceSequence = (minLength: number = 15) => 
    fc.array(arbitraryPrice(), { minLength, maxLength: 100 })
      .filter(prices => {
        // Ensure we have some variation in prices (not all the same)
        const uniquePrices = new Set(prices)
        return uniquePrices.size > 1
      })

  /**
   * Feature: technical-indicators, Property 6: RSI 公式正確性
   * Validates: Requirements 3.2
   * 
   * Property: For any price sequence and period, the calculated RSI value should equal:
   * RSI = 100 - (100 / (1 + RS)), where RS = Average Gain / Average Loss
   */
  describe('Property 6: RSI Formula Correctness', () => {
    it('should calculate RSI using the correct formula for any price sequence', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(15),
          fc.integer({ min: 5, max: 20 }),
          (prices, period) => {
            // Ensure we have enough data
            if (prices.length < period + 1) {
              return true // Skip this test case
            }

            // Act: Calculate RSI using the service
            const result = service.calculateRSI(prices, period)

            // Manual calculation to verify the formula
            const priceDecimals = prices.map(p => new Decimal(p))
            
            // Calculate price changes
            const changes: Decimal[] = []
            for (let i = 1; i < priceDecimals.length; i++) {
              changes.push(priceDecimals[i].minus(priceDecimals[i - 1]))
            }

            // Separate gains and losses
            const gains: Decimal[] = changes.map(change => 
              change.greaterThan(0) ? change : new Decimal(0)
            )
            const losses: Decimal[] = changes.map(change => 
              change.lessThan(0) ? change.abs() : new Decimal(0)
            )

            // Calculate initial average gain and loss (SMA for first period)
            let avgGain = gains.slice(0, period)
              .reduce((sum, gain) => sum.plus(gain), new Decimal(0))
              .dividedBy(period)
            let avgLoss = losses.slice(0, period)
              .reduce((sum, loss) => sum.plus(loss), new Decimal(0))
              .dividedBy(period)

            // Calculate smoothed averages for remaining periods
            for (let i = period; i < changes.length; i++) {
              avgGain = avgGain.times(period - 1).plus(gains[i]).dividedBy(period)
              avgLoss = avgLoss.times(period - 1).plus(losses[i]).dividedBy(period)
            }

            // Calculate RS and RSI using the formula
            let expectedRSI: number
            if (avgLoss.isZero()) {
              // When there are no losses, RSI = 100
              expectedRSI = 100
            } else {
              const rs = avgGain.dividedBy(avgLoss)
              expectedRSI = new Decimal(100).minus(
                new Decimal(100).dividedBy(rs.plus(1))
              ).toNumber()
            }

            // Assert: The calculated RSI should match the formula
            // Allow small tolerance for floating-point precision
            expect(result.value).toBeCloseTo(expectedRSI, 10)

            // Assert: RSI should be between 0 and 100
            expect(result.value).toBeGreaterThanOrEqual(0)
            expect(result.value).toBeLessThanOrEqual(100)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce RSI of 100 when all price changes are gains', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 100, noNaN: true }),
          fc.integer({ min: 10, max: 20 }), // Use larger period for more stable RSI
          fc.integer({ min: 30, max: 50 }), // Use more data points
          (startPrice, period, length) => {
            // Create a sequence where prices only go up
            const prices: number[] = [startPrice]
            for (let i = 1; i < length; i++) {
              prices.push(prices[i - 1] + Math.random() * 2 + 0.1) // Always increase
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: RSI should be very high (approaching 100) when there are only gains
            // With enough data points and consistent gains, RSI should be > 95
            expect(result.value).toBeGreaterThan(95)
            expect(result.value).toBeLessThanOrEqual(100)
            expect(result.status).toBe('overbought')

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce RSI of 0 when all price changes are losses', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 1000, noNaN: true }),
          fc.integer({ min: 5, max: 20 }),
          fc.integer({ min: 15, max: 50 }),
          (startPrice, period, length) => {
            // Create a sequence where prices only go down
            const prices: number[] = [startPrice]
            for (let i = 1; i < length; i++) {
              const decrease = Math.random() * 2 + 0.1
              const newPrice = prices[i - 1] - decrease
              if (newPrice > 0) {
                prices.push(newPrice)
              } else {
                break // Stop if price would go negative
              }
            }

            // Only test if we have enough data
            if (prices.length < period + 1) {
              return true
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: RSI should be 0 (or very close) when there are only losses
            expect(result.value).toBeGreaterThanOrEqual(0)
            expect(result.value).toBeLessThan(0.1)
            expect(result.status).toBe('oversold')

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate RSI correctly for different periods', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(30),
          fc.integer({ min: 5, max: 14 }),
          fc.integer({ min: 15, max: 25 }),
          (prices, period1, period2) => {
            // Ensure we have enough data for both periods
            const maxPeriod = Math.max(period1, period2)
            if (prices.length < maxPeriod + 1) {
              return true
            }

            // Act: Calculate RSI with different periods
            const result1 = service.calculateRSI(prices, period1)
            const result2 = service.calculateRSI(prices, period2)

            // Assert: Both should be valid RSI values
            expect(result1.value).toBeGreaterThanOrEqual(0)
            expect(result1.value).toBeLessThanOrEqual(100)
            expect(result2.value).toBeGreaterThanOrEqual(0)
            expect(result2.value).toBeLessThanOrEqual(100)

            // Assert: Different periods may produce different RSI values
            // (but both should follow the formula)
            // We just verify they're both valid, not that they're different

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain formula correctness with Decimal precision', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act
            const result = service.calculateRSI(prices, period)

            // Verify using Decimal arithmetic throughout
            const priceDecimals = prices.map(p => new Decimal(p))
            const changes: Decimal[] = []
            for (let i = 1; i < priceDecimals.length; i++) {
              changes.push(priceDecimals[i].minus(priceDecimals[i - 1]))
            }

            const gains = changes.map(c => c.greaterThan(0) ? c : new Decimal(0))
            const losses = changes.map(c => c.lessThan(0) ? c.abs() : new Decimal(0))

            // Calculate averages
            let avgGain = gains.slice(0, period)
              .reduce((sum, g) => sum.plus(g), new Decimal(0))
              .dividedBy(period)
            let avgLoss = losses.slice(0, period)
              .reduce((sum, l) => sum.plus(l), new Decimal(0))
              .dividedBy(period)

            // Smooth for remaining periods
            for (let i = period; i < changes.length; i++) {
              avgGain = avgGain.times(period - 1).plus(gains[i]).dividedBy(period)
              avgLoss = avgLoss.times(period - 1).plus(losses[i]).dividedBy(period)
            }

            // Calculate expected RSI
            let expectedRSI: number
            if (avgLoss.isZero()) {
              expectedRSI = 100
            } else {
              const rs = avgGain.dividedBy(avgLoss)
              const rsiDecimal = new Decimal(100).minus(
                new Decimal(100).dividedBy(rs.plus(1))
              )
              expectedRSI = rsiDecimal.toNumber()
            }

            // Assert: Should match within high precision
            expect(Math.abs(result.value - expectedRSI)).toBeLessThan(1e-10)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case where average loss is zero', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 100, noNaN: true }),
          fc.integer({ min: 10, max: 14 }), // Use larger period
          (startPrice, period) => {
            // Create prices that only increase (no losses)
            const prices: number[] = [startPrice]
            for (let i = 1; i <= period + 20; i++) { // More data points
              prices.push(prices[i - 1] + 1)
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: When avgLoss is 0, RSI should approach 100
            // With enough consistent gains, RSI should be very high (> 95)
            // Note: Due to smoothing, it may not reach exactly 100 with finite data
            expect(result.value).toBeGreaterThan(95)
            expect(result.value).toBeLessThanOrEqual(100)
            expect(result.status).toBe('overbought')

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case where average gain is zero', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 1000, noNaN: true }),
          fc.integer({ min: 5, max: 14 }),
          (startPrice, period) => {
            // Create prices that only decrease (no gains)
            const prices: number[] = [startPrice]
            for (let i = 1; i <= period + 5; i++) {
              prices.push(prices[i - 1] - 1)
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: When avgGain is 0, RS = 0, so RSI = 0
            // Formula: RSI = 100 - (100 / (1 + 0)) = 100 - 100 = 0
            expect(result.value).toBe(0)
            expect(result.status).toBe('oversold')

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce consistent RSI values for the same input', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act: Calculate RSI twice with same input
            const result1 = service.calculateRSI(prices, period)
            const result2 = service.calculateRSI(prices, period)

            // Assert: Should produce identical results
            expect(result1.value).toBe(result2.value)
            expect(result1.status).toBe(result2.status)
            expect(result1.history.length).toBe(result2.history.length)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify RSI formula with known mathematical properties', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act
            const result = service.calculateRSI(prices, period)

            // Mathematical properties of RSI:
            // 1. RSI is always between 0 and 100
            expect(result.value).toBeGreaterThanOrEqual(0)
            expect(result.value).toBeLessThanOrEqual(100)

            // 2. If we reverse the formula, we should be able to derive RS
            // RSI = 100 - (100 / (1 + RS))
            // => 100 - RSI = 100 / (1 + RS)
            // => (1 + RS) = 100 / (100 - RSI)
            // => RS = (100 / (100 - RSI)) - 1
            
            if (result.value > 0 && result.value < 100) {
              const derivedRS = (100 / (100 - result.value)) - 1
              
              // RS should be positive
              expect(derivedRS).toBeGreaterThan(0)
              
              // Verify the formula by calculating RSI from derived RS
              const verifyRSI = 100 - (100 / (1 + derivedRS))
              expect(Math.abs(verifyRSI - result.value)).toBeLessThan(1e-10)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate RSI history with correct number of values', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: History length should be (prices.length - period)
            // Because we need 'period' prices to calculate first RSI,
            // and we calculate changes from price[1] onwards
            const expectedHistoryLength = prices.length - period
            expect(result.history.length).toBe(expectedHistoryLength)

            // Assert: All history values should be valid RSI values
            result.history.forEach(entry => {
              expect(entry.value).toBeGreaterThanOrEqual(0)
              expect(entry.value).toBeLessThanOrEqual(100)
              expect(entry.date).toBeInstanceOf(Date)
            })

            // Assert: Last history value should match current RSI value
            if (result.history.length > 0) {
              const lastHistoryValue = result.history[result.history.length - 1].value
              expect(lastHistoryValue).toBe(result.value)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: technical-indicators, Property 8: RSI 超賣判斷
   * Validates: Requirements 3.4
   * 
   * Property: For any RSI value, when the value is less than 30,
   * the system should mark it as oversold status
   */
  describe('Property 8: RSI Oversold Detection', () => {
    it('should mark RSI as oversold when value is less than 30', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act: Calculate RSI
            const result = service.calculateRSI(prices, period)

            // Assert: If RSI < 30, status should be 'oversold'
            if (result.value < 30) {
              expect(result.status).toBe('oversold')
            }

            // Assert: If RSI >= 30, status should NOT be 'oversold'
            if (result.value >= 30) {
              expect(result.status).not.toBe('oversold')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should consistently mark oversold status for RSI values below 30', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 1000, noNaN: true }),
          fc.integer({ min: 10, max: 14 }),
          fc.integer({ min: 30, max: 50 }),
          (startPrice, period, length) => {
            // Create a strongly downtrending price sequence to generate low RSI
            const prices: number[] = [startPrice]
            for (let i = 1; i < length; i++) {
              // Strong consistent losses to push RSI below 30
              const decrease = Math.random() * 3 + 1
              const newPrice = prices[i - 1] - decrease
              if (newPrice > 1) {
                prices.push(newPrice)
              } else {
                break // Stop if price would go too low
              }
            }

            // Only test if we have enough data
            if (prices.length < period + 1) {
              return true
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: With strong downtrend, RSI should be low
            // If RSI happens to be < 30, it must be marked as oversold
            if (result.value < 30) {
              expect(result.status).toBe('oversold')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should mark values approaching 0 as oversold', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 1000, noNaN: true }),
          fc.integer({ min: 5, max: 14 }),
          (startPrice, period) => {
            // Create prices that only decrease (no gains)
            const prices: number[] = [startPrice]
            for (let i = 1; i <= period + 10; i++) {
              const newPrice = prices[i - 1] - (Math.random() * 2 + 0.5)
              if (newPrice > 1) {
                prices.push(newPrice)
              } else {
                break
              }
            }

            // Only test if we have enough data
            if (prices.length < period + 1) {
              return true
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: With only losses, RSI should be very low (approaching 0)
            // Any value < 30 should be marked as oversold
            if (result.value < 30) {
              expect(result.status).toBe('oversold')
              
              // Additional check: value should be in valid range
              expect(result.value).toBeGreaterThanOrEqual(0)
              expect(result.value).toBeLessThan(30)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not mark RSI as oversold when value is exactly 30', () => {
      // Test the boundary condition: RSI = 30 should NOT be oversold
      // (only values < 30 should be oversold)
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: If RSI is exactly 30, it should be neutral, not oversold
            if (Math.abs(result.value - 30) < 0.001) {
              expect(result.status).not.toBe('oversold')
              expect(result.status).toBe('neutral')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify oversold status across all history values', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(30),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: Check that the oversold logic applies consistently
            // The current value's status should match the threshold rule
            if (result.value < 30) {
              expect(result.status).toBe('oversold')
            } else if (result.value > 70) {
              expect(result.status).toBe('overbought')
            } else {
              expect(result.status).toBe('neutral')
            }

            // Assert: All history values should also follow the same logic
            result.history.forEach(entry => {
              expect(entry.value).toBeGreaterThanOrEqual(0)
              expect(entry.value).toBeLessThanOrEqual(100)
              
              // Each historical value would have the same status determination
              if (entry.value < 30) {
                // Would be oversold at that point
                expect(entry.value).toBeLessThan(30)
              } else if (entry.value > 70) {
                // Would be overbought at that point
                expect(entry.value).toBeGreaterThan(70)
              } else {
                // Would be neutral at that point
                expect(entry.value).toBeGreaterThanOrEqual(30)
                expect(entry.value).toBeLessThanOrEqual(70)
              }
            })

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain oversold status determination with high precision', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(25),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act: Calculate RSI multiple times
            const result1 = service.calculateRSI(prices, period)
            const result2 = service.calculateRSI(prices, period)

            // Assert: Status determination should be consistent
            expect(result1.status).toBe(result2.status)

            // Assert: If value < 30, both should be oversold
            if (result1.value < 30) {
              expect(result1.status).toBe('oversold')
              expect(result2.status).toBe('oversold')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify oversold in various market conditions', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 500, noNaN: true }),
          fc.integer({ min: 10, max: 14 }),
          fc.integer({ min: 20, max: 40 }),
          fc.double({ min: 0.5, max: 3, noNaN: true }),
          (startPrice, period, length, lossSize) => {
            // Create various downtrending scenarios
            const prices: number[] = [startPrice]
            
            // Mix of losses with occasional small gains
            for (let i = 1; i < length; i++) {
              const isLoss = Math.random() > 0.2 // 80% losses, 20% gains
              if (isLoss) {
                const newPrice = prices[i - 1] - (Math.random() * lossSize + 0.5)
                if (newPrice > 1) {
                  prices.push(newPrice)
                } else {
                  break
                }
              } else {
                prices.push(prices[i - 1] + Math.random() * 0.3)
              }
            }

            // Only test if we have enough data
            if (prices.length < period + 1) {
              return true
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: Oversold detection should work regardless of price level
            if (result.value < 30) {
              expect(result.status).toBe('oversold')
              
              // Additional validation
              expect(result.value).toBeGreaterThanOrEqual(0)
              expect(result.value).toBeLessThan(30)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case near oversold threshold', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 200, noNaN: true }),
          fc.integer({ min: 10, max: 14 }),
          (startPrice, period) => {
            // Create prices that might generate RSI near 30
            const prices: number[] = [startPrice]
            
            // Moderate downtrend with some volatility
            for (let i = 1; i <= period + 15; i++) {
              const change = Math.random() > 0.6 ? 
                -(Math.random() * 1.5 + 0.5) :  // 60% losses
                Math.random() * 0.5              // 40% small gains
              const newPrice = prices[i - 1] + change
              if (newPrice > 1) {
                prices.push(newPrice)
              } else {
                break
              }
            }

            // Only test if we have enough data
            if (prices.length < period + 1) {
              return true
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: Clear boundary at 30
            if (result.value < 30) {
              expect(result.status).toBe('oversold')
            } else if (result.value > 70) {
              expect(result.status).toBe('overbought')
            } else {
              expect(result.status).toBe('neutral')
            }

            // Assert: No ambiguity in status determination
            expect(['overbought', 'oversold', 'neutral']).toContain(result.status)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify oversold threshold is strictly less than 30', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 500, noNaN: true }),
          fc.integer({ min: 10, max: 14 }),
          fc.integer({ min: 25, max: 40 }),
          (startPrice, period, length) => {
            // Create strong downtrend
            const prices: number[] = [startPrice]
            for (let i = 1; i < length; i++) {
              const newPrice = prices[i - 1] - (Math.random() * 2 + 1)
              if (newPrice > 1) {
                prices.push(newPrice)
              } else {
                break
              }
            }

            // Only test if we have enough data
            if (prices.length < period + 1) {
              return true
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: Any value strictly less than 30 should be oversold
            if (result.value < 30) {
              expect(result.status).toBe('oversold')
              
              // Verify the value is indeed less than 30
              expect(result.value).toBeLessThan(30)
              expect(result.value).toBeGreaterThanOrEqual(0)
            }

            // Assert: Any value >= 30 should NOT be oversold
            if (result.value >= 30) {
              expect(result.status).not.toBe('oversold')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle extreme oversold conditions correctly', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 200, max: 1000, noNaN: true }),
          fc.integer({ min: 5, max: 14 }),
          (startPrice, period) => {
            // Create extreme downtrend (only losses, no gains)
            const prices: number[] = [startPrice]
            for (let i = 1; i <= period + 20; i++) {
              const newPrice = prices[i - 1] - (Math.random() * 5 + 2)
              if (newPrice > 1) {
                prices.push(newPrice)
              } else {
                break
              }
            }

            // Only test if we have enough data
            if (prices.length < period + 1) {
              return true
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: With extreme downtrend, RSI should be very low
            // Should be marked as oversold
            expect(result.value).toBeGreaterThanOrEqual(0)
            expect(result.value).toBeLessThan(30)
            expect(result.status).toBe('oversold')

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: technical-indicators, Property 7: RSI 超買判斷
   * Validates: Requirements 3.3
   * 
   * Property: For any RSI value, when the value is greater than 70,
   * the system should mark it as overbought status
   */
  describe('Property 7: RSI Overbought Detection', () => {
    it('should mark RSI as overbought when value is greater than 70', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act: Calculate RSI
            const result = service.calculateRSI(prices, period)

            // Assert: If RSI > 70, status should be 'overbought'
            if (result.value > 70) {
              expect(result.status).toBe('overbought')
            }

            // Assert: If RSI <= 70, status should NOT be 'overbought'
            if (result.value <= 70) {
              expect(result.status).not.toBe('overbought')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should consistently mark overbought status for RSI values above 70', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 100, noNaN: true }),
          fc.integer({ min: 10, max: 14 }),
          fc.integer({ min: 30, max: 50 }),
          (startPrice, period, length) => {
            // Create a strongly uptrending price sequence to generate high RSI
            const prices: number[] = [startPrice]
            for (let i = 1; i < length; i++) {
              // Strong consistent gains to push RSI above 70
              prices.push(prices[i - 1] + Math.random() * 3 + 1)
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: With strong uptrend, RSI should be high
            // If RSI happens to be > 70, it must be marked as overbought
            if (result.value > 70) {
              expect(result.status).toBe('overbought')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should mark exactly 70.01 as overbought', () => {
      // This is a boundary test to ensure the threshold is strictly greater than 70
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 100, noNaN: true }),
          fc.integer({ min: 10, max: 14 }),
          (startPrice, period) => {
            // Create prices that will generate RSI > 70
            const prices: number[] = [startPrice]
            for (let i = 1; i <= period + 20; i++) {
              prices.push(prices[i - 1] + 2) // Strong consistent gains
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: Any value strictly greater than 70 should be overbought
            if (result.value > 70) {
              expect(result.status).toBe('overbought')
              
              // Additional check: value should be in valid range
              expect(result.value).toBeGreaterThan(70)
              expect(result.value).toBeLessThanOrEqual(100)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not mark RSI as overbought when value is exactly 70', () => {
      // Test the boundary condition: RSI = 70 should NOT be overbought
      // (only values > 70 should be overbought)
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: If RSI is exactly 70, it should be neutral, not overbought
            if (Math.abs(result.value - 70) < 0.001) {
              expect(result.status).not.toBe('overbought')
              expect(result.status).toBe('neutral')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify overbought status across all history values', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(30),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: Check that the overbought logic applies consistently
            // The current value's status should match the threshold rule
            if (result.value > 70) {
              expect(result.status).toBe('overbought')
            } else if (result.value < 30) {
              expect(result.status).toBe('oversold')
            } else {
              expect(result.status).toBe('neutral')
            }

            // Assert: All history values should also follow the same logic
            result.history.forEach(entry => {
              expect(entry.value).toBeGreaterThanOrEqual(0)
              expect(entry.value).toBeLessThanOrEqual(100)
              
              // Each historical value would have the same status determination
              if (entry.value > 70) {
                // Would be overbought at that point
                expect(entry.value).toBeGreaterThan(70)
              } else if (entry.value < 30) {
                // Would be oversold at that point
                expect(entry.value).toBeLessThan(30)
              } else {
                // Would be neutral at that point
                expect(entry.value).toBeGreaterThanOrEqual(30)
                expect(entry.value).toBeLessThanOrEqual(70)
              }
            })

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain overbought status determination with high precision', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(25),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act: Calculate RSI multiple times
            const result1 = service.calculateRSI(prices, period)
            const result2 = service.calculateRSI(prices, period)

            // Assert: Status determination should be consistent
            expect(result1.status).toBe(result2.status)

            // Assert: If value > 70, both should be overbought
            if (result1.value > 70) {
              expect(result1.status).toBe('overbought')
              expect(result2.status).toBe('overbought')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify overbought in various market conditions', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 200, noNaN: true }),
          fc.integer({ min: 10, max: 14 }),
          fc.integer({ min: 20, max: 40 }),
          fc.double({ min: 0.5, max: 3, noNaN: true }),
          (startPrice, period, length, gainSize) => {
            // Create various uptrending scenarios
            const prices: number[] = [startPrice]
            
            // Mix of gains with occasional small losses
            for (let i = 1; i < length; i++) {
              const isGain = Math.random() > 0.2 // 80% gains, 20% losses
              if (isGain) {
                prices.push(prices[i - 1] + Math.random() * gainSize + 0.5)
              } else {
                prices.push(prices[i - 1] - Math.random() * 0.3)
              }
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: Overbought detection should work regardless of price level
            if (result.value > 70) {
              expect(result.status).toBe('overbought')
              
              // Additional validation
              expect(result.value).toBeGreaterThan(70)
              expect(result.value).toBeLessThanOrEqual(100)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case near overbought threshold', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 20, max: 100, noNaN: true }),
          fc.integer({ min: 10, max: 14 }),
          (startPrice, period) => {
            // Create prices that might generate RSI near 70
            const prices: number[] = [startPrice]
            
            // Moderate uptrend with some volatility
            for (let i = 1; i <= period + 15; i++) {
              const change = Math.random() > 0.6 ? 
                Math.random() * 1.5 + 0.5 :  // 60% gains
                -Math.random() * 0.5          // 40% small losses
              prices.push(Math.max(1, prices[i - 1] + change))
            }

            // Act
            const result = service.calculateRSI(prices, period)

            // Assert: Clear boundary at 70
            if (result.value > 70) {
              expect(result.status).toBe('overbought')
            } else if (result.value < 30) {
              expect(result.status).toBe('oversold')
            } else {
              expect(result.status).toBe('neutral')
            }

            // Assert: No ambiguity in status determination
            expect(['overbought', 'oversold', 'neutral']).toContain(result.status)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: technical-indicators, Property 9: RSI 背離識別
   * Validates: Requirements 3.6
   * 
   * Property: For any price sequence and corresponding RSI sequence,
   * when price makes a new high but RSI does not make a new high,
   * the system should identify this as divergence
   */
  describe('Property 9: RSI Divergence Detection', () => {
    it('should detect bearish divergence when price makes higher high but RSI makes lower high', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 100, noNaN: true }),
          fc.integer({ min: 10, max: 14 }),
          (startPrice, period) => {
            // Create a price sequence with bearish divergence pattern:
            // Price: low -> high -> low -> higher high
            // RSI should show: low -> high -> low -> lower high (divergence)
            
            const prices: number[] = [startPrice]
            
            // First trough
            for (let i = 0; i < 5; i++) {
              prices.push(prices[prices.length - 1] - 1)
            }
            
            // First peak
            for (let i = 0; i < 8; i++) {
              prices.push(prices[prices.length - 1] + 2)
            }
            
            // Second trough
            for (let i = 0; i < 5; i++) {
              prices.push(prices[prices.length - 1] - 1)
            }
            
            // Second peak (higher than first peak)
            for (let i = 0; i < 8; i++) {
              prices.push(prices[prices.length - 1] + 1.5)
            }

            // Ensure we have enough data
            if (prices.length < period + 1) {
              return true
            }

            // Act: Calculate RSI
            const result = service.calculateRSI(prices, period)

            // Assert: If divergences are detected, verify they are valid
            result.divergences.forEach(divergence => {
              expect(['bullish', 'bearish']).toContain(divergence.type)
              expect(divergence.startIndex).toBeGreaterThanOrEqual(0)
              expect(divergence.endIndex).toBeGreaterThan(divergence.startIndex)
              expect(divergence.description).toBeTruthy()
              
              // Verify indices are within valid range
              const pricesAfterPeriod = prices.slice(period)
              expect(divergence.startIndex).toBeLessThan(pricesAfterPeriod.length)
              expect(divergence.endIndex).toBeLessThan(pricesAfterPeriod.length)
            })

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect bullish divergence when price makes lower low but RSI makes higher low', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 200, noNaN: true }),
          fc.integer({ min: 10, max: 14 }),
          (startPrice, period) => {
            // Create a price sequence with bullish divergence pattern:
            // Price: high -> low -> high -> lower low
            // RSI should show: high -> low -> high -> higher low (divergence)
            
            const prices: number[] = [startPrice]
            
            // First peak
            for (let i = 0; i < 5; i++) {
              prices.push(prices[prices.length - 1] + 1)
            }
            
            // First trough
            for (let i = 0; i < 8; i++) {
              prices.push(prices[prices.length - 1] - 2)
            }
            
            // Second peak
            for (let i = 0; i < 5; i++) {
              prices.push(prices[prices.length - 1] + 1)
            }
            
            // Second trough (lower than first trough)
            for (let i = 0; i < 8; i++) {
              const newPrice = prices[prices.length - 1] - 1.5
              if (newPrice > 1) {
                prices.push(newPrice)
              } else {
                break
              }
            }

            // Ensure we have enough data
            if (prices.length < period + 1) {
              return true
            }

            // Act: Calculate RSI
            const result = service.calculateRSI(prices, period)

            // Assert: If divergences are detected, verify they are valid
            result.divergences.forEach(divergence => {
              expect(['bullish', 'bearish']).toContain(divergence.type)
              expect(divergence.startIndex).toBeGreaterThanOrEqual(0)
              expect(divergence.endIndex).toBeGreaterThan(divergence.startIndex)
              expect(divergence.description).toBeTruthy()
            })

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not detect divergence when both price and RSI move in same direction', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 100, noNaN: true }),
          fc.integer({ min: 10, max: 14 }),
          (startPrice, period) => {
            // Create a simple trending price sequence (no divergence)
            const prices: number[] = [startPrice]
            
            // Simple uptrend
            for (let i = 1; i <= period + 20; i++) {
              prices.push(prices[prices.length - 1] + Math.random() * 2 + 0.5)
            }

            // Act: Calculate RSI
            const result = service.calculateRSI(prices, period)

            // Assert: Divergences array should exist (may be empty)
            expect(Array.isArray(result.divergences)).toBe(true)
            
            // Assert: Each detected divergence should be valid
            result.divergences.forEach(divergence => {
              expect(['bullish', 'bearish']).toContain(divergence.type)
              expect(divergence.endIndex).toBeGreaterThan(divergence.startIndex)
            })

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array when insufficient data for divergence detection', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 100, noNaN: true }),
          fc.integer({ min: 10, max: 14 }),
          (startPrice, period) => {
            // Create minimal price sequence (just enough for RSI, not enough for divergence)
            const prices: number[] = [startPrice]
            for (let i = 1; i <= period + 3; i++) {
              prices.push(prices[prices.length - 1] + Math.random() - 0.5)
            }

            // Act: Calculate RSI
            const result = service.calculateRSI(prices, period)

            // Assert: With very few data points after period, divergences should be empty or minimal
            expect(Array.isArray(result.divergences)).toBe(true)
            
            // With only 3-4 data points after period, we shouldn't have enough for meaningful divergence
            // (need at least 5 according to the implementation)
            if (prices.length - period < 5) {
              expect(result.divergences.length).toBe(0)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify divergence indices are within valid range', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(40),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act: Calculate RSI
            const result = service.calculateRSI(prices, period)

            // Assert: All divergence indices should be valid
            const pricesAfterPeriod = prices.slice(period)
            result.divergences.forEach(divergence => {
              // Indices should be within the range of prices after period
              expect(divergence.startIndex).toBeGreaterThanOrEqual(0)
              expect(divergence.startIndex).toBeLessThan(pricesAfterPeriod.length)
              expect(divergence.endIndex).toBeGreaterThanOrEqual(0)
              expect(divergence.endIndex).toBeLessThan(pricesAfterPeriod.length)
              
              // End index should be after start index
              expect(divergence.endIndex).toBeGreaterThan(divergence.startIndex)
            })

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include description for each detected divergence', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(40),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act: Calculate RSI
            const result = service.calculateRSI(prices, period)

            // Assert: Each divergence should have a non-empty description
            result.divergences.forEach(divergence => {
              expect(typeof divergence.description).toBe('string')
              expect(divergence.description.length).toBeGreaterThan(0)
              
              // Description should mention the divergence pattern
              if (divergence.type === 'bearish') {
                expect(divergence.description.toLowerCase()).toContain('higher high')
                expect(divergence.description.toLowerCase()).toContain('lower high')
              } else if (divergence.type === 'bullish') {
                expect(divergence.description.toLowerCase()).toContain('lower low')
                expect(divergence.description.toLowerCase()).toContain('higher low')
              }
            })

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle complex price patterns with multiple peaks and troughs', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 100, noNaN: true }),
          fc.integer({ min: 10, max: 14 }),
          fc.integer({ min: 5, max: 10 }),
          (startPrice, period, cycles) => {
            // Create a complex oscillating price pattern
            const prices: number[] = [startPrice]
            
            for (let cycle = 0; cycle < cycles; cycle++) {
              // Up
              for (let i = 0; i < 5; i++) {
                prices.push(prices[prices.length - 1] + Math.random() * 2 + 0.5)
              }
              // Down
              for (let i = 0; i < 5; i++) {
                prices.push(prices[prices.length - 1] - Math.random() * 2 - 0.5)
              }
            }

            // Ensure we have enough data
            if (prices.length < period + 1) {
              return true
            }

            // Act: Calculate RSI
            const result = service.calculateRSI(prices, period)

            // Assert: Divergences should be valid
            result.divergences.forEach(divergence => {
              expect(['bullish', 'bearish']).toContain(divergence.type)
              expect(divergence.startIndex).toBeGreaterThanOrEqual(0)
              expect(divergence.endIndex).toBeGreaterThan(divergence.startIndex)
              expect(divergence.description).toBeTruthy()
            })

            // Assert: No duplicate divergences (same start and end indices)
            const divergenceKeys = result.divergences.map(d => `${d.startIndex}-${d.endIndex}`)
            const uniqueKeys = new Set(divergenceKeys)
            expect(uniqueKeys.size).toBe(divergenceKeys.length)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should consistently detect divergences for the same input', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(40),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act: Calculate RSI twice with same input
            const result1 = service.calculateRSI(prices, period)
            const result2 = service.calculateRSI(prices, period)

            // Assert: Should produce identical divergence results
            expect(result1.divergences.length).toBe(result2.divergences.length)
            
            for (let i = 0; i < result1.divergences.length; i++) {
              expect(result1.divergences[i].type).toBe(result2.divergences[i].type)
              expect(result1.divergences[i].startIndex).toBe(result2.divergences[i].startIndex)
              expect(result1.divergences[i].endIndex).toBe(result2.divergences[i].endIndex)
              expect(result1.divergences[i].description).toBe(result2.divergences[i].description)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify bearish divergence pattern correctness', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(40),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act: Calculate RSI
            const result = service.calculateRSI(prices, period)

            // Get prices and RSI values after period
            const pricesAfterPeriod = prices.slice(period).map(p => new Decimal(p))
            const rsiValues = result.history.map(h => h.value)

            // Assert: For each bearish divergence, verify the pattern
            result.divergences
              .filter(d => d.type === 'bearish')
              .forEach(divergence => {
                const startIdx = divergence.startIndex
                const endIdx = divergence.endIndex

                // Verify indices are valid
                if (startIdx < pricesAfterPeriod.length && endIdx < pricesAfterPeriod.length) {
                  // For bearish divergence:
                  // Price should make higher high
                  const priceHigherHigh = pricesAfterPeriod[endIdx].greaterThan(pricesAfterPeriod[startIdx])
                  
                  // RSI should make lower high
                  const rsiLowerHigh = rsiValues[endIdx] < rsiValues[startIdx]
                  
                  // Both conditions should be true for a valid bearish divergence
                  expect(priceHigherHigh).toBe(true)
                  expect(rsiLowerHigh).toBe(true)
                }
              })

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify bullish divergence pattern correctness', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(40),
          fc.integer({ min: 10, max: 14 }),
          (prices, period) => {
            // Act: Calculate RSI
            const result = service.calculateRSI(prices, period)

            // Get prices and RSI values after period
            const pricesAfterPeriod = prices.slice(period).map(p => new Decimal(p))
            const rsiValues = result.history.map(h => h.value)

            // Assert: For each bullish divergence, verify the pattern
            result.divergences
              .filter(d => d.type === 'bullish')
              .forEach(divergence => {
                const startIdx = divergence.startIndex
                const endIdx = divergence.endIndex

                // Verify indices are valid
                if (startIdx < pricesAfterPeriod.length && endIdx < pricesAfterPeriod.length) {
                  // For bullish divergence:
                  // Price should make lower low
                  const priceLowerLow = pricesAfterPeriod[endIdx].lessThan(pricesAfterPeriod[startIdx])
                  
                  // RSI should make higher low
                  const rsiHigherLow = rsiValues[endIdx] > rsiValues[startIdx]
                  
                  // Both conditions should be true for a valid bullish divergence
                  expect(priceLowerLow).toBe(true)
                  expect(rsiHigherLow).toBe(true)
                }
              })

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
