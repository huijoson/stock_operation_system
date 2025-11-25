import { IndicatorOptimizationService } from '../indicator-optimization.service'
import Decimal from 'decimal.js'

describe('IndicatorOptimizationService', () => {
  let service: IndicatorOptimizationService

  beforeEach(() => {
    service = new IndicatorOptimizationService()
  })

  describe('Parallel Calculation', () => {
    it('should calculate multiple indicators in parallel', async () => {
      const prices = {
        closes: Array.from({ length: 50 }, (_, i) => new Decimal(100 + i)),
        highs: Array.from({ length: 50 }, (_, i) => new Decimal(105 + i)),
        lows: Array.from({ length: 50 }, (_, i) => new Decimal(95 + i))
      }

      const results = await service.calculateParallel(
        'TEST',
        prices,
        ['RSI', 'MACD', 'ATR']
      )

      expect(results).toHaveProperty('RSI')
      expect(results).toHaveProperty('MACD')
      expect(results).toHaveProperty('ATR')
      expect(results.RSI).toBeDefined()
      expect(results.MACD).toBeDefined()
      expect(results.ATR).toBeDefined()
    })

    it('should handle errors gracefully for individual indicators', async () => {
      const prices = {
        closes: Array.from({ length: 5 }, (_, i) => new Decimal(100 + i)) // Too few data points
      }

      const results = await service.calculateParallel(
        'TEST',
        prices,
        ['RSI', 'MACD']
      )

      // Should still return results object even if calculations fail
      expect(results).toBeDefined()
    })
  })

  describe('Data Preprocessing', () => {
    it('should preprocess data and cache results', () => {
      const prices = Array.from({ length: 50 }, (_, i) => new Decimal(100 + i))

      const preprocessed = service.preprocessData('TEST', prices)

      expect(preprocessed.sma).toBeDefined()
      expect(preprocessed.ema).toBeDefined()
      expect(preprocessed.stdDev).toBeDefined()
      expect(preprocessed.sma.size).toBeGreaterThan(0)
      expect(preprocessed.ema.size).toBeGreaterThan(0)
    })

    it('should return cached preprocessed data on subsequent calls', () => {
      const prices = Array.from({ length: 50 }, (_, i) => new Decimal(100 + i))

      const first = service.preprocessData('TEST', prices)
      const second = service.preprocessData('TEST', prices)

      // Should return the same cached object
      expect(first).toBe(second)
    })

    it('should limit cache size', () => {
      // Create more than 100 cache entries
      for (let i = 0; i < 105; i++) {
        const prices = Array.from({ length: 50 }, (_, j) => new Decimal(100 + j))
        service.preprocessData(`TEST${i}`, prices)
      }

      const stats = service.getPreprocessCacheStats()
      expect(stats.size).toBeLessThanOrEqual(101) // Should not exceed limit
    })
  })

  describe('Incremental EMA Updates', () => {
    it('should create EMA state from price series', () => {
      const prices = Array.from({ length: 30 }, (_, i) => new Decimal(100 + i))

      const state = service.createEMAState(prices, 14)

      expect(state.value).toBeInstanceOf(Decimal)
      expect(state.period).toBe(14)
      expect(state.alpha).toBeInstanceOf(Decimal)
    })

    it('should update EMA incrementally', () => {
      const prices = Array.from({ length: 30 }, (_, i) => new Decimal(100 + i))
      const state = service.createEMAState(prices, 14)

      const newPrice = new Decimal(150)
      const updatedState = service.updateEMAIncremental(state, newPrice)

      expect(updatedState.value).toBeInstanceOf(Decimal)
      expect(updatedState.value).not.toEqual(state.value)
      expect(updatedState.period).toBe(state.period)
    })
  })

  describe('Incremental ATR Updates', () => {
    it('should create ATR state from price series', () => {
      const highs = Array.from({ length: 30 }, (_, i) => new Decimal(105 + i))
      const lows = Array.from({ length: 30 }, (_, i) => new Decimal(95 + i))
      const closes = Array.from({ length: 30 }, (_, i) => new Decimal(100 + i))

      const state = service.createATRState(highs, lows, closes, 14)

      expect(state.value).toBeInstanceOf(Decimal)
      expect(state.period).toBe(14)
    })

    it('should update ATR incrementally', () => {
      const highs = Array.from({ length: 30 }, (_, i) => new Decimal(105 + i))
      const lows = Array.from({ length: 30 }, (_, i) => new Decimal(95 + i))
      const closes = Array.from({ length: 30 }, (_, i) => new Decimal(100 + i))

      const state = service.createATRState(highs, lows, closes, 14)

      const updatedState = service.updateATRIncremental(
        state,
        new Decimal(160),
        new Decimal(140),
        new Decimal(129)
      )

      expect(updatedState.value).toBeInstanceOf(Decimal)
      expect(updatedState.value).not.toEqual(state.value)
      expect(updatedState.period).toBe(state.period)
    })
  })

  describe('Cache Management', () => {
    it('should clear preprocessing cache', () => {
      const prices = Array.from({ length: 50 }, (_, i) => new Decimal(100 + i))
      service.preprocessData('TEST', prices)

      let stats = service.getPreprocessCacheStats()
      expect(stats.size).toBeGreaterThan(0)

      service.clearPreprocessCache()

      stats = service.getPreprocessCacheStats()
      expect(stats.size).toBe(0)
    })

    it('should provide cache statistics', () => {
      const prices = Array.from({ length: 50 }, (_, i) => new Decimal(100 + i))
      service.preprocessData('TEST1', prices)
      service.preprocessData('TEST2', prices)

      const stats = service.getPreprocessCacheStats()

      expect(stats.size).toBe(2)
      expect(stats.keys).toContain('TEST1:50')
      expect(stats.keys).toContain('TEST2:50')
    })
  })
})
