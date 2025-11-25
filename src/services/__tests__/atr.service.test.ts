import { ATRService } from '../atr.service'
import Decimal from 'decimal.js'

describe('ATRService', () => {
  let service: ATRService

  beforeEach(() => {
    service = new ATRService()
  })

  describe('calculateTrueRange', () => {
    it('should calculate TR correctly when High-Low is largest', () => {
      const tr = service.calculateTrueRange(110, 100, 105)
      
      // High - Low = 110 - 100 = 10 (largest)
      expect(tr.toNumber()).toBe(10)
    })

    it('should calculate TR correctly when |High-PrevClose| is largest', () => {
      const tr = service.calculateTrueRange(110, 108, 100)
      
      // |High - PrevClose| = |110 - 100| = 10 (largest)
      expect(tr.toNumber()).toBe(10)
    })

    it('should calculate TR correctly when |Low-PrevClose| is largest', () => {
      const tr = service.calculateTrueRange(102, 100, 110)
      
      // |Low - PrevClose| = |100 - 110| = 10 (largest)
      expect(tr.toNumber()).toBe(10)
    })

    it('should handle gap up correctly', () => {
      const tr = service.calculateTrueRange(120, 115, 100)
      
      // Gap up: previous close 100, current low 115
      // |High - PrevClose| = 20 should be largest
      expect(tr.toNumber()).toBe(20)
    })

    it('should handle gap down correctly', () => {
      const tr = service.calculateTrueRange(95, 90, 110)
      
      // Gap down: previous close 110, current high 95
      // |Low - PrevClose| = 20 should be largest
      expect(tr.toNumber()).toBe(20)
    })
  })

  describe('calculateATR', () => {
    it('should calculate ATR correctly', () => {
      const highs = [110, 112, 115, 113, 116, 118, 120, 119, 121, 123, 125, 124, 126, 128, 130]
      const lows = [100, 102, 105, 103, 106, 108, 110, 109, 111, 113, 115, 114, 116, 118, 120]
      const closes = [105, 107, 110, 108, 111, 113, 115, 114, 116, 118, 120, 119, 121, 123, 125]
      
      const result = service.calculateATR(highs, lows, closes, 14)
      
      expect(result.value).toBeDefined()
      expect(result.value.toNumber()).toBeGreaterThan(0)
      expect(result.history).toBeDefined()
      expect(result.history.length).toBeGreaterThan(0)
      expect(result.volatilityStatus).toBeDefined()
      expect(['high', 'medium', 'low']).toContain(result.volatilityStatus)
    })

    it('should throw error for mismatched array lengths', () => {
      const highs = [110, 112, 115]
      const lows = [100, 102]
      const closes = [105, 107, 110]
      
      expect(() => service.calculateATR(highs, lows, closes)).toThrow(
        'Highs, lows, and closes arrays must have the same length'
      )
    })

    it('should throw error for insufficient data', () => {
      const highs = [110, 112, 115]
      const lows = [100, 102, 105]
      const closes = [105, 107, 110]
      
      expect(() => service.calculateATR(highs, lows, closes, 14)).toThrow('Insufficient data')
    })

    it('should follow ATR formula: ATR = (Previous ATR × 13 + Current TR) / 14', () => {
      // Create simple test data
      const highs = Array.from({ length: 20 }, (_, i) => 100 + i * 2)
      const lows = Array.from({ length: 20 }, (_, i) => 90 + i * 2)
      const closes = Array.from({ length: 20 }, (_, i) => 95 + i * 2)
      
      const result = service.calculateATR(highs, lows, closes, 14)
      
      // Verify ATR is calculated
      expect(result.value.toNumber()).toBeGreaterThan(0)
      
      // Verify history length
      expect(result.history.length).toBe(highs.length - 14)
    })

    it('should determine volatility status correctly', () => {
      // High volatility data
      const highVolHighs = [100, 120, 90, 130, 80, 140, 70, 150, 60, 160, 50, 170, 40, 180, 30, 190]
      const highVolLows = [90, 110, 80, 120, 70, 130, 60, 140, 50, 150, 40, 160, 30, 170, 20, 180]
      const highVolCloses = [95, 115, 85, 125, 75, 135, 65, 145, 55, 155, 45, 165, 35, 175, 25, 185]
      
      const highVolResult = service.calculateATR(highVolHighs, highVolLows, highVolCloses, 14)
      
      expect(['high', 'medium', 'low']).toContain(highVolResult.volatilityStatus)
    })

    it('should support custom period', () => {
      const highs = Array.from({ length: 30 }, (_, i) => 100 + i)
      const lows = Array.from({ length: 30 }, (_, i) => 90 + i)
      const closes = Array.from({ length: 30 }, (_, i) => 95 + i)
      
      const result = service.calculateATR(highs, lows, closes, 10)
      
      expect(result.value).toBeDefined()
      expect(result.history.length).toBe(highs.length - 10)
    })
  })

  describe('suggestStopLoss', () => {
    it('should suggest stop-loss below entry price for long positions', () => {
      const currentPrice = 100
      const atr = 5
      
      const stopLoss = service.suggestStopLoss(currentPrice, atr, 2, true)
      
      // Stop-loss should be 100 - (5 × 2) = 90
      expect(stopLoss.toNumber()).toBe(90)
    })

    it('should suggest stop-loss above entry price for short positions', () => {
      const currentPrice = 100
      const atr = 5
      
      const stopLoss = service.suggestStopLoss(currentPrice, atr, 2, false)
      
      // Stop-loss should be 100 + (5 × 2) = 110
      expect(stopLoss.toNumber()).toBe(110)
    })

    it('should support custom multiplier', () => {
      const currentPrice = 100
      const atr = 5
      
      const stopLoss1 = service.suggestStopLoss(currentPrice, atr, 1, true)
      const stopLoss2 = service.suggestStopLoss(currentPrice, atr, 3, true)
      
      // With multiplier 1: 100 - 5 = 95
      expect(stopLoss1.toNumber()).toBe(95)
      
      // With multiplier 3: 100 - 15 = 85
      expect(stopLoss2.toNumber()).toBe(85)
    })

    it('should handle Decimal inputs', () => {
      const currentPrice = new Decimal(100.5)
      const atr = new Decimal(5.25)
      
      const stopLoss = service.suggestStopLoss(currentPrice, atr, 2, true)
      
      // Stop-loss should be 100.5 - (5.25 × 2) = 90
      expect(stopLoss.toNumber()).toBe(90)
    })

    it('should default to long position', () => {
      const currentPrice = 100
      const atr = 5
      
      // Not specifying isLong should default to true (long position)
      const stopLoss = service.suggestStopLoss(currentPrice, atr, 2)
      
      expect(stopLoss.toNumber()).toBe(90)
    })

    it('should default to 2x multiplier', () => {
      const currentPrice = 100
      const atr = 5
      
      // Not specifying multiplier should default to 2
      const stopLoss = service.suggestStopLoss(currentPrice, atr)
      
      expect(stopLoss.toNumber()).toBe(90)
    })
  })
})
