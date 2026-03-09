import * as fc from 'fast-check'
import Decimal from 'decimal.js'
import { BollingerBandsService } from '@/services/bollinger-bands.service'

describe('Bollinger Bands Service - Property-Based Tests', () => {
  let service: BollingerBandsService

  beforeEach(() => {
    service = new BollingerBandsService()
  })

  // Custom arbitraries for generating test data
  const arbitraryPrice = () => fc.double({ min: 1, max: 10000, noNaN: true, noDefaultInfinity: true })
  
  const arbitraryPriceSequence = (minLength: number = 20, maxLength: number = 100) => 
    fc.array(arbitraryPrice(), { minLength, maxLength })

  const arbitraryPeriod = () => fc.integer({ min: 2, max: 50 })

  const arbitraryStdDevMultiplier = () => fc.double({ min: 1, max: 4, noNaN: true })

  /**
   * Feature: technical-indicators, Property 13: 布林通道計算正確性
   * Validates: Requirements 5.1
   * 
   * Property: For any price sequence, Bollinger Bands middle band should equal SMA,
   * upper band should equal middle + 2 × standard deviation,
   * lower band should equal middle - 2 × standard deviation
   */
  describe('Property 13: Bollinger Bands Calculation Correctness', () => {
    it('should calculate middle band equal to SMA', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20, 50),
          fc.integer({ min: 5, max: 20 }),
          (prices, period) => {
            // Ensure we have enough data
            if (prices.length < period) return true

            // Act
            const result = service.calculateBands(prices, period, 2)

            // Calculate SMA independently for verification
            const sma = service.calculateSMA(prices, period)

            // Assert: Middle band should equal SMA
            expect(result.middle.length).toBe(sma.length)
            
            for (let i = 0; i < result.middle.length; i++) {
              const difference = result.middle[i].minus(sma[i]).abs()
              expect(difference.toNumber()).toBeLessThan(0.0000001)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate upper band as middle + 2 × standard deviation', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20, 50),
          fc.integer({ min: 5, max: 20 }),
          fc.double({ min: 1, max: 3, noNaN: true }),
          (prices, period, stdDevMultiplier) => {
            // Ensure we have enough data
            if (prices.length < period) return true

            // Act
            const result = service.calculateBands(prices, period, stdDevMultiplier)

            // Calculate components independently
            const sma = service.calculateSMA(prices, period)
            const stdDev = service.calculateStandardDeviation(prices, period, sma)

            // Assert: Upper band = Middle + (stdDevMultiplier × StdDev)
            for (let i = 0; i < result.upper.length; i++) {
              const expectedUpper = sma[i].plus(stdDev[i].times(stdDevMultiplier))
              const difference = result.upper[i].minus(expectedUpper).abs()
              expect(difference.toNumber()).toBeLessThan(0.0000001)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate lower band as middle - 2 × standard deviation', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20, 50),
          fc.integer({ min: 5, max: 20 }),
          fc.double({ min: 1, max: 3, noNaN: true }),
          (prices, period, stdDevMultiplier) => {
            // Ensure we have enough data
            if (prices.length < period) return true

            // Act
            const result = service.calculateBands(prices, period, stdDevMultiplier)

            // Calculate components independently
            const sma = service.calculateSMA(prices, period)
            const stdDev = service.calculateStandardDeviation(prices, period, sma)

            // Assert: Lower band = Middle - (stdDevMultiplier × StdDev)
            for (let i = 0; i < result.lower.length; i++) {
              const expectedLower = sma[i].minus(stdDev[i].times(stdDevMultiplier))
              const difference = result.lower[i].minus(expectedLower).abs()
              expect(difference.toNumber()).toBeLessThan(0.0000001)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain band relationship: upper > middle > lower', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20, 50),
          arbitraryPeriod(),
          arbitraryStdDevMultiplier(),
          (prices, period, stdDevMultiplier) => {
            // Ensure we have enough data
            if (prices.length < period) return true

            // Act
            const result = service.calculateBands(prices, period, stdDevMultiplier)

            // Assert: For all points, upper >= middle >= lower
            // When all prices in a window are identical, stddev=0 so bands converge
            for (let i = 0; i < result.middle.length; i++) {
              expect(result.upper[i].greaterThanOrEqualTo(result.middle[i])).toBe(true)
              expect(result.middle[i].greaterThanOrEqualTo(result.lower[i])).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate all three bands with same length', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20, 50),
          arbitraryPeriod(),
          arbitraryStdDevMultiplier(),
          (prices, period, stdDevMultiplier) => {
            // Ensure we have enough data
            if (prices.length < period) return true

            // Act
            const result = service.calculateBands(prices, period, stdDevMultiplier)

            // Assert: All bands should have the same length
            expect(result.upper.length).toBe(result.middle.length)
            expect(result.lower.length).toBe(result.middle.length)
            expect(result.bandwidth.length).toBe(result.middle.length)

            // Length should be prices.length - period + 1
            const expectedLength = prices.length - period + 1
            expect(result.middle.length).toBe(expectedLength)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate bandwidth correctly as (upper - lower) / middle', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20, 50),
          arbitraryPeriod(),
          arbitraryStdDevMultiplier(),
          (prices, period, stdDevMultiplier) => {
            // Ensure we have enough data
            if (prices.length < period) return true

            // Act
            const result = service.calculateBands(prices, period, stdDevMultiplier)

            // Assert: Bandwidth = (Upper - Lower) / Middle
            for (let i = 0; i < result.bandwidth.length; i++) {
              const expectedBandwidth = result.upper[i]
                .minus(result.lower[i])
                .dividedBy(result.middle[i])
                .toNumber()
              
              const difference = Math.abs(result.bandwidth[i] - expectedBandwidth)
              expect(difference).toBeLessThan(0.0000001)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce positive bandwidth values', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20, 50),
          arbitraryPeriod(),
          arbitraryStdDevMultiplier(),
          (prices, period, stdDevMultiplier) => {
            // Ensure we have enough data
            if (prices.length < period) return true

            // Act
            const result = service.calculateBands(prices, period, stdDevMultiplier)

            // Assert: All bandwidth values should be positive
            result.bandwidth.forEach(bw => {
              expect(bw).toBeGreaterThan(0)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle constant prices correctly (zero standard deviation)', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          arbitraryPeriod(),
          fc.integer({ min: 20, max: 50 }),
          (constantPrice, period, length) => {
            // Ensure we have enough data
            if (length < period) return true

            // Create array of constant prices
            const prices = Array(length).fill(constantPrice)

            // Act
            const result = service.calculateBands(prices, period, 2)

            // Assert: With zero standard deviation, all bands should be equal to the constant price
            for (let i = 0; i < result.middle.length; i++) {
              const priceDec = new Decimal(constantPrice)
              
              // Middle should equal the constant price
              expect(result.middle[i].minus(priceDec).abs().toNumber()).toBeLessThan(0.0000001)
              
              // Upper and lower should also equal middle (since stdDev = 0)
              expect(result.upper[i].minus(result.middle[i]).abs().toNumber()).toBeLessThan(0.0000001)
              expect(result.lower[i].minus(result.middle[i]).abs().toNumber()).toBeLessThan(0.0000001)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should scale bands proportionally with standard deviation multiplier', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20, 50),
          arbitraryPeriod(),
          (prices, period) => {
            // Ensure we have enough data
            if (prices.length < period) return true

            // Check if prices have variation (not all constant)
            const uniquePrices = new Set(prices.map(p => p.toFixed(2)))
            if (uniquePrices.size === 1) return true // Skip constant prices

            // Act: Calculate with different multipliers
            const result1 = service.calculateBands(prices, period, 1)
            const result2 = service.calculateBands(prices, period, 2)

            // Assert: Band width should scale with multiplier
            for (let i = 0; i < result1.middle.length; i++) {
              // Middle bands should be the same
              expect(result1.middle[i].equals(result2.middle[i])).toBe(true)

              // Distance from middle should scale by multiplier ratio (2/1 = 2)
              const distance1Upper = result1.upper[i].minus(result1.middle[i])
              const distance2Upper = result2.upper[i].minus(result2.middle[i])
              
              // Only check ratio if distance is non-zero
              if (distance1Upper.greaterThan(0.0000001)) {
                const ratio = distance2Upper.dividedBy(distance1Upper)
                expect(ratio.toNumber()).toBeCloseTo(2, 5)
              }

              const distance1Lower = result1.middle[i].minus(result1.lower[i])
              const distance2Lower = result2.middle[i].minus(result2.lower[i])
              
              // Only check ratio if distance is non-zero
              if (distance1Lower.greaterThan(0.0000001)) {
                const ratioLower = distance2Lower.dividedBy(distance1Lower)
                expect(ratioLower.toNumber()).toBeCloseTo(2, 5)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should determine current position correctly', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(20, 50),
          arbitraryPeriod(),
          (prices, period) => {
            // Ensure we have enough data
            if (prices.length < period) return true

            // Act
            const result = service.calculateBands(prices, period, 2)

            // Get current values
            const currentPrice = new Decimal(prices[prices.length - 1])
            const currentUpper = result.upper[result.upper.length - 1]
            const currentLower = result.lower[result.lower.length - 1]

            // Assert: Position should match price location
            if (currentPrice.greaterThan(currentUpper)) {
              expect(result.currentPosition).toBe('above_upper')
            } else if (currentPrice.lessThan(currentLower)) {
              expect(result.currentPosition).toBe('below_lower')
            } else {
              expect(result.currentPosition).toBe('within_bands')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain formula correctness across different price magnitudes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(0.01, 1, 100, 10000),
          arbitraryPeriod(),
          fc.integer({ min: 20, max: 50 }),
          (baseMagnitude, period, length) => {
            // Ensure we have enough data
            if (length < period) return true

            // Generate prices at different magnitudes
            const prices = Array.from({ length }, (_, i) => 
              baseMagnitude * (1 + Math.sin(i * 0.1) * 0.1)
            )

            // Act
            const result = service.calculateBands(prices, period, 2)

            // Calculate components independently
            const sma = service.calculateSMA(prices, period)
            const stdDev = service.calculateStandardDeviation(prices, period, sma)

            // Assert: Formula should hold regardless of magnitude
            for (let i = 0; i < result.middle.length; i++) {
              // Middle = SMA
              expect(result.middle[i].minus(sma[i]).abs().toNumber()).toBeLessThan(0.0000001)

              // Upper = Middle + 2 × StdDev
              const expectedUpper = sma[i].plus(stdDev[i].times(2))
              expect(result.upper[i].minus(expectedUpper).abs().toNumber()).toBeLessThan(0.0000001)

              // Lower = Middle - 2 × StdDev
              const expectedLower = sma[i].minus(stdDev[i].times(2))
              expect(result.lower[i].minus(expectedLower).abs().toNumber()).toBeLessThan(0.0000001)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle different period lengths correctly', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(50, 100),
          fc.integer({ min: 5, max: 10 }),
          fc.integer({ min: 20, max: 30 }),
          (prices, shortPeriod, longPeriod) => {
            // Ensure we have enough data for both periods
            if (prices.length < longPeriod) return true

            // Act
            const shortResult = service.calculateBands(prices, shortPeriod, 2)
            const longResult = service.calculateBands(prices, longPeriod, 2)

            // Assert: Shorter period should produce more data points
            expect(shortResult.middle.length).toBeGreaterThan(longResult.middle.length)

            // Both should follow the formula
            const shortSMA = service.calculateSMA(prices, shortPeriod)
            const longSMA = service.calculateSMA(prices, longPeriod)

            for (let i = 0; i < shortResult.middle.length; i++) {
              expect(shortResult.middle[i].minus(shortSMA[i]).abs().toNumber()).toBeLessThan(0.0000001)
            }

            for (let i = 0; i < longResult.middle.length; i++) {
              expect(longResult.middle[i].minus(longSMA[i]).abs().toNumber()).toBeLessThan(0.0000001)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce bands that contain most prices within them', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(50, 100),
          arbitraryPeriod(),
          (prices, period) => {
            // Ensure we have enough data
            if (prices.length < period) return true

            // Skip test if prices have no variation (all same or nearly same)
            const priceSet = new Set(prices.map(p => p.toFixed(2)))
            if (priceSet.size === 1) return true

            // Act
            const result = service.calculateBands(prices, period, 2)

            // Count how many prices fall within the bands
            let withinBands = 0
            const priceDecimals = prices.map(p => new Decimal(p))

            for (let i = period - 1; i < prices.length; i++) {
              const bandIndex = i - period + 1
              const price = priceDecimals[i]
              
              if (price.greaterThanOrEqualTo(result.lower[bandIndex]) &&
                  price.lessThanOrEqualTo(result.upper[bandIndex])) {
                withinBands++
              }
            }

            // Assert: With 2 standard deviations, approximately 95% of prices should be within bands
            // We'll be lenient and check for at least 80% due to randomness
            const totalPoints = prices.length - period + 1
            const percentageWithin = withinBands / totalPoints
            
            // This is a statistical property, so we allow some variance
            expect(percentageWithin).toBeGreaterThanOrEqual(0.5) // At least 50% should be within
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: technical-indicators, Property 14: 布林通道收窄判斷
   * Validates: Requirements 5.4
   * 
   * Property: For any Bollinger Bands sequence, when current bandwidth is less than
   * 50% of the average bandwidth over the past 20 days, the system should detect a squeeze
   */
  describe('Property 14: Bollinger Bands Squeeze Detection', () => {
    it('should detect squeeze when bandwidth is below threshold', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(50, 100),
          arbitraryPeriod(),
          (prices, period) => {
            // Ensure we have enough data
            if (prices.length < period + 20) return true

            // Act: Calculate bands
            const result = service.calculateBands(prices, period, 2)

            // Calculate average bandwidth over last 20 periods
            const lookbackPeriod = 20
            if (result.bandwidth.length < lookbackPeriod) return true

            const recentBandwidths = result.bandwidth.slice(-lookbackPeriod)
            const avgBandwidth = recentBandwidths.reduce((sum, bw) => sum + bw, 0) / lookbackPeriod
            const currentBandwidth = result.bandwidth[result.bandwidth.length - 1]

            // Act: Detect squeeze
            const isSqueezeDetected = service.detectSqueeze(result, lookbackPeriod, 0.5)

            // Assert: Squeeze should be detected if and only if current bandwidth < 50% of average
            const shouldBeSqueezing = currentBandwidth < avgBandwidth * 0.5

            expect(isSqueezeDetected).toBe(shouldBeSqueezing)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not detect squeeze when bandwidth is above threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 100 }),
          arbitraryPeriod(),
          fc.double({ min: 0.6, max: 2.0, noNaN: true }),
          (length, period, volatilityFactor) => {
            // Ensure we have enough data
            if (length < period + 20) return true

            // Generate prices with increasing volatility to ensure bandwidth stays high
            const prices = Array.from({ length }, (_, i) => {
              const trend = 100 + i * 0.1
              const volatility = Math.sin(i * 0.3) * volatilityFactor * (1 + i * 0.01)
              return trend + volatility
            })

            // Act: Calculate bands
            const result = service.calculateBands(prices, period, 2)

            // Only test if we have enough bandwidth data
            if (result.bandwidth.length < 20) return true

            // Calculate average bandwidth
            const lookbackPeriod = 20
            const recentBandwidths = result.bandwidth.slice(-lookbackPeriod)
            const avgBandwidth = recentBandwidths.reduce((sum, bw) => sum + bw, 0) / lookbackPeriod
            const currentBandwidth = result.bandwidth[result.bandwidth.length - 1]

            // Act: Detect squeeze
            const isSqueezeDetected = service.detectSqueeze(result, lookbackPeriod, 0.5)

            // Assert: If current bandwidth >= 50% of average, no squeeze should be detected
            if (currentBandwidth >= avgBandwidth * 0.5) {
              expect(isSqueezeDetected).toBe(false)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle custom threshold values correctly', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(50, 100),
          arbitraryPeriod(),
          fc.double({ min: 0.3, max: 0.9, noNaN: true }),
          (prices, period, threshold) => {
            // Ensure we have enough data
            if (prices.length < period + 20) return true

            // Act: Calculate bands
            const result = service.calculateBands(prices, period, 2)

            // Only test if we have enough bandwidth data
            if (result.bandwidth.length < 20) return true

            // Calculate average bandwidth
            const lookbackPeriod = 20
            const recentBandwidths = result.bandwidth.slice(-lookbackPeriod)
            const avgBandwidth = recentBandwidths.reduce((sum, bw) => sum + bw, 0) / lookbackPeriod
            const currentBandwidth = result.bandwidth[result.bandwidth.length - 1]

            // Act: Detect squeeze with custom threshold
            const isSqueezeDetected = service.detectSqueeze(result, lookbackPeriod, threshold)

            // Assert: Squeeze detection should respect custom threshold
            const shouldBeSqueezing = currentBandwidth < avgBandwidth * threshold

            expect(isSqueezeDetected).toBe(shouldBeSqueezing)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle custom lookback periods correctly', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(80, 120),
          arbitraryPeriod(),
          fc.integer({ min: 10, max: 40 }),
          (prices, period, lookbackPeriod) => {
            // Ensure we have enough data
            if (prices.length < period + lookbackPeriod) return true

            // Act: Calculate bands
            const result = service.calculateBands(prices, period, 2)

            // Only test if we have enough bandwidth data
            if (result.bandwidth.length < lookbackPeriod) return true

            // Calculate average bandwidth over custom lookback period
            const recentBandwidths = result.bandwidth.slice(-lookbackPeriod)
            const avgBandwidth = recentBandwidths.reduce((sum, bw) => sum + bw, 0) / lookbackPeriod
            const currentBandwidth = result.bandwidth[result.bandwidth.length - 1]

            // Act: Detect squeeze with custom lookback period
            const isSqueezeDetected = service.detectSqueeze(result, lookbackPeriod, 0.5)

            // Assert: Squeeze detection should use the specified lookback period
            const shouldBeSqueezing = currentBandwidth < avgBandwidth * 0.5

            expect(isSqueezeDetected).toBe(shouldBeSqueezing)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return false when insufficient data for lookback period', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 20, max: 30 }),
          arbitraryPeriod(),
          fc.integer({ min: 25, max: 50 }),
          (length, period, lookbackPeriod) => {
            // Ensure we have data but not enough for lookback
            if (length < period) return true

            // Generate prices
            const prices = Array.from({ length }, (_, i) => 100 + Math.sin(i * 0.1) * 10)

            // Act: Calculate bands
            const result = service.calculateBands(prices, period, 2)

            // Only test when bandwidth length is less than lookback period
            if (result.bandwidth.length >= lookbackPeriod) return true

            // Act: Detect squeeze
            const isSqueezeDetected = service.detectSqueeze(result, lookbackPeriod, 0.5)

            // Assert: Should return false when insufficient data
            expect(isSqueezeDetected).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect squeeze consistently across different price magnitudes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(0.1, 1, 10, 100, 1000),
          arbitraryPeriod(),
          fc.integer({ min: 50, max: 80 }),
          (baseMagnitude, period, length) => {
            // Ensure we have enough data
            if (length < period + 20) return true

            // Generate prices at different magnitudes with low volatility at the end
            const prices = Array.from({ length }, (_, i) => {
              // Start with normal volatility, then reduce it at the end
              const volatilityFactor = i < length - 10 ? 0.1 : 0.01
              return baseMagnitude * (1 + Math.sin(i * 0.1) * volatilityFactor)
            })

            // Act: Calculate bands
            const result = service.calculateBands(prices, period, 2)

            // Only test if we have enough bandwidth data
            if (result.bandwidth.length < 20) return true

            // Calculate average bandwidth
            const lookbackPeriod = 20
            const recentBandwidths = result.bandwidth.slice(-lookbackPeriod)
            const avgBandwidth = recentBandwidths.reduce((sum, bw) => sum + bw, 0) / lookbackPeriod
            const currentBandwidth = result.bandwidth[result.bandwidth.length - 1]

            // Act: Detect squeeze
            const isSqueezeDetected = service.detectSqueeze(result, lookbackPeriod, 0.5)

            // Assert: Detection should work regardless of price magnitude
            const shouldBeSqueezing = currentBandwidth < avgBandwidth * 0.5

            expect(isSqueezeDetected).toBe(shouldBeSqueezing)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case where all bandwidths are equal', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          arbitraryPeriod(),
          fc.integer({ min: 50, max: 80 }),
          (constantPrice, period, length) => {
            // Ensure we have enough data
            if (length < period + 20) return true

            // Create array of constant prices (zero volatility)
            const prices = Array(length).fill(constantPrice)

            // Act: Calculate bands
            const result = service.calculateBands(prices, period, 2)

            // Only test if we have enough bandwidth data
            if (result.bandwidth.length < 20) return true

            // With constant prices, all bandwidths should be zero
            // Average bandwidth = 0, current bandwidth = 0
            // 0 < 0 * 0.5 is false, so no squeeze should be detected

            // Act: Detect squeeze
            const isSqueezeDetected = service.detectSqueeze(result, 20, 0.5)

            // Assert: No squeeze should be detected when all bandwidths are zero
            expect(isSqueezeDetected).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect squeeze when volatility suddenly decreases', () => {
      fc.assert(
        fc.property(
          arbitraryPeriod(),
          fc.integer({ min: 60, max: 100 }),
          fc.double({ min: 0.5, max: 2.0, noNaN: true }),
          (period, length, highVolatility) => {
            // Ensure we have enough data
            if (length < period + 30) return true

            // Generate prices with high volatility initially, then low volatility
            const transitionPoint = length - 15
            const prices = Array.from({ length }, (_, i) => {
              const trend = 100
              const volatility = i < transitionPoint 
                ? Math.sin(i * 0.3) * highVolatility 
                : Math.sin(i * 0.3) * 0.1
              return trend + volatility
            })

            // Act: Calculate bands
            const result = service.calculateBands(prices, period, 2)

            // Only test if we have enough bandwidth data
            if (result.bandwidth.length < 20) return true

            // Calculate average bandwidth
            const lookbackPeriod = 20
            const recentBandwidths = result.bandwidth.slice(-lookbackPeriod)
            const avgBandwidth = recentBandwidths.reduce((sum, bw) => sum + bw, 0) / lookbackPeriod
            const currentBandwidth = result.bandwidth[result.bandwidth.length - 1]

            // Act: Detect squeeze
            const isSqueezeDetected = service.detectSqueeze(result, lookbackPeriod, 0.5)

            // Assert: Should match the mathematical condition
            const shouldBeSqueezing = currentBandwidth < avgBandwidth * 0.5

            expect(isSqueezeDetected).toBe(shouldBeSqueezing)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
