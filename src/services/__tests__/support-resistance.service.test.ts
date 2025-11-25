import { SupportResistanceService } from '../support-resistance.service'
import Decimal from 'decimal.js'

describe('SupportResistanceService', () => {
  let service: SupportResistanceService

  beforeEach(() => {
    service = new SupportResistanceService()
  })

  describe('findGoldenRatioLevels', () => {
    it('should calculate golden ratio levels correctly', () => {
      const high = 100
      const low = 50
      
      const result = service.findGoldenRatioLevels(high, low)
      
      expect(result.levels).toBeDefined()
      expect(result.levels.length).toBe(6) // 6 golden ratios
      
      // Check specific levels
      const level0 = result.levels.find(l => l.ratio === 0)
      const level50 = result.levels.find(l => l.ratio === 0.5)
      const level100 = result.levels.find(l => l.ratio === 1.0)
      
      expect(level50).toBeDefined()
      expect(level50!.price.toNumber()).toBeCloseTo(75, 5) // 50 + (100-50) * 0.5
      
      expect(level100).toBeDefined()
      expect(level100!.price.toNumber()).toBeCloseTo(100, 5)
    })

    it('should include all standard Fibonacci ratios', () => {
      const result = service.findGoldenRatioLevels(200, 100)
      
      const ratios = result.levels.map(l => l.ratio)
      expect(ratios).toContain(0.236)
      expect(ratios).toContain(0.382)
      expect(ratios).toContain(0.5)
      expect(ratios).toContain(0.618)
      expect(ratios).toContain(0.786)
      expect(ratios).toContain(1.0)
    })

    it('should handle Decimal inputs', () => {
      const high = new Decimal(150.5)
      const low = new Decimal(100.25)
      
      const result = service.findGoldenRatioLevels(high, low)
      
      expect(result.levels).toBeDefined()
      expect(result.levels.length).toBeGreaterThan(0)
    })
  })

  describe('mergeNearbyLevels', () => {
    it('should merge levels within tolerance', () => {
      const levels = [
        { price: new Decimal(100), strength: 'weak' as const, touches: 1, type: 'support' as const },
        { price: new Decimal(102), strength: 'weak' as const, touches: 1, type: 'support' as const },
        { price: new Decimal(101), strength: 'weak' as const, touches: 1, type: 'support' as const }
      ]
      
      const merged = service.mergeNearbyLevels(levels, 0.03) // 3% tolerance
      
      // All three levels should merge into one
      expect(merged.length).toBe(1)
      expect(merged[0].touches).toBe(3)
      expect(merged[0].strength).toBe('strong')
    })

    it('should not merge levels outside tolerance', () => {
      const levels = [
        { price: new Decimal(100), strength: 'weak' as const, touches: 1, type: 'support' as const },
        { price: new Decimal(150), strength: 'weak' as const, touches: 1, type: 'support' as const }
      ]
      
      const merged = service.mergeNearbyLevels(levels, 0.03)
      
      // Levels are too far apart, should not merge
      expect(merged.length).toBe(2)
    })

    it('should determine strength based on merged count', () => {
      // Strong: 3+ levels
      const strongLevels = [
        { price: new Decimal(100), strength: 'weak' as const, touches: 1, type: 'support' as const },
        { price: new Decimal(101), strength: 'weak' as const, touches: 1, type: 'support' as const },
        { price: new Decimal(102), strength: 'weak' as const, touches: 1, type: 'support' as const }
      ]
      
      const strongMerged = service.mergeNearbyLevels(strongLevels, 0.03)
      expect(strongMerged[0].strength).toBe('strong')
      
      // Moderate: 2 levels
      const moderateLevels = [
        { price: new Decimal(100), strength: 'weak' as const, touches: 1, type: 'support' as const },
        { price: new Decimal(101), strength: 'weak' as const, touches: 1, type: 'support' as const }
      ]
      
      const moderateMerged = service.mergeNearbyLevels(moderateLevels, 0.03)
      expect(moderateMerged[0].strength).toBe('moderate')
      
      // Weak: 1 level
      const weakLevels = [
        { price: new Decimal(100), strength: 'weak' as const, touches: 1, type: 'support' as const }
      ]
      
      const weakMerged = service.mergeNearbyLevels(weakLevels, 0.03)
      expect(weakMerged[0].strength).toBe('weak')
    })

    it('should handle empty array', () => {
      const merged = service.mergeNearbyLevels([], 0.03)
      expect(merged).toEqual([])
    })

    it('should calculate average price for merged levels', () => {
      const levels = [
        { price: new Decimal(100), strength: 'weak' as const, touches: 1, type: 'support' as const },
        { price: new Decimal(102), strength: 'weak' as const, touches: 1, type: 'support' as const }
      ]
      
      const merged = service.mergeNearbyLevels(levels, 0.03)
      
      // Average of 100 and 102 is 101
      expect(merged[0].price.toNumber()).toBeCloseTo(101, 5)
    })
  })

  describe('calculateLevels', () => {
    it('should calculate support and resistance levels', () => {
      const prices = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i / 10) * 20)
      
      const result = service.calculateLevels(prices, [30, 60, 90])
      
      expect(result.supports).toBeDefined()
      expect(result.resistances).toBeDefined()
      expect(result.supports.length).toBeGreaterThan(0)
      expect(result.resistances.length).toBeGreaterThan(0)
    })

    it('should find nearest support and resistance to current price', () => {
      const prices = [80, 85, 90, 95, 100, 105, 110, 115, 120, 115, 110, 105, 100, 95, 90, 85, 80, 85, 90, 95, 100, 105, 110, 115, 120, 115, 110, 105, 100, 95]
      const currentPrice = 100
      
      const result = service.calculateLevels(prices, [30], currentPrice)
      
      // Should have nearest support below 100
      if (result.currentNearestSupport) {
        expect(result.currentNearestSupport.price.toNumber()).toBeLessThan(currentPrice)
      }
      
      // Should have nearest resistance above 100
      if (result.currentNearestResistance) {
        expect(result.currentNearestResistance.price.toNumber()).toBeGreaterThan(currentPrice)
      }
    })

    it('should throw error for insufficient data', () => {
      const prices = [100, 105, 110]
      
      expect(() => service.calculateLevels(prices, [30])).toThrow('Insufficient data')
    })

    it('should support custom lookback periods', () => {
      const prices = Array.from({ length: 100 }, (_, i) => 100 + i * 0.5)
      
      const result = service.calculateLevels(prices, [20, 40])
      
      expect(result.supports).toBeDefined()
      expect(result.resistances).toBeDefined()
    })

    it('should sort supports descending and resistances ascending', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 10)
      
      const result = service.calculateLevels(prices, [30])
      
      // Check supports are sorted descending
      for (let i = 1; i < result.supports.length; i++) {
        expect(result.supports[i].price.toNumber()).toBeLessThanOrEqual(
          result.supports[i - 1].price.toNumber()
        )
      }
      
      // Check resistances are sorted ascending
      for (let i = 1; i < result.resistances.length; i++) {
        expect(result.resistances[i].price.toNumber()).toBeGreaterThanOrEqual(
          result.resistances[i - 1].price.toNumber()
        )
      }
    })

    it('should work without current price', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5)
      
      const result = service.calculateLevels(prices, [30])
      
      expect(result.currentNearestSupport).toBeNull()
      expect(result.currentNearestResistance).toBeNull()
    })

    it('should include golden ratio levels', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 20)
      
      const result = service.calculateLevels(prices, [30])
      
      // Should have more levels than just highs and lows due to golden ratios
      const totalLevels = result.supports.length + result.resistances.length
      expect(totalLevels).toBeGreaterThan(2) // More than just one high and one low
    })
  })
})
