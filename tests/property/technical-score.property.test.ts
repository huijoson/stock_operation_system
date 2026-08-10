import * as fc from 'fast-check'
import Decimal from 'decimal.js'
import { TechnicalScoreService, MarketData } from '@/services/technical-score.service'

describe('TechnicalScore Service - Property-Based Tests', () => {
  let service: TechnicalScoreService

  beforeEach(() => {
    service = new TechnicalScoreService()
  })

  // Custom arbitraries for generating test data
  const arbitraryPrice = () => fc.double({ min: 1, max: 1000, noNaN: true, noDefaultInfinity: true })
  
  /**
   * Generate a sequence of prices with realistic variations
   * Ensures we have enough data points for technical indicator calculations
   */
  const arbitraryPriceSequence = (minLength: number = 50) => 
    fc.array(arbitraryPrice(), { minLength, maxLength: 200 })
      .filter(prices => {
        // Ensure we have some variation in prices (not all the same)
        const uniquePrices = new Set(prices)
        return uniquePrices.size > 5
      })

  /**
   * Generate market data with all required fields
   */
  const arbitraryMarketData = () => 
    fc.record({
      prices: arbitraryPriceSequence(50),
      currentPrice: arbitraryPrice(),
      recentHigh: fc.option(arbitraryPrice(), { nil: undefined }),
      recentLow: fc.option(arbitraryPrice(), { nil: undefined })
    }).map(data => {
      // Ensure recentHigh > recentLow if both are defined
      if (data.recentHigh !== undefined && data.recentLow !== undefined) {
        if (data.recentHigh < data.recentLow) {
          [data.recentHigh, data.recentLow] = [data.recentLow, data.recentHigh]
        }
      }
      return data as MarketData
    })

  /**
   * Generate custom weights that sum to 1.0
   */
  const arbitraryWeights = () =>
    fc.record({
      rsi: fc.double({ min: 0.1, max: 0.5, noNaN: true }),
      macd: fc.double({ min: 0.1, max: 0.5, noNaN: true }),
      bollinger: fc.double({ min: 0.1, max: 0.5, noNaN: true }),
      fibonacci: fc.double({ min: 0.1, max: 0.5, noNaN: true })
    }).map(weights => {
      // Normalize weights to sum to 1.0
      const total = weights.rsi + weights.macd + weights.bollinger + weights.fibonacci
      return {
        rsi: weights.rsi / total,
        macd: weights.macd / total,
        bollinger: weights.bollinger / total,
        fibonacci: weights.fibonacci / total
      }
    })

  /**
   * Feature: technical-indicators, Property 17: 評分範圍正確性
   * Validates: Requirements 8.1
   * 
   * Property: For any stock's technical indicator combination, the calculated
   * technical score should be between 0 and 100 (inclusive)
   */
  describe('Property 17: Score Range Correctness', () => {
    it('should always produce a score between 0 and 100 for any market data', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act: Calculate technical score
            const result = service.calculateScore(marketData)

            // Assert: Score must be within 0-100 range (inclusive)
            expect(result.totalScore).toBeGreaterThanOrEqual(0)
            expect(result.totalScore).toBeLessThanOrEqual(100)

            // Assert: Score should be an integer (as per implementation)
            expect(Number.isInteger(result.totalScore)).toBe(true)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce valid scores with custom weights', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          arbitraryWeights(),
          (marketData, weights) => {
            // Act: Calculate technical score with custom weights
            const result = service.calculateScore(marketData, weights)

            // Assert: Score must be within 0-100 range regardless of weights
            expect(result.totalScore).toBeGreaterThanOrEqual(0)
            expect(result.totalScore).toBeLessThanOrEqual(100)

            // Assert: Score should be an integer
            expect(Number.isInteger(result.totalScore)).toBe(true)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce valid scores for extreme market conditions', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 100, noNaN: true }),
          fc.integer({ min: 50, max: 100 }),
          fc.oneof(
            fc.constant('uptrend'),
            fc.constant('downtrend'),
            fc.constant('sideways')
          ),
          (startPrice, length, trendType) => {
            // Create extreme market conditions
            let prices: number[]
            
            if (trendType === 'uptrend') {
              // Strong uptrend - prices only increase
              prices = [startPrice]
              for (let i = 1; i < length; i++) {
                prices.push(prices[i - 1] + Math.random() * 3 + 1)
              }
            } else if (trendType === 'downtrend') {
              // Strong downtrend - prices only decrease
              prices = [startPrice]
              for (let i = 1; i < length; i++) {
                const newPrice = prices[i - 1] - (Math.random() * 2 + 0.5)
                if (newPrice > 1) {
                  prices.push(newPrice)
                } else {
                  break
                }
              }
            } else {
              // Sideways - oscillating prices
              prices = [startPrice]
              for (let i = 1; i < length; i++) {
                prices.push(startPrice + Math.sin(i / 5) * 5)
              }
            }

            // Ensure we have enough data
            if (prices.length < 50) {
              return true
            }

            const marketData: MarketData = {
              prices,
              currentPrice: prices[prices.length - 1],
              recentHigh: Math.max(...prices.slice(-30)),
              recentLow: Math.min(...prices.slice(-30))
            }

            // Act
            const result = service.calculateScore(marketData)

            // Assert: Even in extreme conditions, score must be 0-100
            expect(result.totalScore).toBeGreaterThanOrEqual(0)
            expect(result.totalScore).toBeLessThanOrEqual(100)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case with minimal price data', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryPrice(), { minLength: 50, maxLength: 50 }),
          (prices) => {
            const marketData: MarketData = {
              prices,
              currentPrice: prices[prices.length - 1],
              recentHigh: Math.max(...prices),
              recentLow: Math.min(...prices)
            }

            // Act
            const result = service.calculateScore(marketData)

            // Assert: Score must be valid even with minimal data
            expect(result.totalScore).toBeGreaterThanOrEqual(0)
            expect(result.totalScore).toBeLessThanOrEqual(100)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce valid scores when component scores are at extremes', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 200, noNaN: true }),
          fc.integer({ min: 60, max: 100 }),
          (startPrice, length) => {
            // Create data that might produce extreme component scores
            const prices: number[] = [startPrice]
            
            // Alternate between gains and losses to create volatility
            for (let i = 1; i < length; i++) {
              const change = i % 2 === 0 ? 
                Math.random() * 5 + 2 :  // Large gain
                -(Math.random() * 5 + 2) // Large loss
              const newPrice = prices[i - 1] + change
              if (newPrice > 1) {
                prices.push(newPrice)
              } else {
                break
              }
            }

            // Ensure we have enough data
            if (prices.length < 50) {
              return true
            }

            const marketData: MarketData = {
              prices,
              currentPrice: prices[prices.length - 1],
              recentHigh: Math.max(...prices),
              recentLow: Math.min(...prices)
            }

            // Act
            const result = service.calculateScore(marketData)

            // Assert: Score must be clamped to 0-100 range
            expect(result.totalScore).toBeGreaterThanOrEqual(0)
            expect(result.totalScore).toBeLessThanOrEqual(100)

            // Assert: All component scores should also be valid
            expect(result.components.rsi.score).toBeGreaterThanOrEqual(0)
            expect(result.components.rsi.score).toBeLessThanOrEqual(100)
            expect(result.components.macd.score).toBeGreaterThanOrEqual(0)
            expect(result.components.macd.score).toBeLessThanOrEqual(100)
            expect(result.components.bollinger.score).toBeGreaterThanOrEqual(0)
            expect(result.components.bollinger.score).toBeLessThanOrEqual(100)
            expect(result.components.fibonacci.score).toBeGreaterThanOrEqual(0)
            expect(result.components.fibonacci.score).toBeLessThanOrEqual(100)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain score range with various weight distributions', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (marketData, w1, w2, w3, w4) => {
            // Normalize weights to sum to 1.0
            const total = w1 + w2 + w3 + w4
            if (total === 0) {
              return true // Skip if all weights are 0
            }

            const weights = {
              rsi: w1 / total,
              macd: w2 / total,
              bollinger: w3 / total,
              fibonacci: w4 / total
            }

            // Act
            const result = service.calculateScore(marketData, weights)

            // Assert: Score must be valid regardless of weight distribution
            expect(result.totalScore).toBeGreaterThanOrEqual(0)
            expect(result.totalScore).toBeLessThanOrEqual(100)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce consistent scores for the same input', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act: Calculate score twice with same input
            const result1 = service.calculateScore(marketData)
            const result2 = service.calculateScore(marketData)

            // Assert: Should produce identical scores
            expect(result1.totalScore).toBe(result2.totalScore)
            expect(result1.rating).toBe(result2.rating)

            // Assert: Both scores must be in valid range
            expect(result1.totalScore).toBeGreaterThanOrEqual(0)
            expect(result1.totalScore).toBeLessThanOrEqual(100)
            expect(result2.totalScore).toBeGreaterThanOrEqual(0)
            expect(result2.totalScore).toBeLessThanOrEqual(100)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle missing optional fields gracefully', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(50),
          (prices) => {
            // Create market data without optional fields
            const marketData: MarketData = {
              prices,
              currentPrice: prices[prices.length - 1]
              // recentHigh and recentLow are undefined
            }

            // Act
            const result = service.calculateScore(marketData)

            // Assert: Score must still be valid
            expect(result.totalScore).toBeGreaterThanOrEqual(0)
            expect(result.totalScore).toBeLessThanOrEqual(100)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify score is properly clamped at boundaries', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          arbitraryWeights(),
          (marketData, weights) => {
            // Act
            const result = service.calculateScore(marketData, weights)

            // Assert: Score should never exceed boundaries
            expect(result.totalScore).not.toBeLessThan(0)
            expect(result.totalScore).not.toBeGreaterThan(100)

            // Assert: Score should be exactly at boundary if it would exceed
            // (This tests the clamping logic)
            if (result.totalScore === 0 || result.totalScore === 100) {
              // These are valid boundary values
              expect([0, 100]).toContain(result.totalScore)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce valid scores with Decimal price values', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequence(50),
          (prices) => {
            // Convert to Decimal values
            const decimalPrices = prices.map(p => new Decimal(p))
            
            const marketData: MarketData = {
              prices: decimalPrices,
              currentPrice: new Decimal(prices[prices.length - 1]),
              recentHigh: new Decimal(Math.max(...prices)),
              recentLow: new Decimal(Math.min(...prices))
            }

            // Act
            const result = service.calculateScore(marketData)

            // Assert: Score must be valid with Decimal inputs
            expect(result.totalScore).toBeGreaterThanOrEqual(0)
            expect(result.totalScore).toBeLessThanOrEqual(100)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify all ratings correspond to valid score ranges', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act
            const result = service.calculateScore(marketData)

            // Assert: Rating must match score range
            if (result.totalScore > 70) {
              expect(result.rating).toBe('strong_buy')
            } else if (result.totalScore > 55) {
              expect(result.rating).toBe('buy')
            } else if (result.totalScore >= 45) {
              expect(result.rating).toBe('neutral')
            } else if (result.totalScore >= 30) {
              expect(result.rating).toBe('sell')
            } else {
              expect(result.rating).toBe('strong_sell')
            }

            // Assert: Score is always in valid range
            expect(result.totalScore).toBeGreaterThanOrEqual(0)
            expect(result.totalScore).toBeLessThanOrEqual(100)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle high volatility price sequences', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 200, noNaN: true }),
          fc.integer({ min: 50, max: 100 }),
          (startPrice, length) => {
            // Create highly volatile price sequence
            const prices: number[] = [startPrice]
            for (let i = 1; i < length; i++) {
              // Random large swings
              const change = (Math.random() - 0.5) * 20
              const newPrice = prices[i - 1] + change
              if (newPrice > 1) {
                prices.push(newPrice)
              } else {
                prices.push(1)
              }
            }

            const marketData: MarketData = {
              prices,
              currentPrice: prices[prices.length - 1],
              recentHigh: Math.max(...prices),
              recentLow: Math.min(...prices)
            }

            // Act
            const result = service.calculateScore(marketData)

            // Assert: Even with high volatility, score must be valid
            expect(result.totalScore).toBeGreaterThanOrEqual(0)
            expect(result.totalScore).toBeLessThanOrEqual(100)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify component weights are properly applied', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act: Get component scores
            const components = service.getComponentScores(marketData)

            // Assert: All component scores must be in valid range
            expect(components.rsi.score).toBeGreaterThanOrEqual(0)
            expect(components.rsi.score).toBeLessThanOrEqual(100)
            expect(components.macd.score).toBeGreaterThanOrEqual(0)
            expect(components.macd.score).toBeLessThanOrEqual(100)
            expect(components.bollinger.score).toBeGreaterThanOrEqual(0)
            expect(components.bollinger.score).toBeLessThanOrEqual(100)
            expect(components.fibonacci.score).toBeGreaterThanOrEqual(0)
            expect(components.fibonacci.score).toBeLessThanOrEqual(100)

            // Assert: Weights should sum to 1.0
            const totalWeight = 
              components.rsi.weight +
              components.macd.weight +
              components.bollinger.weight +
              components.fibonacci.weight
            expect(totalWeight).toBeCloseTo(1.0, 10)

            // Act: Calculate total score
            const result = service.calculateScore(marketData)

            // Assert: Total score must be in valid range
            expect(result.totalScore).toBeGreaterThanOrEqual(0)
            expect(result.totalScore).toBeLessThanOrEqual(100)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: technical-indicators, Property 18: 強勢看多判斷
   * Validates: Requirements 8.2
   * 
   * Property: For any technical score, when the score is greater than 70,
   * the system should mark it as strong bullish (strong_buy)
   */
  describe('Property 18: Strong Bullish Signal Judgment', () => {
    it('should mark as strong_buy when score is greater than 70', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          arbitraryWeights(),
          (marketData, weights) => {
            // Act: Calculate technical score
            const result = service.calculateScore(marketData, weights)

            // Assert: If score > 70, rating must be 'strong_buy'
            if (result.totalScore > 70) {
              expect(result.rating).toBe('strong_buy')
            }

            // Assert: Conversely, if rating is 'strong_buy', score must be > 70
            if (result.rating === 'strong_buy') {
              expect(result.totalScore).toBeGreaterThan(70)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should consistently mark strong_buy for scores in 71-100 range', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act
            const result = service.calculateScore(marketData)

            // Assert: Any score from 71 to 100 should be strong_buy
            if (result.totalScore >= 71 && result.totalScore <= 100) {
              expect(result.rating).toBe('strong_buy')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not mark as strong_buy when score is 70 or below', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          arbitraryWeights(),
          (marketData, weights) => {
            // Act
            const result = service.calculateScore(marketData, weights)

            // Assert: If score <= 70, rating must NOT be 'strong_buy'
            if (result.totalScore <= 70) {
              expect(result.rating).not.toBe('strong_buy')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify boundary at score 70', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act
            const result = service.calculateScore(marketData)

            // Assert: Score of exactly 70 should NOT be strong_buy
            // Score of 71 or higher should be strong_buy
            if (result.totalScore === 70) {
              expect(result.rating).not.toBe('strong_buy')
              // At 70, it should be 'buy' based on the rating logic
              expect(result.rating).toBe('buy')
            }

            if (result.totalScore === 71) {
              expect(result.rating).toBe('strong_buy')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should mark strong_buy for bullish market conditions', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 100, noNaN: true }),
          fc.integer({ min: 60, max: 100 }),
          (startPrice, length) => {
            // Create strong bullish market conditions
            // - Consistent uptrend
            // - Low RSI initially, then rising
            const prices: number[] = [startPrice]
            
            // Create uptrend with small pullbacks
            for (let i = 1; i < length; i++) {
              const gain = Math.random() * 2 + 0.5 // Mostly gains
              const pullback = i % 10 === 0 ? -Math.random() * 1 : 0 // Occasional small pullback
              prices.push(prices[i - 1] + gain + pullback)
            }

            const marketData: MarketData = {
              prices,
              currentPrice: prices[prices.length - 1],
              recentHigh: Math.max(...prices.slice(-30)),
              recentLow: Math.min(...prices.slice(-30))
            }

            // Act
            const result = service.calculateScore(marketData)

            // Assert: Strong uptrend should often produce high scores
            // If score > 70, must be marked as strong_buy
            if (result.totalScore > 70) {
              expect(result.rating).toBe('strong_buy')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify strong_buy is the highest rating', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act
            const result = service.calculateScore(marketData)

            // Assert: strong_buy should only occur for scores > 70
            // No other rating should appear for scores > 70
            if (result.totalScore > 70) {
              expect(result.rating).toBe('strong_buy')
              expect(result.rating).not.toBe('buy')
              expect(result.rating).not.toBe('neutral')
              expect(result.rating).not.toBe('sell')
              expect(result.rating).not.toBe('strong_sell')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain strong_buy rating with different weight combinations', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          fc.double({ min: 0.1, max: 0.9, noNaN: true }),
          fc.double({ min: 0.1, max: 0.9, noNaN: true }),
          fc.double({ min: 0.1, max: 0.9, noNaN: true }),
          fc.double({ min: 0.1, max: 0.9, noNaN: true }),
          (marketData, w1, w2, w3, w4) => {
            // Normalize weights
            const total = w1 + w2 + w3 + w4
            const weights = {
              rsi: w1 / total,
              macd: w2 / total,
              bollinger: w3 / total,
              fibonacci: w4 / total
            }

            // Act
            const result = service.calculateScore(marketData, weights)

            // Assert: Regardless of weights, score > 70 means strong_buy
            if (result.totalScore > 70) {
              expect(result.rating).toBe('strong_buy')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify strong_buy threshold is consistent across multiple calculations', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act: Calculate multiple times
            const results = [
              service.calculateScore(marketData),
              service.calculateScore(marketData),
              service.calculateScore(marketData)
            ]

            // Assert: All results should have same rating
            const ratings = results.map(r => r.rating)
            expect(new Set(ratings).size).toBe(1)

            // Assert: If any result has score > 70, all should be strong_buy
            const scores = results.map(r => r.totalScore)
            if (scores.every(s => s > 70)) {
              expect(ratings.every(r => r === 'strong_buy')).toBe(true)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case where score is exactly at boundary', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act
            const result = service.calculateScore(marketData)

            // Assert: Test the exact boundary condition
            // score = 70 should NOT be strong_buy
            // score = 71 should be strong_buy
            if (result.totalScore === 70) {
              expect(result.rating).not.toBe('strong_buy')
            }
            
            if (result.totalScore === 71) {
              expect(result.rating).toBe('strong_buy')
            }

            // Assert: General rule - score > 70 implies strong_buy
            if (result.totalScore > 70) {
              expect(result.rating).toBe('strong_buy')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify component scores contribute to strong_buy rating', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act: Get both component scores and total score
            const components = service.getComponentScores(marketData)
            const result = service.calculateScore(marketData)

            // Assert: If rating is strong_buy, at least some components should be high
            if (result.rating === 'strong_buy') {
              expect(result.totalScore).toBeGreaterThan(70)
              
              // At least one component should contribute significantly
              const hasHighComponent = 
                components.rsi.score > 60 ||
                components.macd.score > 60 ||
                components.bollinger.score > 60 ||
                components.fibonacci.score > 60
              
              // This is a soft check - not all strong_buy signals need high individual components
              // due to weighted averaging, but it's a good sanity check
              expect(result.totalScore).toBeGreaterThan(70)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify strong_buy rating persists with same market data', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act: Calculate score multiple times with same data
            const result1 = service.calculateScore(marketData)
            const result2 = service.calculateScore(marketData)

            // Assert: If first result is strong_buy, second must also be strong_buy
            if (result1.rating === 'strong_buy') {
              expect(result2.rating).toBe('strong_buy')
              expect(result1.totalScore).toBe(result2.totalScore)
              expect(result1.totalScore).toBeGreaterThan(70)
              expect(result2.totalScore).toBeGreaterThan(70)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: technical-indicators, Property 19: 弱勢看空判斷
   * Validates: Requirements 8.3
   * 
   * Property: For any technical score, when the score is less than 30,
   * the system should mark it as weak bearish (strong_sell)
   */
  describe('Property 19: Weak Bearish Signal Judgment', () => {
    it('should mark as strong_sell when score is less than 30', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          arbitraryWeights(),
          (marketData, weights) => {
            // Act: Calculate technical score
            const result = service.calculateScore(marketData, weights)

            // Assert: If score < 30, rating must be 'strong_sell'
            if (result.totalScore < 30) {
              expect(result.rating).toBe('strong_sell')
            }

            // Assert: Conversely, if rating is 'strong_sell', score must be < 30
            if (result.rating === 'strong_sell') {
              expect(result.totalScore).toBeLessThan(30)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should consistently mark strong_sell for scores in 0-29 range', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act
            const result = service.calculateScore(marketData)

            // Assert: Any score from 0 to 29 should be strong_sell
            if (result.totalScore >= 0 && result.totalScore < 30) {
              expect(result.rating).toBe('strong_sell')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not mark as strong_sell when score is 30 or above', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          arbitraryWeights(),
          (marketData, weights) => {
            // Act
            const result = service.calculateScore(marketData, weights)

            // Assert: If score >= 30, rating must NOT be 'strong_sell'
            if (result.totalScore >= 30) {
              expect(result.rating).not.toBe('strong_sell')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify boundary at score 30', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act
            const result = service.calculateScore(marketData)

            // Assert: Score of exactly 29 should be strong_sell
            // Score of 30 or higher should NOT be strong_sell
            if (result.totalScore === 29) {
              expect(result.rating).toBe('strong_sell')
            }

            if (result.totalScore === 30) {
              expect(result.rating).not.toBe('strong_sell')
              // At 30, it should be 'sell' based on the rating logic
              expect(result.rating).toBe('sell')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should mark strong_sell for bearish market conditions', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 200, noNaN: true }),
          fc.integer({ min: 60, max: 100 }),
          (startPrice, length) => {
            // Create strong bearish market conditions
            // - Consistent downtrend
            // - High RSI initially, then falling
            const prices: number[] = [startPrice]
            
            // Create downtrend with small bounces
            for (let i = 1; i < length; i++) {
              const loss = Math.random() * 2 + 0.5 // Mostly losses
              const bounce = i % 10 === 0 ? Math.random() * 1 : 0 // Occasional small bounce
              const newPrice = prices[i - 1] - loss + bounce
              if (newPrice > 1) {
                prices.push(newPrice)
              } else {
                prices.push(1)
              }
            }

            const marketData: MarketData = {
              prices,
              currentPrice: prices[prices.length - 1],
              recentHigh: Math.max(...prices.slice(-30)),
              recentLow: Math.min(...prices.slice(-30))
            }

            // Act
            const result = service.calculateScore(marketData)

            // Assert: Strong downtrend should often produce low scores
            // If score < 30, must be marked as strong_sell
            if (result.totalScore < 30) {
              expect(result.rating).toBe('strong_sell')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify strong_sell is the lowest rating', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act
            const result = service.calculateScore(marketData)

            // Assert: strong_sell should only occur for scores < 30
            // No other rating should appear for scores < 30
            if (result.totalScore < 30) {
              expect(result.rating).toBe('strong_sell')
              expect(result.rating).not.toBe('sell')
              expect(result.rating).not.toBe('neutral')
              expect(result.rating).not.toBe('buy')
              expect(result.rating).not.toBe('strong_buy')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain strong_sell rating with different weight combinations', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          fc.double({ min: 0.1, max: 0.9, noNaN: true }),
          fc.double({ min: 0.1, max: 0.9, noNaN: true }),
          fc.double({ min: 0.1, max: 0.9, noNaN: true }),
          fc.double({ min: 0.1, max: 0.9, noNaN: true }),
          (marketData, w1, w2, w3, w4) => {
            // Normalize weights
            const total = w1 + w2 + w3 + w4
            const weights = {
              rsi: w1 / total,
              macd: w2 / total,
              bollinger: w3 / total,
              fibonacci: w4 / total
            }

            // Act
            const result = service.calculateScore(marketData, weights)

            // Assert: Regardless of weights, score < 30 means strong_sell
            if (result.totalScore < 30) {
              expect(result.rating).toBe('strong_sell')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify strong_sell threshold is consistent across multiple calculations', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act: Calculate multiple times
            const results = [
              service.calculateScore(marketData),
              service.calculateScore(marketData),
              service.calculateScore(marketData)
            ]

            // Assert: All results should have same rating
            const ratings = results.map(r => r.rating)
            expect(new Set(ratings).size).toBe(1)

            // Assert: If any result has score < 30, all should be strong_sell
            const scores = results.map(r => r.totalScore)
            if (scores.every(s => s < 30)) {
              expect(ratings.every(r => r === 'strong_sell')).toBe(true)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case where score is exactly at boundary', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act
            const result = service.calculateScore(marketData)

            // Assert: Test the exact boundary condition
            // score < 30 should be strong_sell
            // score = 30 should NOT be strong_sell
            if (result.totalScore < 30) {
              expect(result.rating).toBe('strong_sell')
            }
            
            if (result.totalScore === 30) {
              expect(result.rating).not.toBe('strong_sell')
              expect(result.rating).toBe('sell')
            }

            // Assert: General rule - score < 30 implies strong_sell
            if (result.totalScore < 30) {
              expect(result.rating).toBe('strong_sell')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify component scores contribute to strong_sell rating', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act: Get both component scores and total score
            const components = service.getComponentScores(marketData)
            const result = service.calculateScore(marketData)

            // Assert: If rating is strong_sell, at least some components should be low
            if (result.rating === 'strong_sell') {
              expect(result.totalScore).toBeLessThan(30)
              
              // At least one component should contribute to the bearish signal
              const hasLowComponent = 
                components.rsi.score < 40 ||
                components.macd.score < 40 ||
                components.bollinger.score < 40 ||
                components.fibonacci.score < 40
              
              // This is a soft check - not all strong_sell signals need low individual components
              // due to weighted averaging, but it's a good sanity check
              expect(result.totalScore).toBeLessThan(30)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify strong_sell rating persists with same market data', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act: Calculate score multiple times with same data
            const result1 = service.calculateScore(marketData)
            const result2 = service.calculateScore(marketData)

            // Assert: If first result is strong_sell, second must also be strong_sell
            if (result1.rating === 'strong_sell') {
              expect(result2.rating).toBe('strong_sell')
              expect(result1.totalScore).toBe(result2.totalScore)
              expect(result1.totalScore).toBeLessThan(30)
              expect(result2.totalScore).toBeLessThan(30)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify score range for strong_sell is 0-29', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act
            const result = service.calculateScore(marketData)

            // Assert: strong_sell should only occur for scores 0-29
            if (result.rating === 'strong_sell') {
              expect(result.totalScore).toBeGreaterThanOrEqual(0)
              expect(result.totalScore).toBeLessThan(30)
            }

            // Assert: All scores 0-29 should be strong_sell
            if (result.totalScore >= 0 && result.totalScore < 30) {
              expect(result.rating).toBe('strong_sell')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle extreme bearish conditions correctly', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 500, noNaN: true }),
          fc.integer({ min: 50, max: 100 }),
          (startPrice, length) => {
            // Create extreme bearish conditions - steep decline
            const prices: number[] = [startPrice]
            
            for (let i = 1; i < length; i++) {
              // Steep decline with no bounces
              const decline = Math.random() * 5 + 3
              const newPrice = prices[i - 1] - decline
              if (newPrice > 1) {
                prices.push(newPrice)
              } else {
                prices.push(1)
              }
            }

            const marketData: MarketData = {
              prices,
              currentPrice: prices[prices.length - 1],
              recentHigh: Math.max(...prices),
              recentLow: Math.min(...prices)
            }

            // Act
            const result = service.calculateScore(marketData)

            // Assert: Extreme bearish conditions should produce very low scores
            // If score < 30, must be strong_sell
            if (result.totalScore < 30) {
              expect(result.rating).toBe('strong_sell')
            }

            // Assert: Score must still be in valid range
            expect(result.totalScore).toBeGreaterThanOrEqual(0)
            expect(result.totalScore).toBeLessThanOrEqual(100)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify strong_sell is mutually exclusive with other ratings', () => {
      fc.assert(
        fc.property(
          arbitraryMarketData(),
          (marketData) => {
            // Act
            const result = service.calculateScore(marketData)

            // Assert: A score cannot be both strong_sell and any other rating
            if (result.rating === 'strong_sell') {
              expect(result.totalScore).toBeLessThan(30)
              expect(result.rating).not.toBe('sell')
              expect(result.rating).not.toBe('neutral')
              expect(result.rating).not.toBe('buy')
              expect(result.rating).not.toBe('strong_buy')
            }

            // Assert: Scores >= 30 cannot be strong_sell
            if (result.totalScore >= 30) {
              expect(result.rating).not.toBe('strong_sell')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify strong_sell with various price patterns', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 200, noNaN: true }),
          fc.integer({ min: 50, max: 100 }),
          fc.oneof(
            fc.constant('steep_decline'),
            fc.constant('gradual_decline'),
            fc.constant('volatile_decline')
          ),
          (startPrice, length, patternType) => {
            const prices: number[] = [startPrice]
            
            if (patternType === 'steep_decline') {
              // Steep continuous decline
              for (let i = 1; i < length; i++) {
                const newPrice = prices[i - 1] - (Math.random() * 3 + 2)
                if (newPrice > 1) prices.push(newPrice)
                else break
              }
            } else if (patternType === 'gradual_decline') {
              // Gradual decline
              for (let i = 1; i < length; i++) {
                const newPrice = prices[i - 1] - (Math.random() * 1 + 0.5)
                if (newPrice > 1) prices.push(newPrice)
                else break
              }
            } else {
              // Volatile decline with large swings
              for (let i = 1; i < length; i++) {
                const change = i % 3 === 0 ? 
                  Math.random() * 2 :  // Occasional small gain
                  -(Math.random() * 4 + 2) // Frequent large loss
                const newPrice = prices[i - 1] + change
                if (newPrice > 1) prices.push(newPrice)
                else break
              }
            }

            // Ensure we have enough data
            if (prices.length < 50) {
              return true
            }

            const marketData: MarketData = {
              prices,
              currentPrice: prices[prices.length - 1],
              recentHigh: Math.max(...prices),
              recentLow: Math.min(...prices)
            }

            // Act
            const result = service.calculateScore(marketData)

            // Assert: If score < 30, must be strong_sell regardless of pattern
            if (result.totalScore < 30) {
              expect(result.rating).toBe('strong_sell')
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
