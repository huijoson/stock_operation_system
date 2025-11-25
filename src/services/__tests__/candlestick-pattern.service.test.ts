import Decimal from 'decimal.js'
import { CandlestickPatternService, Candle, MarketContext } from '../candlestick-pattern.service'

describe('CandlestickPatternService', () => {
  let service: CandlestickPatternService

  beforeEach(() => {
    service = new CandlestickPatternService()
  })

  describe('identifyPatterns', () => {
    it('should return empty array for empty candles', () => {
      const patterns = service.identifyPatterns([])
      expect(patterns).toEqual([])
    })

    it('should identify hammer pattern', () => {
      // Hammer: body at top (30%+ of range), long lower shadow (2x+ body), small upper shadow (<10%)
      // Total range: 100-90 = 10
      // Body: |99-96| = 3 (30% of range) ✓
      // Lower shadow: 96-90 = 6 (2x body) ✓
      // Upper shadow: 100-99 = 1 (10% of range) - need smaller!
      // Let's use: high=99.5, so upper shadow = 0.5 (5% of range) ✓
      const candle: Candle = {
        open: new Decimal(96),
        high: new Decimal(99.5),
        low: new Decimal(90),
        close: new Decimal(99),
        date: new Date('2024-01-01')
      }

      const patterns = service.identifyPatterns([candle])
      const hammer = patterns.find(p => p.pattern === 'HAMMER')
      
      expect(hammer).toBeDefined()
      expect(hammer?.signal).toBe('bullish')
      expect(hammer?.reliability).toBeGreaterThan(0)
    })

    it('should identify doji pattern', () => {
      const candle: Candle = {
        open: new Decimal(100),
        high: new Decimal(105),
        low: new Decimal(95),
        close: new Decimal(100.5),
        date: new Date('2024-01-01')
      }

      const patterns = service.identifyPatterns([candle])
      const doji = patterns.find(p => p.pattern === 'DOJI')
      
      expect(doji).toBeDefined()
      expect(doji?.signal).toBe('neutral')
    })

    it('should identify bullish engulfing pattern', () => {
      const candles: Candle[] = [
        {
          open: new Decimal(105),
          high: new Decimal(106),
          low: new Decimal(100),
          close: new Decimal(101),
          date: new Date('2024-01-01')
        },
        {
          open: new Decimal(100),
          high: new Decimal(110),
          low: new Decimal(99),
          close: new Decimal(108),
          date: new Date('2024-01-02')
        }
      ]

      const patterns = service.identifyPatterns(candles)
      const engulfing = patterns.find(p => p.pattern === 'BULLISH_ENGULFING')
      
      expect(engulfing).toBeDefined()
      expect(engulfing?.signal).toBe('bullish')
    })

    it('should identify bearish engulfing pattern', () => {
      const candles: Candle[] = [
        {
          open: new Decimal(100),
          high: new Decimal(106),
          low: new Decimal(99),
          close: new Decimal(105),
          date: new Date('2024-01-01')
        },
        {
          open: new Decimal(106),
          high: new Decimal(107),
          low: new Decimal(98),
          close: new Decimal(99),
          date: new Date('2024-01-02')
        }
      ]

      const patterns = service.identifyPatterns(candles)
      const engulfing = patterns.find(p => p.pattern === 'BEARISH_ENGULFING')
      
      expect(engulfing).toBeDefined()
      expect(engulfing?.signal).toBe('bearish')
    })

    it('should identify morning star pattern', () => {
      // Morning Star: bearish candle, small star, bullish candle
      // First: large bearish body (110->102, body=8, range=12, ratio=67%)
      // Second: small star (101->102, body=1, range=3, ratio=33% - need smaller)
      // Third: large bullish body (103->113, body=10, range=13, ratio=77%)
      const candles: Candle[] = [
        {
          open: new Decimal(110),
          high: new Decimal(112),
          low: new Decimal(100),
          close: new Decimal(102),
          date: new Date('2024-01-01')
        },
        {
          open: new Decimal(101),
          high: new Decimal(102.5),
          low: new Decimal(100),
          close: new Decimal(101.5),
          date: new Date('2024-01-02')
        },
        {
          open: new Decimal(103),
          high: new Decimal(115),
          low: new Decimal(102),
          close: new Decimal(113),
          date: new Date('2024-01-03')
        }
      ]

      const patterns = service.identifyPatterns(candles)
      const morningStar = patterns.find(p => p.pattern === 'MORNING_STAR')
      
      expect(morningStar).toBeDefined()
      expect(morningStar?.signal).toBe('bullish')
    })

    it('should identify evening star pattern', () => {
      // Evening Star: bullish candle, small star, bearish candle
      // First: large bullish body (100->110, body=10, range=13, ratio=77%)
      // Second: small star (111->111.5, body=0.5, range=3, ratio=17%)
      // Third: large bearish body (111->100, body=11, range=14, ratio=79%)
      const candles: Candle[] = [
        {
          open: new Decimal(100),
          high: new Decimal(112),
          low: new Decimal(99),
          close: new Decimal(110),
          date: new Date('2024-01-01')
        },
        {
          open: new Decimal(111),
          high: new Decimal(113),
          low: new Decimal(110),
          close: new Decimal(111.5),
          date: new Date('2024-01-02')
        },
        {
          open: new Decimal(111),
          high: new Decimal(112),
          low: new Decimal(98),
          close: new Decimal(100),
          date: new Date('2024-01-03')
        }
      ]

      const patterns = service.identifyPatterns(candles)
      const eveningStar = patterns.find(p => p.pattern === 'EVENING_STAR')
      
      expect(eveningStar).toBeDefined()
      expect(eveningStar?.signal).toBe('bearish')
    })

    it('should mark patterns at golden ratio levels', () => {
      const candle: Candle = {
        open: new Decimal(96),
        high: new Decimal(99.5),
        low: new Decimal(90),
        close: new Decimal(99),
        date: new Date('2024-01-01')
      }

      const goldenRatioLevels = [new Decimal(99), new Decimal(105)]
      const patterns = service.identifyPatterns([candle], goldenRatioLevels)
      
      const hammer = patterns.find(p => p.pattern === 'HAMMER')
      expect(hammer?.atGoldenRatio).toBe(true)
    })
  })

  describe('calculateReliability', () => {
    it('should return reliability score between 0 and 100', () => {
      const context: MarketContext = {
        trend: 'downtrend',
        volatility: 'medium',
        atGoldenRatio: false
      }

      const reliability = service.calculateReliability('HAMMER', context)
      
      expect(reliability).toBeGreaterThanOrEqual(0)
      expect(reliability).toBeLessThanOrEqual(100)
    })

    it('should increase reliability for bullish patterns in downtrend', () => {
      const downtrendContext: MarketContext = {
        trend: 'downtrend',
        volatility: 'medium',
        atGoldenRatio: false
      }

      const uptrendContext: MarketContext = {
        trend: 'uptrend',
        volatility: 'medium',
        atGoldenRatio: false
      }

      const reliabilityInDowntrend = service.calculateReliability('HAMMER', downtrendContext)
      const reliabilityInUptrend = service.calculateReliability('HAMMER', uptrendContext)
      
      expect(reliabilityInDowntrend).toBeGreaterThan(reliabilityInUptrend)
    })

    it('should increase reliability for bearish patterns in uptrend', () => {
      const uptrendContext: MarketContext = {
        trend: 'uptrend',
        volatility: 'medium',
        atGoldenRatio: false
      }

      const downtrendContext: MarketContext = {
        trend: 'downtrend',
        volatility: 'medium',
        atGoldenRatio: false
      }

      const reliabilityInUptrend = service.calculateReliability('HANGING_MAN', uptrendContext)
      const reliabilityInDowntrend = service.calculateReliability('HANGING_MAN', downtrendContext)
      
      expect(reliabilityInUptrend).toBeGreaterThan(reliabilityInDowntrend)
    })

    it('should increase reliability for patterns at golden ratio', () => {
      const withGoldenRatio: MarketContext = {
        trend: 'downtrend',
        volatility: 'medium',
        atGoldenRatio: true
      }

      const withoutGoldenRatio: MarketContext = {
        trend: 'downtrend',
        volatility: 'medium',
        atGoldenRatio: false
      }

      const reliabilityWith = service.calculateReliability('HAMMER', withGoldenRatio)
      const reliabilityWithout = service.calculateReliability('HAMMER', withoutGoldenRatio)
      
      expect(reliabilityWith).toBeGreaterThan(reliabilityWithout)
    })

    it('should assign higher base reliability to engulfing patterns', () => {
      const context: MarketContext = {
        trend: 'sideways',
        volatility: 'medium',
        atGoldenRatio: false
      }

      const engulfingReliability = service.calculateReliability('BULLISH_ENGULFING', context)
      const hammerReliability = service.calculateReliability('HAMMER', context)
      
      expect(engulfingReliability).toBeGreaterThan(hammerReliability)
    })

    it('should assign highest reliability to star patterns', () => {
      const context: MarketContext = {
        trend: 'sideways',
        volatility: 'medium',
        atGoldenRatio: false
      }

      const morningStarReliability = service.calculateReliability('MORNING_STAR', context)
      const engulfingReliability = service.calculateReliability('BULLISH_ENGULFING', context)
      
      expect(morningStarReliability).toBeGreaterThanOrEqual(engulfingReliability)
    })
  })
})
