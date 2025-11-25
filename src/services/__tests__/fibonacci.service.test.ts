import Decimal from 'decimal.js'
import { FibonacciService } from '../fibonacci.service'

describe('FibonacciService', () => {
  let service: FibonacciService

  beforeEach(() => {
    service = new FibonacciService()
  })

  describe('calculateRetracement', () => {
    it('should calculate all five Fibonacci retracement levels', () => {
      const high = new Decimal(100)
      const low = new Decimal(50)
      
      const result = service.calculateRetracement(high, low, true)
      
      expect(result.levels).toHaveLength(5)
      expect(result.levels.map(l => l.ratio)).toEqual([0.236, 0.382, 0.5, 0.618, 0.786])
    })

    it('should calculate retracement using correct formula: High - (High - Low) × Ratio', () => {
      const high = new Decimal(100)
      const low = new Decimal(50)
      
      const result = service.calculateRetracement(high, low, true)
      
      // For 50% retracement: 100 - (100 - 50) × 0.5 = 100 - 25 = 75
      const fiftyPercentLevel = result.levels.find(l => l.ratio === 0.5)
      expect(fiftyPercentLevel?.price.toString()).toBe('75')
      
      // For 61.8% retracement: 100 - (100 - 50) × 0.618 = 100 - 30.9 = 69.1
      const goldenLevel = result.levels.find(l => l.ratio === 0.618)
      expect(goldenLevel?.price.toString()).toBe('69.1')
    })

    it('should preserve high and low values', () => {
      const high = new Decimal(100)
      const low = new Decimal(50)
      
      const result = service.calculateRetracement(high, low, true)
      
      expect(result.high.toString()).toBe('100')
      expect(result.low.toString()).toBe('50')
    })

    it('should set direction correctly', () => {
      const high = new Decimal(100)
      const low = new Decimal(50)
      
      const uptrendResult = service.calculateRetracement(high, low, true)
      expect(uptrendResult.direction).toBe('uptrend')
      
      const downtrendResult = service.calculateRetracement(high, low, false)
      expect(downtrendResult.direction).toBe('downtrend')
    })
  })

  describe('calculateExtension', () => {
    it('should calculate all three Fibonacci extension targets', () => {
      const start = new Decimal(100)
      const retracement = new Decimal(80)
      const breakout = new Decimal(100)
      
      const result = service.calculateExtension(start, retracement, breakout)
      
      expect(result.targets).toHaveLength(3)
      expect(result.targets.map(t => t.ratio)).toEqual([1.0, 1.618, 2.618])
    })

    it('should calculate extension using correct formula: Breakout + (Start - Retracement) × Ratio', () => {
      const start = new Decimal(100)
      const retracement = new Decimal(80)
      const breakout = new Decimal(100)
      
      const result = service.calculateExtension(start, retracement, breakout)
      
      // For 100% extension: 100 + (100 - 80) × 1.0 = 100 + 20 = 120
      const hundredPercentTarget = result.targets.find(t => t.ratio === 1.0)
      expect(hundredPercentTarget?.price.toString()).toBe('120')
      
      // For 161.8% extension: 100 + (100 - 80) × 1.618 = 100 + 32.36 = 132.36
      const goldenTarget = result.targets.find(t => t.ratio === 1.618)
      expect(goldenTarget?.price.toString()).toBe('132.36')
    })

    it('should preserve start, retracement, and breakout values', () => {
      const start = new Decimal(100)
      const retracement = new Decimal(80)
      const breakout = new Decimal(100)
      
      const result = service.calculateExtension(start, retracement, breakout)
      
      expect(result.start.toString()).toBe('100')
      expect(result.retracement.toString()).toBe('80')
      expect(result.breakout.toString()).toBe('100')
    })
  })

  describe('findNearestLevel', () => {
    it('should find level within 2% tolerance', () => {
      const high = new Decimal(100)
      const low = new Decimal(50)
      const levels = service.calculateRetracement(high, low, true)
      
      // 50% level is at 75, so 76 is within 2% (1.33%)
      const currentPrice = new Decimal(76)
      const nearest = service.findNearestLevel(currentPrice, levels)
      
      expect(nearest).not.toBeNull()
      expect(nearest?.ratio).toBe(0.5)
    })

    it('should return null when no level is within tolerance', () => {
      const high = new Decimal(100)
      const low = new Decimal(50)
      const levels = service.calculateRetracement(high, low, true)
      
      // Price far from any level
      const currentPrice = new Decimal(45)
      const nearest = service.findNearestLevel(currentPrice, levels)
      
      expect(nearest).toBeNull()
    })

    it('should find the closest level when multiple are within tolerance', () => {
      const high = new Decimal(100)
      const low = new Decimal(50)
      const levels = service.calculateRetracement(high, low, true)
      
      // 50% level is at 75
      const currentPrice = new Decimal(75.5)
      const nearest = service.findNearestLevel(currentPrice, levels)
      
      expect(nearest?.ratio).toBe(0.5)
    })

    it('should respect custom tolerance parameter', () => {
      const high = new Decimal(100)
      const low = new Decimal(50)
      const levels = service.calculateRetracement(high, low, true)
      
      // 50% level is at 75, 77.5 is 3.33% away from 75
      const currentPrice = new Decimal(77.5)
      
      // Should not find with 2% tolerance
      const notFound = service.findNearestLevel(currentPrice, levels, 0.02)
      expect(notFound).toBeNull()
      
      // Should find with 5% tolerance
      const found = service.findNearestLevel(currentPrice, levels, 0.05)
      expect(found).not.toBeNull()
    })
  })

  describe('High precision calculations', () => {
    it('should use Decimal.js for precise calculations', () => {
      const high = new Decimal('100.123456789')
      const low = new Decimal('50.987654321')
      
      const result = service.calculateRetracement(high, low, true)
      
      // Verify precision is maintained
      expect(result.high.toString()).toBe('100.123456789')
      expect(result.low.toString()).toBe('50.987654321')
      
      // Verify calculations maintain precision
      const fiftyPercent = result.levels.find(l => l.ratio === 0.5)
      expect(fiftyPercent?.price.decimalPlaces()).toBeGreaterThan(2)
    })
  })
})
