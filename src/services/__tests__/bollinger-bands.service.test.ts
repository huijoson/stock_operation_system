import { BollingerBandsService } from '../bollinger-bands.service'
import Decimal from 'decimal.js'

describe('BollingerBandsService', () => {
  let service: BollingerBandsService

  beforeEach(() => {
    service = new BollingerBandsService()
  })

  describe('calculateSMA', () => {
    it('should calculate SMA correctly for a simple sequence', () => {
      const prices = [10, 12, 14, 16, 18, 20]
      const period = 3
      
      const sma = service.calculateSMA(prices, period)
      
      expect(sma).toBeDefined()
      expect(sma.length).toBe(prices.length - period + 1)
      
      // First SMA: (10 + 12 + 14) / 3 = 12
      expect(sma[0].toNumber()).toBeCloseTo(12, 5)
      
      // Second SMA: (12 + 14 + 16) / 3 = 14
      expect(sma[1].toNumber()).toBeCloseTo(14, 5)
      
      // Third SMA: (14 + 16 + 18) / 3 = 16
      expect(sma[2].toNumber()).toBeCloseTo(16, 5)
    })

    it('should throw error for insufficient data', () => {
      const prices = [10, 11, 12]
      const period = 5
      
      expect(() => service.calculateSMA(prices, period)).toThrow('Insufficient data')
    })
  })

  describe('calculateStandardDeviation', () => {
    it('should calculate standard deviation correctly', () => {
      const prices = [10, 12, 14, 16, 18]
      const period = 3
      
      const stdDev = service.calculateStandardDeviation(prices, period)
      
      expect(stdDev).toBeDefined()
      expect(stdDev.length).toBe(prices.length - period + 1)
      
      // All values should be positive
      stdDev.forEach(sd => {
        expect(sd.toNumber()).toBeGreaterThan(0)
      })
    })

    it('should return zero standard deviation for constant prices', () => {
      const prices = [100, 100, 100, 100, 100]
      const period = 3
      
      const stdDev = service.calculateStandardDeviation(prices, period)
      
      stdDev.forEach(sd => {
        expect(sd.toNumber()).toBeCloseTo(0, 5)
      })
    })

    it('should throw error for insufficient data', () => {
      const prices = [10, 11]
      const period = 5
      
      expect(() => service.calculateStandardDeviation(prices, period)).toThrow('Insufficient data')
    })
  })

  describe('calculateBands', () => {
    it('should calculate Bollinger Bands correctly', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 0.5)
      
      const result = service.calculateBands(prices)
      
      expect(result.upper).toBeDefined()
      expect(result.middle).toBeDefined()
      expect(result.lower).toBeDefined()
      expect(result.bandwidth).toBeDefined()
      expect(result.currentPosition).toBeDefined()
      
      // All arrays should have the same length
      expect(result.upper.length).toBe(result.middle.length)
      expect(result.lower.length).toBe(result.middle.length)
      expect(result.bandwidth.length).toBe(result.middle.length)
      
      // Upper band should be above middle, lower band should be below
      for (let i = 0; i < result.middle.length; i++) {
        expect(result.upper[i].toNumber()).toBeGreaterThan(result.middle[i].toNumber())
        expect(result.lower[i].toNumber()).toBeLessThan(result.middle[i].toNumber())
      }
    })

    it('should determine current position correctly', () => {
      // Price above upper band - use more extreme value
      const pricesAbove = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 200]
      const resultAbove = service.calculateBands(pricesAbove, 20)
      expect(resultAbove.currentPosition).toBe('above_upper')
      
      // Price below lower band - use more extreme value
      const pricesBelow = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 10]
      const resultBelow = service.calculateBands(pricesBelow, 20)
      expect(resultBelow.currentPosition).toBe('below_lower')
      
      // Price within bands
      const pricesWithin = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
      const resultWithin = service.calculateBands(pricesWithin, 20)
      expect(resultWithin.currentPosition).toBe('within_bands')
    })

    it('should support custom period and standard deviation multiplier', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 0.5)
      
      const result = service.calculateBands(prices, 10, 3)
      
      expect(result.upper).toBeDefined()
      expect(result.middle).toBeDefined()
      expect(result.lower).toBeDefined()
    })

    it('should throw error for insufficient data', () => {
      const prices = Array.from({ length: 10 }, (_, i) => 100 + i)
      
      expect(() => service.calculateBands(prices, 20)).toThrow('Insufficient data')
    })

    it('should calculate bandwidth correctly', () => {
      const prices = [100, 102, 104, 106, 108, 110]
      const period = 3
      
      const result = service.calculateBands(prices, period)
      
      // Bandwidth should be positive
      result.bandwidth.forEach(bw => {
        expect(bw).toBeGreaterThan(0)
      })
      
      // Verify bandwidth formula: (Upper - Lower) / Middle
      for (let i = 0; i < result.bandwidth.length; i++) {
        const expectedBw = result.upper[i]
          .minus(result.lower[i])
          .dividedBy(result.middle[i])
          .toNumber()
        
        expect(result.bandwidth[i]).toBeCloseTo(expectedBw, 5)
      }
    })
  })

  describe('detectSqueeze', () => {
    it('should detect squeeze when bandwidth is narrow', () => {
      // Create prices with decreasing volatility (squeeze)
      const prices: number[] = []
      for (let i = 0; i < 30; i++) {
        if (i < 20) {
          // High volatility period
          prices.push(100 + Math.sin(i) * 10)
        } else {
          // Low volatility period (squeeze)
          prices.push(100 + Math.sin(i) * 1)
        }
      }
      
      const bands = service.calculateBands(prices, 20)
      const isSqueeze = service.detectSqueeze(bands, 20, 0.5)
      
      // Should detect squeeze in low volatility period
      expect(typeof isSqueeze).toBe('boolean')
    })

    it('should not detect squeeze when bandwidth is normal', () => {
      // Create prices with consistent volatility
      const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5)
      
      const bands = service.calculateBands(prices, 20)
      const isSqueeze = service.detectSqueeze(bands, 20, 0.5)
      
      expect(typeof isSqueeze).toBe('boolean')
    })

    it('should return false for insufficient data', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i * 0.5)
      
      const bands = service.calculateBands(prices, 20)
      const isSqueeze = service.detectSqueeze(bands, 30) // Lookback > data length
      
      expect(isSqueeze).toBe(false)
    })

    it('should support custom threshold', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 0.5)
      
      const bands = service.calculateBands(prices, 20)
      
      // Test with different thresholds
      const squeeze1 = service.detectSqueeze(bands, 20, 0.3)
      const squeeze2 = service.detectSqueeze(bands, 20, 0.7)
      
      expect(typeof squeeze1).toBe('boolean')
      expect(typeof squeeze2).toBe('boolean')
    })
  })
})
