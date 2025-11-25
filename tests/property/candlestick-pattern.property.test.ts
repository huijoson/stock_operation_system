import * as fc from 'fast-check'
import Decimal from 'decimal.js'
import { CandlestickPatternService, Candle, PatternType } from '@/services/candlestick-pattern.service'

describe('Candlestick Pattern Service - Property-Based Tests', () => {
  let service: CandlestickPatternService

  beforeEach(() => {
    service = new CandlestickPatternService()
  })

  // Custom arbitraries for generating test data
  
  /**
   * Generate a valid price value
   */
  const arbitraryPrice = () => fc.double({ min: 1, max: 1000, noNaN: true, noDefaultInfinity: true })

  /**
   * Generate a valid candlestick with proper OHLC relationships
   * Ensures: low <= open, close <= high and low <= high
   */
  const arbitraryCandle = () => fc.record({
    basePrice: arbitraryPrice(),
    range: fc.double({ min: 0.1, max: 50, noNaN: true }),
    openRatio: fc.double({ min: 0, max: 1, noNaN: true }),
    closeRatio: fc.double({ min: 0, max: 1, noNaN: true }),
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
  }).map(({ basePrice, range, openRatio, closeRatio, date }) => {
    const low = new Decimal(basePrice)
    const high = low.plus(range)
    const open = low.plus(new Decimal(range).times(openRatio))
    const close = low.plus(new Decimal(range).times(closeRatio))
    
    return {
      open,
      high,
      low,
      close,
      date
    } as Candle
  })

  /**
   * Generate a bullish candlestick (close > open)
   */
  const arbitraryBullishCandle = () => fc.record({
    basePrice: arbitraryPrice(),
    range: fc.double({ min: 0.1, max: 50, noNaN: true }),
    bodyRatio: fc.double({ min: 0.3, max: 0.9, noNaN: true }), // Ensure significant body
    openPosition: fc.double({ min: 0.1, max: 0.5, noNaN: true }), // Open in lower half
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
  }).map(({ basePrice, range, bodyRatio, openPosition, date }) => {
    const low = new Decimal(basePrice)
    const high = low.plus(range)
    const open = low.plus(new Decimal(range).times(openPosition))
    const bodySize = new Decimal(range).times(bodyRatio)
    const close = open.plus(bodySize)
    
    // Ensure close doesn't exceed high
    const adjustedClose = Decimal.min(close, high.minus(0.01))
    
    return {
      open,
      high,
      low,
      close: adjustedClose,
      date
    } as Candle
  })

  /**
   * Generate a bearish candlestick (close < open)
   */
  const arbitraryBearishCandle = () => fc.record({
    basePrice: arbitraryPrice(),
    range: fc.double({ min: 0.1, max: 50, noNaN: true }),
    bodyRatio: fc.double({ min: 0.3, max: 0.9, noNaN: true }), // Ensure significant body
    openPosition: fc.double({ min: 0.5, max: 0.9, noNaN: true }), // Open in upper half
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
  }).map(({ basePrice, range, bodyRatio, openPosition, date }) => {
    const low = new Decimal(basePrice)
    const high = low.plus(range)
    const open = low.plus(new Decimal(range).times(openPosition))
    const bodySize = new Decimal(range).times(bodyRatio)
    const close = open.minus(bodySize)
    
    // Ensure close doesn't go below low
    const adjustedClose = Decimal.max(close, low.plus(0.01))
    
    return {
      open,
      high,
      low,
      close: adjustedClose,
      date
    } as Candle
  })

  /**
   * Generate a hammer pattern candlestick
   * Characteristics:
   * - Small body at upper end (30%+ of range)
   * - Long lower shadow (2x+ body)
   * - Little or no upper shadow (<10%)
   */
  const arbitraryHammerCandle = () => fc.record({
    basePrice: arbitraryPrice(),
    totalRange: fc.double({ min: 5, max: 50, noNaN: true }),
    bodyRatio: fc.double({ min: 0.3, max: 0.4, noNaN: true }), // Body is 30-40% of range
    isBullish: fc.boolean(),
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
  }).map(({ basePrice, totalRange, bodyRatio, isBullish, date }) => {
    const low = new Decimal(basePrice)
    const high = low.plus(totalRange)
    
    // Body size is 30-40% of total range
    const bodySize = new Decimal(totalRange).times(bodyRatio)
    
    // Upper shadow should be very small (<10% of range)
    const upperShadow = new Decimal(totalRange).times(0.05)
    
    // Calculate body position (at upper end)
    const bodyTop = high.minus(upperShadow)
    const bodyBottom = bodyTop.minus(bodySize)
    
    const open = isBullish ? bodyBottom : bodyTop
    const close = isBullish ? bodyTop : bodyBottom
    
    return {
      open,
      high,
      low,
      close,
      date
    } as Candle
  })

  /**
   * Generate a bullish engulfing pattern (two candles)
   * First candle: bearish
   * Second candle: bullish and engulfs first
   */
  const arbitraryBullishEngulfingPattern = () => fc.record({
    basePrice: arbitraryPrice(),
    firstRange: fc.double({ min: 3, max: 10, noNaN: true }),
    secondRange: fc.double({ min: 5, max: 15, noNaN: true }),
    date1: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-30') })
  }).map(({ basePrice, firstRange, secondRange, date1 }) => {
    const date2 = new Date(date1)
    date2.setDate(date2.getDate() + 1)
    
    // First candle: bearish
    const firstLow = new Decimal(basePrice)
    const firstHigh = firstLow.plus(firstRange)
    const firstOpen = firstHigh.minus(1)
    const firstClose = firstLow.plus(1)
    
    // Second candle: bullish and engulfs first
    const secondLow = firstLow.minus(1)
    const secondHigh = firstHigh.plus(1)
    const secondOpen = firstClose.minus(0.5) // Open at or below first close
    const secondClose = firstOpen.plus(0.5) // Close at or above first open
    
    return [
      {
        open: firstOpen,
        high: firstHigh,
        low: firstLow,
        close: firstClose,
        date: date1
      } as Candle,
      {
        open: secondOpen,
        high: secondHigh,
        low: secondLow,
        close: secondClose,
        date: date2
      } as Candle
    ]
  })

  /**
   * Generate a morning star pattern (three candles)
   * First: large bearish
   * Second: small star
   * Third: large bullish
   */
  const arbitraryMorningStarPattern = () => fc.record({
    basePrice: arbitraryPrice(),
    date1: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-29') })
  }).map(({ basePrice, date1 }) => {
    const date2 = new Date(date1)
    date2.setDate(date2.getDate() + 1)
    const date3 = new Date(date2)
    date3.setDate(date3.getDate() + 1)
    
    // First candle: large bearish
    const firstHigh = new Decimal(basePrice).plus(12)
    const firstLow = new Decimal(basePrice)
    const firstOpen = firstHigh.minus(2)
    const firstClose = firstLow.plus(2)
    
    // Second candle: small star
    const secondHigh = firstClose.plus(2.5)
    const secondLow = firstClose.minus(1)
    const secondOpen = firstClose.plus(1)
    const secondClose = firstClose.plus(1.5)
    
    // Third candle: large bullish
    const thirdLow = secondLow.minus(1)
    const thirdHigh = firstOpen.plus(3)
    const thirdOpen = secondClose.plus(1)
    const thirdClose = firstOpen.plus(1) // Close well into first candle's body
    
    return [
      {
        open: firstOpen,
        high: firstHigh,
        low: firstLow,
        close: firstClose,
        date: date1
      } as Candle,
      {
        open: secondOpen,
        high: secondHigh,
        low: secondLow,
        close: secondClose,
        date: date2
      } as Candle,
      {
        open: thirdOpen,
        high: thirdHigh,
        low: thirdLow,
        close: thirdClose,
        date: date3
      } as Candle
    ]
  })

  /**
   * Generate a hanging man pattern candlestick
   * Structurally same as hammer but appears in uptrend (bearish signal)
   */
  const arbitraryHangingManCandle = () => arbitraryHammerCandle()

  /**
   * Generate a bearish engulfing pattern (two candles)
   * First candle: bullish
   * Second candle: bearish and engulfs first
   */
  const arbitraryBearishEngulfingPattern = () => fc.record({
    basePrice: arbitraryPrice(),
    firstRange: fc.double({ min: 3, max: 10, noNaN: true }),
    date1: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-30') })
  }).map(({ basePrice, firstRange, date1 }) => {
    const date2 = new Date(date1)
    date2.setDate(date2.getDate() + 1)
    
    // First candle: bullish
    const firstLow = new Decimal(basePrice)
    const firstHigh = firstLow.plus(firstRange)
    const firstOpen = firstLow.plus(1)
    const firstClose = firstHigh.minus(1)
    
    // Second candle: bearish and engulfs first
    const secondHigh = firstHigh.plus(1)
    const secondLow = firstLow.minus(1)
    const secondOpen = firstClose.plus(0.5) // Open at or above first close
    const secondClose = firstOpen.minus(0.5) // Close at or below first open
    
    return [
      {
        open: firstOpen,
        high: firstHigh,
        low: firstLow,
        close: firstClose,
        date: date1
      } as Candle,
      {
        open: secondOpen,
        high: secondHigh,
        low: secondLow,
        close: secondClose,
        date: date2
      } as Candle
    ]
  })

  /**
   * Generate an evening star pattern (three candles)
   * First: large bullish
   * Second: small star
   * Third: large bearish
   */
  const arbitraryEveningStarPattern = () => fc.record({
    basePrice: arbitraryPrice(),
    date1: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-29') })
  }).map(({ basePrice, date1 }) => {
    const date2 = new Date(date1)
    date2.setDate(date2.getDate() + 1)
    const date3 = new Date(date2)
    date3.setDate(date3.getDate() + 1)
    
    // First candle: large bullish
    const firstLow = new Decimal(basePrice)
    const firstHigh = new Decimal(basePrice).plus(12)
    const firstOpen = firstLow.plus(2)
    const firstClose = firstHigh.minus(2)
    
    // Second candle: small star
    const secondLow = firstClose.minus(1)
    const secondHigh = firstClose.plus(2.5)
    const secondOpen = firstClose.plus(1)
    const secondClose = firstClose.plus(1.5)
    
    // Third candle: large bearish
    const thirdHigh = secondHigh.plus(1)
    const thirdLow = firstOpen.minus(3)
    const thirdOpen = secondClose.minus(1)
    const thirdClose = firstOpen.minus(1) // Close well into first candle's body
    
    return [
      {
        open: firstOpen,
        high: firstHigh,
        low: firstLow,
        close: firstClose,
        date: date1
      } as Candle,
      {
        open: secondOpen,
        high: secondHigh,
        low: secondLow,
        close: secondClose,
        date: date2
      } as Candle,
      {
        open: thirdOpen,
        high: thirdHigh,
        low: thirdLow,
        close: thirdClose,
        date: date3
      } as Candle
    ]
  })

  /**
   * Feature: technical-indicators, Property 20: 看漲型態訊號
   * Validates: Requirements 9.2
   * 
   * Property: For any identified bullish candlestick pattern, the system should
   * mark it with a buy signal and provide pattern description
   */
  describe('Property 20: Bullish Pattern Signals', () => {
    it('should mark all hammer patterns with bullish signal and description', () => {
      fc.assert(
        fc.property(
          arbitraryHammerCandle(),
          (candle) => {
            // Act
            const patterns = service.identifyPatterns([candle])
            
            // Find hammer patterns
            const hammerPatterns = patterns.filter(p => p.pattern === 'HAMMER')
            
            // Assert: All hammer patterns should have bullish signal
            hammerPatterns.forEach(pattern => {
              expect(pattern.signal).toBe('bullish')
              expect(pattern.description).toBeTruthy()
              expect(pattern.description.length).toBeGreaterThan(0)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should mark all bullish engulfing patterns with bullish signal and description', () => {
      fc.assert(
        fc.property(
          arbitraryBullishEngulfingPattern(),
          (candles) => {
            // Act
            const patterns = service.identifyPatterns(candles)
            
            // Find bullish engulfing patterns
            const engulfingPatterns = patterns.filter(p => p.pattern === 'BULLISH_ENGULFING')
            
            // Assert: All bullish engulfing patterns should have bullish signal
            engulfingPatterns.forEach(pattern => {
              expect(pattern.signal).toBe('bullish')
              expect(pattern.description).toBeTruthy()
              expect(pattern.description.length).toBeGreaterThan(0)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should mark all morning star patterns with bullish signal and description', () => {
      fc.assert(
        fc.property(
          arbitraryMorningStarPattern(),
          (candles) => {
            // Act
            const patterns = service.identifyPatterns(candles)
            
            // Find morning star patterns
            const morningStarPatterns = patterns.filter(p => p.pattern === 'MORNING_STAR')
            
            // Assert: All morning star patterns should have bullish signal
            morningStarPatterns.forEach(pattern => {
              expect(pattern.signal).toBe('bullish')
              expect(pattern.description).toBeTruthy()
              expect(pattern.description.length).toBeGreaterThan(0)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should never mark bullish patterns with bearish or neutral signal', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            arbitraryHammerCandle().map(c => [c]),
            arbitraryBullishEngulfingPattern(),
            arbitraryMorningStarPattern()
          ),
          (candles) => {
            // Act
            const patterns = service.identifyPatterns(candles)
            
            // Define bullish pattern types
            const bullishPatternTypes: PatternType[] = ['HAMMER', 'BULLISH_ENGULFING', 'MORNING_STAR']
            
            // Find all bullish patterns
            const bullishPatterns = patterns.filter(p => bullishPatternTypes.includes(p.pattern))
            
            // Assert: No bullish pattern should have bearish or neutral signal
            bullishPatterns.forEach(pattern => {
              expect(pattern.signal).not.toBe('bearish')
              expect(pattern.signal).not.toBe('neutral')
              expect(pattern.signal).toBe('bullish')
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide non-empty description for all identified bullish patterns', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            arbitraryHammerCandle().map(c => [c]),
            arbitraryBullishEngulfingPattern(),
            arbitraryMorningStarPattern()
          ),
          (candles) => {
            // Act
            const patterns = service.identifyPatterns(candles)
            
            // Define bullish pattern types
            const bullishPatternTypes: PatternType[] = ['HAMMER', 'BULLISH_ENGULFING', 'MORNING_STAR']
            
            // Find all bullish patterns
            const bullishPatterns = patterns.filter(p => bullishPatternTypes.includes(p.pattern))
            
            // Assert: All bullish patterns should have non-empty description
            bullishPatterns.forEach(pattern => {
              expect(pattern.description).toBeTruthy()
              expect(typeof pattern.description).toBe('string')
              expect(pattern.description.length).toBeGreaterThan(0)
              // Description should mention the pattern or signal
              expect(
                pattern.description.toLowerCase().includes('bullish') ||
                pattern.description.toLowerCase().includes('hammer') ||
                pattern.description.toLowerCase().includes('engulfing') ||
                pattern.description.toLowerCase().includes('morning') ||
                pattern.description.toLowerCase().includes('star')
              ).toBe(true)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: technical-indicators, Property 21: 看跌型態訊號
   * Validates: Requirements 9.3
   * 
   * Property: For any identified bearish candlestick pattern, the system should
   * mark it with a sell signal and provide pattern description
   */
  describe('Property 21: Bearish Pattern Signals', () => {
    it('should mark all hanging man patterns with bearish signal and description', () => {
      fc.assert(
        fc.property(
          arbitraryHangingManCandle(),
          (candle) => {
            // Act
            const patterns = service.identifyPatterns([candle])
            
            // Find hanging man patterns
            const hangingManPatterns = patterns.filter(p => p.pattern === 'HANGING_MAN')
            
            // Assert: All hanging man patterns should have bearish signal
            hangingManPatterns.forEach(pattern => {
              expect(pattern.signal).toBe('bearish')
              expect(pattern.description).toBeTruthy()
              expect(pattern.description.length).toBeGreaterThan(0)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should mark all bearish engulfing patterns with bearish signal and description', () => {
      fc.assert(
        fc.property(
          arbitraryBearishEngulfingPattern(),
          (candles) => {
            // Act
            const patterns = service.identifyPatterns(candles)
            
            // Find bearish engulfing patterns
            const engulfingPatterns = patterns.filter(p => p.pattern === 'BEARISH_ENGULFING')
            
            // Assert: All bearish engulfing patterns should have bearish signal
            engulfingPatterns.forEach(pattern => {
              expect(pattern.signal).toBe('bearish')
              expect(pattern.description).toBeTruthy()
              expect(pattern.description.length).toBeGreaterThan(0)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should mark all evening star patterns with bearish signal and description', () => {
      fc.assert(
        fc.property(
          arbitraryEveningStarPattern(),
          (candles) => {
            // Act
            const patterns = service.identifyPatterns(candles)
            
            // Find evening star patterns
            const eveningStarPatterns = patterns.filter(p => p.pattern === 'EVENING_STAR')
            
            // Assert: All evening star patterns should have bearish signal
            eveningStarPatterns.forEach(pattern => {
              expect(pattern.signal).toBe('bearish')
              expect(pattern.description).toBeTruthy()
              expect(pattern.description.length).toBeGreaterThan(0)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should never mark bearish patterns with bullish or neutral signal', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            arbitraryHangingManCandle().map(c => [c]),
            arbitraryBearishEngulfingPattern(),
            arbitraryEveningStarPattern()
          ),
          (candles) => {
            // Act
            const patterns = service.identifyPatterns(candles)
            
            // Define bearish pattern types
            const bearishPatternTypes: PatternType[] = ['HANGING_MAN', 'BEARISH_ENGULFING', 'EVENING_STAR']
            
            // Find all bearish patterns
            const bearishPatterns = patterns.filter(p => bearishPatternTypes.includes(p.pattern))
            
            // Assert: No bearish pattern should have bullish or neutral signal
            bearishPatterns.forEach(pattern => {
              expect(pattern.signal).not.toBe('bullish')
              expect(pattern.signal).not.toBe('neutral')
              expect(pattern.signal).toBe('bearish')
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide non-empty description for all identified bearish patterns', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            arbitraryHangingManCandle().map(c => [c]),
            arbitraryBearishEngulfingPattern(),
            arbitraryEveningStarPattern()
          ),
          (candles) => {
            // Act
            const patterns = service.identifyPatterns(candles)
            
            // Define bearish pattern types
            const bearishPatternTypes: PatternType[] = ['HANGING_MAN', 'BEARISH_ENGULFING', 'EVENING_STAR']
            
            // Find all bearish patterns
            const bearishPatterns = patterns.filter(p => bearishPatternTypes.includes(p.pattern))
            
            // Assert: All bearish patterns should have non-empty description
            bearishPatterns.forEach(pattern => {
              expect(pattern.description).toBeTruthy()
              expect(typeof pattern.description).toBe('string')
              expect(pattern.description.length).toBeGreaterThan(0)
              // Description should mention the pattern or signal
              expect(
                pattern.description.toLowerCase().includes('bearish') ||
                pattern.description.toLowerCase().includes('hanging') ||
                pattern.description.toLowerCase().includes('man') ||
                pattern.description.toLowerCase().includes('engulfing') ||
                pattern.description.toLowerCase().includes('evening') ||
                pattern.description.toLowerCase().includes('star')
              ).toBe(true)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
