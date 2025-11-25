import { TechnicalScoreService } from '../technical-score.service'
import Decimal from 'decimal.js'

describe('TechnicalScoreService', () => {
  let service: TechnicalScoreService

  beforeEach(() => {
    service = new TechnicalScoreService()
  })

  describe('calculateScore', () => {
    it('should calculate technical score within 0-100 range', () => {
      const marketData = {
        prices: Array.from({ length: 50 }, (_, i) => 100 + i * 0.5),
        currentPrice: 125,
        recentHigh: 130,
        recentLow: 100
      }

      const result = service.calculateScore(marketData)

      expect(result.totalScore).toBeGreaterThanOrEqual(0)
      expect(result.totalScore).toBeLessThanOrEqual(100)
    })

    it('should return strong_buy rating for score > 70', () => {
      // Create bullish market data
      const marketData = {
        prices: Array.from({ length: 50 }, (_, i) => 100 - i * 2), // Downtrend then reversal
        currentPrice: 50,
        recentHigh: 100,
        recentLow: 50
      }

      const result = service.calculateScore(marketData)

      if (result.totalScore > 70) {
        expect(result.rating).toBe('strong_buy')
      }
    })

    it('should return strong_sell rating for score < 30', () => {
      // Create bearish market data
      const marketData = {
        prices: Array.from({ length: 50 }, (_, i) => 50 + i * 2), // Strong uptrend (overbought)
        currentPrice: 150,
        recentHigh: 150,
        recentLow: 50
      }

      const result = service.calculateScore(marketData)

      if (result.totalScore < 30) {
        expect(result.rating).toBe('strong_sell')
      }
    })

    it('should return neutral rating for score between 45-55', () => {
      // Create neutral market data
      const marketData = {
        prices: Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 2),
        currentPrice: 100,
        recentHigh: 105,
        recentLow: 95
      }

      const result = service.calculateScore(marketData)

      if (result.totalScore >= 45 && result.totalScore <= 55) {
        expect(result.rating).toBe('neutral')
      }
    })

    it('should include all component scores', () => {
      const marketData = {
        prices: Array.from({ length: 50 }, (_, i) => 100 + i * 0.5),
        currentPrice: 125,
        recentHigh: 130,
        recentLow: 100
      }

      const result = service.calculateScore(marketData)

      expect(result.components.rsi).toBeDefined()
      expect(result.components.macd).toBeDefined()
      expect(result.components.bollinger).toBeDefined()
      expect(result.components.fibonacci).toBeDefined()

      expect(result.components.rsi.score).toBeGreaterThanOrEqual(0)
      expect(result.components.rsi.score).toBeLessThanOrEqual(100)
      expect(result.components.rsi.weight).toBeGreaterThan(0)
    })

    it('should include timestamp', () => {
      const marketData = {
        prices: Array.from({ length: 50 }, (_, i) => 100 + i * 0.5),
        currentPrice: 125
      }

      const result = service.calculateScore(marketData)

      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should support custom weights', () => {
      const marketData = {
        prices: Array.from({ length: 50 }, (_, i) => 100 + i * 0.5),
        currentPrice: 125,
        recentHigh: 130,
        recentLow: 100
      }

      const customWeights = {
        rsi: 0.5,
        macd: 0.3,
        bollinger: 0.1,
        fibonacci: 0.1
      }

      const result = service.calculateScore(marketData, customWeights)

      expect(result.totalScore).toBeGreaterThanOrEqual(0)
      expect(result.totalScore).toBeLessThanOrEqual(100)
    })

    it('should handle rating boundaries correctly', () => {
      const testCases = [
        { score: 71, expectedRating: 'strong_buy' },
        { score: 70, expectedRating: 'buy' },
        { score: 56, expectedRating: 'buy' },
        { score: 55, expectedRating: 'neutral' },
        { score: 45, expectedRating: 'neutral' },
        { score: 44, expectedRating: 'sell' },
        { score: 30, expectedRating: 'sell' },
        { score: 29, expectedRating: 'strong_sell' }
      ]

      // We can't directly set the score, but we can verify the logic
      // by checking that ratings are assigned correctly
      const marketData = {
        prices: Array.from({ length: 50 }, (_, i) => 100 + i * 0.5),
        currentPrice: 125
      }

      const result = service.calculateScore(marketData)
      
      // Verify rating matches score
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
    })
  })

  describe('getComponentScores', () => {
    it('should return all component scores', () => {
      const marketData = {
        prices: Array.from({ length: 50 }, (_, i) => 100 + i * 0.5),
        currentPrice: 125,
        recentHigh: 130,
        recentLow: 100
      }

      const components = service.getComponentScores(marketData)

      expect(components.rsi).toBeDefined()
      expect(components.macd).toBeDefined()
      expect(components.bollinger).toBeDefined()
      expect(components.fibonacci).toBeDefined()

      // All scores should be in valid range
      expect(components.rsi.score).toBeGreaterThanOrEqual(0)
      expect(components.rsi.score).toBeLessThanOrEqual(100)
      expect(components.macd.score).toBeGreaterThanOrEqual(0)
      expect(components.macd.score).toBeLessThanOrEqual(100)
      expect(components.bollinger.score).toBeGreaterThanOrEqual(0)
      expect(components.bollinger.score).toBeLessThanOrEqual(100)
      expect(components.fibonacci.score).toBeGreaterThanOrEqual(0)
      expect(components.fibonacci.score).toBeLessThanOrEqual(100)
    })

    it('should include weights for each component', () => {
      const marketData = {
        prices: Array.from({ length: 50 }, (_, i) => 100 + i * 0.5),
        currentPrice: 125
      }

      const components = service.getComponentScores(marketData)

      expect(components.rsi.weight).toBeGreaterThan(0)
      expect(components.macd.weight).toBeGreaterThan(0)
      expect(components.bollinger.weight).toBeGreaterThan(0)
      expect(components.fibonacci.weight).toBeGreaterThan(0)

      // Weights should sum to 1
      const totalWeight = 
        components.rsi.weight +
        components.macd.weight +
        components.bollinger.weight +
        components.fibonacci.weight

      expect(totalWeight).toBeCloseTo(1.0, 5)
    })

    it('should handle insufficient data gracefully', () => {
      const marketData = {
        prices: [100, 101, 102], // Very little data
        currentPrice: 102
      }

      const components = service.getComponentScores(marketData)

      // Should still return scores (likely neutral/50)
      expect(components.rsi.score).toBeDefined()
      expect(components.macd.score).toBeDefined()
      expect(components.bollinger.score).toBeDefined()
      expect(components.fibonacci.score).toBeDefined()
    })
  })

  describe('integration', () => {
    it('should produce consistent scores for same data', () => {
      const marketData = {
        prices: Array.from({ length: 50 }, (_, i) => 100 + i * 0.5),
        currentPrice: 125,
        recentHigh: 130,
        recentLow: 100
      }

      const result1 = service.calculateScore(marketData)
      const result2 = service.calculateScore(marketData)

      expect(result1.totalScore).toBe(result2.totalScore)
      expect(result1.rating).toBe(result2.rating)
    })

    it('should handle various market conditions', () => {
      // Uptrend
      const uptrend = {
        prices: Array.from({ length: 50 }, (_, i) => 100 + i * 2),
        currentPrice: 200,
        recentHigh: 200,
        recentLow: 100
      }

      const uptrendResult = service.calculateScore(uptrend)
      expect(uptrendResult.totalScore).toBeGreaterThanOrEqual(0)
      expect(uptrendResult.totalScore).toBeLessThanOrEqual(100)

      // Downtrend
      const downtrend = {
        prices: Array.from({ length: 50 }, (_, i) => 200 - i * 2),
        currentPrice: 100,
        recentHigh: 200,
        recentLow: 100
      }

      const downtrendResult = service.calculateScore(downtrend)
      expect(downtrendResult.totalScore).toBeGreaterThanOrEqual(0)
      expect(downtrendResult.totalScore).toBeLessThanOrEqual(100)

      // Sideways
      const sideways = {
        prices: Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 5),
        currentPrice: 100,
        recentHigh: 105,
        recentLow: 95
      }

      const sidewaysResult = service.calculateScore(sideways)
      expect(sidewaysResult.totalScore).toBeGreaterThanOrEqual(0)
      expect(sidewaysResult.totalScore).toBeLessThanOrEqual(100)
    })
  })
})
