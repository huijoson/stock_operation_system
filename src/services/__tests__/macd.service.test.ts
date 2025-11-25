import { MACDService } from '../macd.service'
import Decimal from 'decimal.js'

describe('MACDService', () => {
  let service: MACDService

  beforeEach(() => {
    service = new MACDService()
  })

  describe('calculateEMA', () => {
    it('should calculate EMA correctly for a simple sequence', () => {
      const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      const period = 5
      
      const ema = service.calculateEMA(prices, period)
      
      expect(ema).toBeDefined()
      expect(ema.length).toBe(prices.length - period + 1)
      expect(ema[0]).toBeCloseTo(12, 1) // First value should be SMA of first 5 prices
    })

    it('should throw error for insufficient data', () => {
      const prices = [10, 11, 12]
      const period = 5
      
      expect(() => service.calculateEMA(prices, period)).toThrow('Insufficient data')
    })

    it('should follow EMA formula: EMA = Previous EMA × (1 - α) + Current Price × α', () => {
      const prices = [10, 12, 14, 16, 18, 20]
      const period = 3
      
      const ema = service.calculateEMA(prices, period)
      
      // α = 2 / (3 + 1) = 0.5
      // First EMA = (10 + 12 + 14) / 3 = 12
      expect(ema[0]).toBeCloseTo(12, 5)
      
      // Second EMA = 12 × (1 - 0.5) + 16 × 0.5 = 6 + 8 = 14
      expect(ema[1]).toBeCloseTo(14, 5)
      
      // Third EMA = 14 × (1 - 0.5) + 18 × 0.5 = 7 + 9 = 16
      expect(ema[2]).toBeCloseTo(16, 5)
    })
  })

  describe('calculateMACD', () => {
    it('should calculate MACD, signal line, and histogram', () => {
      // Generate sample price data
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5)
      
      const result = service.calculateMACD(prices)
      
      expect(result.macdLine).toBeDefined()
      expect(result.signalLine).toBeDefined()
      expect(result.histogram).toBeDefined()
      expect(result.macdLine.length).toBe(result.signalLine.length)
      expect(result.histogram.length).toBe(result.signalLine.length)
    })

    it('should throw error for insufficient data', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i)
      
      expect(() => service.calculateMACD(prices)).toThrow('Insufficient data')
    })

    it('should determine current signal based on MACD and signal line relationship', () => {
      // Create uptrend data
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 2)
      
      const result = service.calculateMACD(prices)
      
      // Verify signal is one of the valid values
      expect(['bullish', 'bearish', 'neutral']).toContain(result.currentSignal)
      
      // Verify the signal matches the relationship
      const lastMACD = result.macdLine[result.macdLine.length - 1]
      const lastSignal = result.signalLine[result.signalLine.length - 1]
      
      if (lastMACD > lastSignal) {
        expect(result.currentSignal).toBe('bullish')
      } else if (lastMACD < lastSignal) {
        expect(result.currentSignal).toBe('bearish')
      } else {
        expect(result.currentSignal).toBe('neutral')
      }
    })

    it('should support custom periods', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5)
      
      const result = service.calculateMACD(prices, 10, 20, 5)
      
      expect(result.macdLine).toBeDefined()
      expect(result.signalLine).toBeDefined()
    })
  })

  describe('detectCrossover', () => {
    it('should detect golden cross when MACD crosses above signal', () => {
      const macdLine = [1, 2, 3, 4, 5]
      const signalLine = [2, 2.5, 2.8, 3, 3.2]
      
      const crossovers = service.detectCrossover(macdLine, signalLine)
      
      expect(crossovers.length).toBeGreaterThan(0)
      const goldenCross = crossovers.find(c => c.type === 'golden')
      expect(goldenCross).toBeDefined()
      expect(goldenCross?.description).toContain('bullish')
    })

    it('should detect death cross when MACD crosses below signal', () => {
      const macdLine = [5, 4, 3, 2, 1]
      const signalLine = [3.2, 3, 2.8, 2.5, 2]
      
      const crossovers = service.detectCrossover(macdLine, signalLine)
      
      expect(crossovers.length).toBeGreaterThan(0)
      const deathCross = crossovers.find(c => c.type === 'death')
      expect(deathCross).toBeDefined()
      expect(deathCross?.description).toContain('bearish')
    })

    it('should throw error for mismatched array lengths', () => {
      const macdLine = [1, 2, 3]
      const signalLine = [1, 2]
      
      expect(() => service.detectCrossover(macdLine, signalLine)).toThrow(
        'MACD line and signal line must have the same length'
      )
    })

    it('should return empty array for insufficient data', () => {
      const macdLine = [1]
      const signalLine = [1]
      
      const crossovers = service.detectCrossover(macdLine, signalLine)
      
      expect(crossovers).toEqual([])
    })
  })
})
