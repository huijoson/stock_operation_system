import * as fc from 'fast-check'
import Decimal from 'decimal.js'
import { MACDService } from '@/services/macd.service'

describe('MACD Service - Property-Based Tests', () => {
  let service: MACDService

  beforeEach(() => {
    service = new MACDService()
  })

  // Custom arbitraries for generating test data
  const arbitraryPrice = () => fc.double({ min: 1, max: 1000, noNaN: true })
  
  /**
   * Generate a price sequence that will likely produce a golden cross
   * by creating an uptrend pattern
   */
  const arbitraryPriceSequenceWithUptrend = () => fc.tuple(
    fc.double({ min: 50, max: 100, noNaN: true }), // Starting price
    fc.integer({ min: 40, max: 60 }), // Length of sequence
    fc.double({ min: 0.5, max: 2, noNaN: true }) // Growth rate
  ).map(([startPrice, length, growthRate]) => {
    const prices: number[] = []
    let currentPrice = startPrice
    
    // Create downtrend first (to set up MACD below signal)
    for (let i = 0; i < Math.floor(length / 2); i++) {
      prices.push(currentPrice)
      currentPrice = currentPrice * (1 - 0.01 * Math.random()) // Slight decrease
    }
    
    // Then create uptrend (to trigger golden cross)
    for (let i = Math.floor(length / 2); i < length; i++) {
      prices.push(currentPrice)
      currentPrice = currentPrice * (1 + 0.02 * growthRate * Math.random()) // Increase
    }
    
    return prices
  })

  /**
   * Generate a price sequence that will likely produce a death cross
   * by creating a downtrend pattern
   */
  const arbitraryPriceSequenceWithDowntrend = () => fc.tuple(
    fc.double({ min: 50, max: 100, noNaN: true }), // Starting price
    fc.integer({ min: 40, max: 60 }), // Length of sequence
    fc.double({ min: 0.5, max: 2, noNaN: true }) // Decline rate
  ).map(([startPrice, length, declineRate]) => {
    const prices: number[] = []
    let currentPrice = startPrice
    
    // Create uptrend first (to set up MACD above signal)
    for (let i = 0; i < Math.floor(length / 2); i++) {
      prices.push(currentPrice)
      currentPrice = currentPrice * (1 + 0.01 * Math.random()) // Slight increase
    }
    
    // Then create downtrend (to trigger death cross)
    for (let i = Math.floor(length / 2); i < length; i++) {
      prices.push(currentPrice)
      currentPrice = currentPrice * (1 - 0.02 * declineRate * Math.random()) // Decrease
    }
    
    return prices
  })

  /**
   * Feature: technical-indicators, Property 10: MACD 黃金交叉識別
   * Validates: Requirements 4.2
   * 
   * Property: For any MACD line and signal line sequences, when the MACD line
   * crosses above the signal line from below, the system should identify it as a golden cross
   */
  describe('Property 10: MACD Golden Cross Identification', () => {
    it('should identify golden cross when MACD crosses above signal line', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }), // Number of data points
          fc.double({ min: -10, max: 10, noNaN: true }), // Starting MACD value
          fc.double({ min: -10, max: 10, noNaN: true }), // Starting signal value
          (length, startMACD, startSignal) => {
            // Arrange: Create sequences where MACD crosses above signal
            const macdLine: number[] = []
            const signalLine: number[] = []
            
            // Start with MACD below signal
            let currentMACD = Math.min(startMACD, startSignal) - 1
            let currentSignal = Math.max(startMACD, startSignal)
            
            // Add initial points where MACD is below signal
            macdLine.push(currentMACD)
            signalLine.push(currentSignal)
            
            // Create the crossover: MACD moves above signal
            for (let i = 1; i < length; i++) {
              if (i === Math.floor(length / 2)) {
                // This is where the golden cross happens
                currentMACD = currentSignal + 0.5
              } else if (i > Math.floor(length / 2)) {
                // After crossover, keep MACD above signal
                currentMACD += 0.1
                currentSignal += 0.05
              } else {
                // Before crossover, keep MACD below signal
                currentMACD += 0.05
                currentSignal += 0.1
              }
              
              macdLine.push(currentMACD)
              signalLine.push(currentSignal)
            }

            // Act: Detect crossovers
            const crossovers = service.detectCrossover(macdLine, signalLine)

            // Assert: Should detect at least one golden cross
            const goldenCrosses = crossovers.filter(c => c.type === 'golden')
            expect(goldenCrosses.length).toBeGreaterThan(0)

            // Verify each golden cross is valid
            goldenCrosses.forEach(cross => {
              const prevIndex = cross.index - 1
              const currIndex = cross.index
              
              // Previous: MACD <= Signal
              expect(macdLine[prevIndex]).toBeLessThanOrEqual(signalLine[prevIndex])
              
              // Current: MACD > Signal
              expect(macdLine[currIndex]).toBeGreaterThan(signalLine[currIndex])
              
              // Should have correct properties
              expect(cross.type).toBe('golden')
              expect(cross.description).toContain('bullish')
              expect(cross.macdValue).toBe(macdLine[currIndex])
              expect(cross.signalValue).toBe(signalLine[currIndex])
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should identify golden cross at the exact crossover point', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -10, max: 10, noNaN: true }),
          fc.double({ min: 0.1, max: 5, noNaN: true }),
          (baseValue, crossoverMagnitude) => {
            // Arrange: Create a simple crossover scenario
            // Point 0: MACD below signal
            // Point 1: MACD above signal (golden cross)
            const macdLine = [baseValue - 1, baseValue + crossoverMagnitude]
            const signalLine = [baseValue, baseValue]

            // Act
            const crossovers = service.detectCrossover(macdLine, signalLine)

            // Assert: Should detect exactly one golden cross at index 1
            expect(crossovers).toHaveLength(1)
            expect(crossovers[0].type).toBe('golden')
            expect(crossovers[0].index).toBe(1)
            
            // Verify the crossover conditions
            expect(macdLine[0]).toBeLessThanOrEqual(signalLine[0])
            expect(macdLine[1]).toBeGreaterThan(signalLine[1])
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not identify golden cross when MACD stays above signal', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          fc.double({ min: 1, max: 10, noNaN: true }),
          (length, gap) => {
            // Arrange: Create sequences where MACD is always above signal
            const macdLine: number[] = []
            const signalLine: number[] = []
            
            for (let i = 0; i < length; i++) {
              signalLine.push(i)
              macdLine.push(i + gap) // Always above by 'gap'
            }

            // Act
            const crossovers = service.detectCrossover(macdLine, signalLine)

            // Assert: Should not detect any golden crosses
            const goldenCrosses = crossovers.filter(c => c.type === 'golden')
            expect(goldenCrosses).toHaveLength(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not identify golden cross when MACD stays below signal', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          fc.double({ min: 1, max: 10, noNaN: true }),
          (length, gap) => {
            // Arrange: Create sequences where MACD is always below signal
            const macdLine: number[] = []
            const signalLine: number[] = []
            
            for (let i = 0; i < length; i++) {
              signalLine.push(i)
              macdLine.push(i - gap) // Always below by 'gap'
            }

            // Act
            const crossovers = service.detectCrossover(macdLine, signalLine)

            // Assert: Should not detect any golden crosses
            const goldenCrosses = crossovers.filter(c => c.type === 'golden')
            expect(goldenCrosses).toHaveLength(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should identify multiple golden crosses in a sequence', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }), // Number of crossovers
          (numCrossovers) => {
            // Arrange: Create a sequence with multiple crossovers
            const macdLine: number[] = []
            const signalLine: number[] = []
            
            let currentMACD = 0
            let currentSignal = 1
            
            for (let cross = 0; cross < numCrossovers; cross++) {
              // Add points before crossover (MACD below signal)
              macdLine.push(currentMACD)
              signalLine.push(currentSignal)
              
              // Add crossover point (MACD above signal)
              currentMACD = currentSignal + 1
              macdLine.push(currentMACD)
              signalLine.push(currentSignal)
              
              // Prepare for next cycle (MACD goes back below)
              currentMACD = currentSignal - 1
              currentSignal += 2
            }

            // Act
            const crossovers = service.detectCrossover(macdLine, signalLine)

            // Assert: Should detect the expected number of golden crosses
            const goldenCrosses = crossovers.filter(c => c.type === 'golden')
            expect(goldenCrosses.length).toBeGreaterThanOrEqual(numCrossovers)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case where MACD equals signal then goes above', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -10, max: 10, noNaN: true }),
          fc.double({ min: 0.1, max: 5, noNaN: true }),
          (baseValue, increment) => {
            // Arrange: MACD equals signal, then goes above
            const macdLine = [baseValue, baseValue, baseValue + increment]
            const signalLine = [baseValue, baseValue, baseValue]

            // Act
            const crossovers = service.detectCrossover(macdLine, signalLine)

            // Assert: Should detect golden cross at index 2
            const goldenCrosses = crossovers.filter(c => c.type === 'golden')
            expect(goldenCrosses.length).toBeGreaterThan(0)
            
            // The crossover should be at index 2 (when MACD goes above)
            const lastGoldenCross = goldenCrosses[goldenCrosses.length - 1]
            expect(lastGoldenCross.index).toBe(2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify golden cross in real MACD calculation', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequenceWithUptrend(),
          (prices) => {
            // Skip if insufficient data
            if (prices.length < 35) return true

            // Act: Calculate MACD
            const result = service.calculateMACD(prices)

            // Assert: If golden crosses are detected, verify they are valid
            const goldenCrosses = result.crossovers.filter(c => c.type === 'golden')
            
            goldenCrosses.forEach(cross => {
              const prevIndex = cross.index - 1
              const currIndex = cross.index
              
              // Verify crossover conditions
              expect(result.macdLine[prevIndex]).toBeLessThanOrEqual(result.signalLine[prevIndex])
              expect(result.macdLine[currIndex]).toBeGreaterThan(result.signalLine[currIndex])
              
              // Verify properties
              expect(cross.type).toBe('golden')
              expect(cross.description).toContain('bullish')
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set bullish signal when golden cross occurs recently', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 100, noNaN: true }),
          (startPrice) => {
            // Arrange: Create price sequence with clear uptrend at the end
            const prices: number[] = []
            let price = startPrice
            
            // Downtrend first
            for (let i = 0; i < 20; i++) {
              prices.push(price)
              price *= 0.99
            }
            
            // Strong uptrend to trigger golden cross
            for (let i = 0; i < 20; i++) {
              prices.push(price)
              price *= 1.02
            }

            // Skip if insufficient data
            if (prices.length < 35) return true

            // Act
            const result = service.calculateMACD(prices)

            // Assert: If there's a recent golden cross, signal should be bullish
            const goldenCrosses = result.crossovers.filter(c => c.type === 'golden')
            
            if (goldenCrosses.length > 0) {
              const lastCross = goldenCrosses[goldenCrosses.length - 1]
              const distanceFromEnd = result.macdLine.length - lastCross.index
              
              // If crossover is within last 3 periods, signal should be bullish
              if (distanceFromEnd <= 3) {
                expect(result.currentSignal).toBe('bullish')
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: technical-indicators, Property 12: EMA 公式正確性
   * Validates: Requirements 4.6
   * 
   * Property: For any price sequence and period, the calculated EMA should follow
   * the formula: EMA = Previous EMA × (1 - α) + Current Price × α, where α = 2 / (period + 1)
   */
  describe('Property 12: EMA Formula Correctness', () => {
    it('should calculate EMA following the correct formula', () => {
      fc.assert(
        fc.property(
          fc.array(fc.double({ min: 1, max: 1000, noNaN: true }), { minLength: 10, maxLength: 50 }),
          fc.integer({ min: 3, max: 20 }),
          (prices, period) => {
            // Skip if insufficient data
            if (prices.length < period) return true

            // Act: Calculate EMA using the service
            const emaValues = service.calculateEMA(prices, period)

            // Assert: Verify the formula is followed
            const alpha = 2 / (period + 1)
            
            // First EMA should be SMA of first 'period' prices
            const expectedFirstEMA = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period
            expect(emaValues[0]).toBeCloseTo(expectedFirstEMA, 5)

            // Subsequent EMAs should follow: EMA = Previous EMA × (1 - α) + Current Price × α
            for (let i = 1; i < emaValues.length; i++) {
              const previousEMA = emaValues[i - 1]
              const currentPrice = prices[period - 1 + i]
              const expectedEMA = previousEMA * (1 - alpha) + currentPrice * alpha
              
              expect(emaValues[i]).toBeCloseTo(expectedEMA, 5)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate alpha correctly as 2 / (period + 1)', () => {
      fc.assert(
        fc.property(
          fc.array(fc.double({ min: 10, max: 100, noNaN: true }), { minLength: 20, maxLength: 30 }),
          fc.integer({ min: 5, max: 15 }),
          (prices, period) => {
            // Act: Calculate EMA
            const emaValues = service.calculateEMA(prices, period)

            // Assert: Verify alpha is used correctly by checking the formula
            const alpha = 2 / (period + 1)
            
            // Check second EMA value (first calculated using the formula)
            if (emaValues.length >= 2) {
              const firstEMA = emaValues[0]
              const secondPrice = prices[period]
              const expectedSecondEMA = firstEMA * (1 - alpha) + secondPrice * alpha
              
              expect(emaValues[1]).toBeCloseTo(expectedSecondEMA, 5)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce EMA values that converge towards recent prices', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 100, noNaN: true }),
          fc.double({ min: 150, max: 200, noNaN: true }),
          fc.integer({ min: 5, max: 15 }),
          (lowPrice, highPrice, period) => {
            // Arrange: Create a sequence that jumps from low to high
            const prices: number[] = []
            
            // Start with low prices
            for (let i = 0; i < period + 10; i++) {
              prices.push(lowPrice)
            }
            
            // Jump to high prices
            for (let i = 0; i < 20; i++) {
              prices.push(highPrice)
            }

            // Act: Calculate EMA
            const emaValues = service.calculateEMA(prices, period)

            // Assert: EMA should gradually move from low to high
            // The last EMA should be closer to highPrice than the first EMA
            const firstEMA = emaValues[0]
            const lastEMA = emaValues[emaValues.length - 1]
            
            expect(firstEMA).toBeCloseTo(lowPrice, 1)
            expect(lastEMA).toBeGreaterThan(firstEMA)
            expect(lastEMA).toBeLessThanOrEqual(highPrice)
            
            // EMA should be monotonically increasing after the jump
            const jumpIndex = period + 10 - period + 1 // Index where jump occurs in EMA array
            for (let i = jumpIndex + 1; i < emaValues.length; i++) {
              expect(emaValues[i]).toBeGreaterThanOrEqual(emaValues[i - 1])
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should give more weight to recent prices with smaller periods', () => {
      fc.assert(
        fc.property(
          fc.array(fc.double({ min: 50, max: 100, noNaN: true }), { minLength: 30, maxLength: 40 }),
          fc.double({ min: 150, max: 200, noNaN: true }),
          (basePrices, spike) => {
            // Arrange: Add a price spike at the end
            const prices = [...basePrices, spike]
            
            const shortPeriod = 5
            const longPeriod = 20

            // Act: Calculate EMAs with different periods
            const shortEMA = service.calculateEMA(prices, shortPeriod)
            const longEMA = service.calculateEMA(prices, longPeriod)

            // Assert: Short period EMA should react more to the spike
            const shortLastEMA = shortEMA[shortEMA.length - 1]
            const longLastEMA = longEMA[longEMA.length - 1]
            
            // Short EMA should be closer to the spike than long EMA
            const shortDistance = Math.abs(spike - shortLastEMA)
            const longDistance = Math.abs(spike - longLastEMA)
            
            expect(shortDistance).toBeLessThan(longDistance)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle constant prices correctly', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 1000, noNaN: true }),
          fc.integer({ min: 3, max: 20 }),
          fc.integer({ min: 10, max: 30 }),
          (constantPrice, period, length) => {
            // Arrange: Create array of constant prices
            const prices = Array(length).fill(constantPrice)

            // Skip if insufficient data
            if (prices.length < period) return true

            // Act: Calculate EMA
            const emaValues = service.calculateEMA(prices, period)

            // Assert: All EMA values should equal the constant price
            emaValues.forEach(ema => {
              expect(ema).toBeCloseTo(constantPrice, 5)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should use Decimal for high precision calculations', () => {
      fc.assert(
        fc.property(
          fc.array(fc.double({ min: 0.0001, max: 0.001, noNaN: true }), { minLength: 15, maxLength: 25 }),
          fc.integer({ min: 5, max: 10 }),
          (smallPrices, period) => {
            // Act: Calculate EMA with very small prices
            const emaValues = service.calculateEMA(smallPrices, period)

            // Assert: Should handle small numbers without precision loss
            // All EMA values should be positive and reasonable
            emaValues.forEach(ema => {
              expect(ema).toBeGreaterThan(0)
              expect(ema).toBeLessThan(0.01)
              expect(Number.isFinite(ema)).toBe(true)
            })

            // Verify the formula still holds with small numbers
            const alpha = 2 / (period + 1)
            for (let i = 1; i < emaValues.length; i++) {
              const previousEMA = emaValues[i - 1]
              const currentPrice = smallPrices[period - 1 + i]
              const expectedEMA = previousEMA * (1 - alpha) + currentPrice * alpha
              
              expect(emaValues[i]).toBeCloseTo(expectedEMA, 10)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce EMA array with correct length', () => {
      fc.assert(
        fc.property(
          fc.array(fc.double({ min: 1, max: 100, noNaN: true }), { minLength: 10, maxLength: 50 }),
          fc.integer({ min: 3, max: 15 }),
          (prices, period) => {
            // Skip if insufficient data
            if (prices.length < period) return true

            // Act: Calculate EMA
            const emaValues = service.calculateEMA(prices, period)

            // Assert: Length should be prices.length - period + 1
            const expectedLength = prices.length - period + 1
            expect(emaValues.length).toBe(expectedLength)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle linearly increasing prices', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 50, noNaN: true }),
          fc.double({ min: 0.1, max: 2, noNaN: true }),
          fc.integer({ min: 5, max: 15 }),
          fc.integer({ min: 20, max: 40 }),
          (startPrice, increment, period, length) => {
            // Arrange: Create linearly increasing prices
            const prices: number[] = []
            for (let i = 0; i < length; i++) {
              prices.push(startPrice + i * increment)
            }

            // Act: Calculate EMA
            const emaValues = service.calculateEMA(prices, period)

            // Assert: EMA should also be increasing
            for (let i = 1; i < emaValues.length; i++) {
              expect(emaValues[i]).toBeGreaterThanOrEqual(emaValues[i - 1])
            }

            // Verify formula
            const alpha = 2 / (period + 1)
            for (let i = 1; i < emaValues.length; i++) {
              const previousEMA = emaValues[i - 1]
              const currentPrice = prices[period - 1 + i]
              const expectedEMA = previousEMA * (1 - alpha) + currentPrice * alpha
              
              expect(emaValues[i]).toBeCloseTo(expectedEMA, 5)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should throw error for insufficient data', () => {
      fc.assert(
        fc.property(
          fc.array(fc.double({ min: 1, max: 100, noNaN: true }), { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 10, max: 20 }),
          (prices, period) => {
            // Arrange: Ensure prices.length < period
            if (prices.length >= period) return true

            // Act & Assert: Should throw error
            expect(() => service.calculateEMA(prices, period)).toThrow('Insufficient data')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: technical-indicators, Property 11: MACD 死亡交叉識別
   * Validates: Requirements 4.3
   * 
   * Property: For any MACD line and signal line sequences, when the MACD line
   * crosses below the signal line from above, the system should identify it as a death cross
   */
  describe('Property 11: MACD Death Cross Identification', () => {
    it('should identify death cross when MACD crosses below signal line', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }), // Number of data points
          fc.double({ min: -10, max: 10, noNaN: true }), // Starting MACD value
          fc.double({ min: -10, max: 10, noNaN: true }), // Starting signal value
          (length, startMACD, startSignal) => {
            // Arrange: Create sequences where MACD crosses below signal
            const macdLine: number[] = []
            const signalLine: number[] = []
            
            // Start with MACD above signal
            let currentMACD = Math.max(startMACD, startSignal) + 1
            let currentSignal = Math.min(startMACD, startSignal)
            
            // Add initial points where MACD is above signal
            macdLine.push(currentMACD)
            signalLine.push(currentSignal)
            
            // Create the crossover: MACD moves below signal
            for (let i = 1; i < length; i++) {
              if (i === Math.floor(length / 2)) {
                // This is where the death cross happens
                currentMACD = currentSignal - 0.5
              } else if (i > Math.floor(length / 2)) {
                // After crossover, keep MACD below signal
                currentMACD -= 0.1
                currentSignal -= 0.05
              } else {
                // Before crossover, keep MACD above signal
                currentMACD += 0.1
                currentSignal += 0.05
              }
              
              macdLine.push(currentMACD)
              signalLine.push(currentSignal)
            }

            // Act: Detect crossovers
            const crossovers = service.detectCrossover(macdLine, signalLine)

            // Assert: Should detect at least one death cross
            const deathCrosses = crossovers.filter(c => c.type === 'death')
            expect(deathCrosses.length).toBeGreaterThan(0)

            // Verify each death cross is valid
            deathCrosses.forEach(cross => {
              const prevIndex = cross.index - 1
              const currIndex = cross.index
              
              // Previous: MACD >= Signal
              expect(macdLine[prevIndex]).toBeGreaterThanOrEqual(signalLine[prevIndex])
              
              // Current: MACD < Signal
              expect(macdLine[currIndex]).toBeLessThan(signalLine[currIndex])
              
              // Should have correct properties
              expect(cross.type).toBe('death')
              expect(cross.description).toContain('bearish')
              expect(cross.macdValue).toBe(macdLine[currIndex])
              expect(cross.signalValue).toBe(signalLine[currIndex])
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should identify death cross at the exact crossover point', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -10, max: 10, noNaN: true }),
          fc.double({ min: 0.1, max: 5, noNaN: true }),
          (baseValue, crossoverMagnitude) => {
            // Arrange: Create a simple crossover scenario
            // Point 0: MACD above signal
            // Point 1: MACD below signal (death cross)
            const macdLine = [baseValue + 1, baseValue - crossoverMagnitude]
            const signalLine = [baseValue, baseValue]

            // Act
            const crossovers = service.detectCrossover(macdLine, signalLine)

            // Assert: Should detect exactly one death cross at index 1
            expect(crossovers).toHaveLength(1)
            expect(crossovers[0].type).toBe('death')
            expect(crossovers[0].index).toBe(1)
            
            // Verify the crossover conditions
            expect(macdLine[0]).toBeGreaterThanOrEqual(signalLine[0])
            expect(macdLine[1]).toBeLessThan(signalLine[1])
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not identify death cross when MACD stays below signal', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          fc.double({ min: 1, max: 10, noNaN: true }),
          (length, gap) => {
            // Arrange: Create sequences where MACD is always below signal
            const macdLine: number[] = []
            const signalLine: number[] = []
            
            for (let i = 0; i < length; i++) {
              signalLine.push(i)
              macdLine.push(i - gap) // Always below by 'gap'
            }

            // Act
            const crossovers = service.detectCrossover(macdLine, signalLine)

            // Assert: Should not detect any death crosses
            const deathCrosses = crossovers.filter(c => c.type === 'death')
            expect(deathCrosses).toHaveLength(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not identify death cross when MACD stays above signal', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          fc.double({ min: 1, max: 10, noNaN: true }),
          (length, gap) => {
            // Arrange: Create sequences where MACD is always above signal
            const macdLine: number[] = []
            const signalLine: number[] = []
            
            for (let i = 0; i < length; i++) {
              signalLine.push(i)
              macdLine.push(i + gap) // Always above by 'gap'
            }

            // Act
            const crossovers = service.detectCrossover(macdLine, signalLine)

            // Assert: Should not detect any death crosses
            const deathCrosses = crossovers.filter(c => c.type === 'death')
            expect(deathCrosses).toHaveLength(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should identify multiple death crosses in a sequence', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }), // Number of crossovers
          (numCrossovers) => {
            // Arrange: Create a sequence with multiple crossovers
            const macdLine: number[] = []
            const signalLine: number[] = []
            
            let currentMACD = 1
            let currentSignal = 0
            
            for (let cross = 0; cross < numCrossovers; cross++) {
              // Add points before crossover (MACD above signal)
              macdLine.push(currentMACD)
              signalLine.push(currentSignal)
              
              // Add crossover point (MACD below signal)
              currentMACD = currentSignal - 1
              macdLine.push(currentMACD)
              signalLine.push(currentSignal)
              
              // Add a point to maintain MACD below signal
              macdLine.push(currentMACD - 0.5)
              signalLine.push(currentSignal)
              
              // Prepare for next cycle (MACD goes back above)
              currentSignal += 2
              currentMACD = currentSignal + 1
            }

            // Act
            const crossovers = service.detectCrossover(macdLine, signalLine)

            // Assert: Should detect the expected number of death crosses
            const deathCrosses = crossovers.filter(c => c.type === 'death')
            expect(deathCrosses.length).toBe(numCrossovers)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case where MACD equals signal then goes below', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -10, max: 10, noNaN: true }),
          fc.double({ min: 0.1, max: 5, noNaN: true }),
          (baseValue, decrement) => {
            // Arrange: MACD equals signal, then goes below
            const macdLine = [baseValue, baseValue, baseValue - decrement]
            const signalLine = [baseValue, baseValue, baseValue]

            // Act
            const crossovers = service.detectCrossover(macdLine, signalLine)

            // Assert: Should detect death cross at index 2
            const deathCrosses = crossovers.filter(c => c.type === 'death')
            expect(deathCrosses.length).toBeGreaterThan(0)
            
            // The crossover should be at index 2 (when MACD goes below)
            const lastDeathCross = deathCrosses[deathCrosses.length - 1]
            expect(lastDeathCross.index).toBe(2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify death cross in real MACD calculation', () => {
      fc.assert(
        fc.property(
          arbitraryPriceSequenceWithDowntrend(),
          (prices) => {
            // Skip if insufficient data
            if (prices.length < 35) return true

            // Act: Calculate MACD
            const result = service.calculateMACD(prices)

            // Assert: If death crosses are detected, verify they are valid
            const deathCrosses = result.crossovers.filter(c => c.type === 'death')
            
            deathCrosses.forEach(cross => {
              const prevIndex = cross.index - 1
              const currIndex = cross.index
              
              // Verify crossover conditions
              expect(result.macdLine[prevIndex]).toBeGreaterThanOrEqual(result.signalLine[prevIndex])
              expect(result.macdLine[currIndex]).toBeLessThan(result.signalLine[currIndex])
              
              // Verify properties
              expect(cross.type).toBe('death')
              expect(cross.description).toContain('bearish')
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set bearish signal when death cross occurs recently', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 100, noNaN: true }),
          (startPrice) => {
            // Arrange: Create price sequence with clear downtrend at the end
            const prices: number[] = []
            let price = startPrice
            
            // Uptrend first
            for (let i = 0; i < 20; i++) {
              prices.push(price)
              price *= 1.01
            }
            
            // Strong downtrend to trigger death cross
            for (let i = 0; i < 20; i++) {
              prices.push(price)
              price *= 0.98
            }

            // Skip if insufficient data
            if (prices.length < 35) return true

            // Act
            const result = service.calculateMACD(prices)

            // Assert: If there's a recent death cross, signal should be bearish
            const deathCrosses = result.crossovers.filter(c => c.type === 'death')
            
            if (deathCrosses.length > 0) {
              const lastCross = deathCrosses[deathCrosses.length - 1]
              const distanceFromEnd = result.macdLine.length - lastCross.index
              
              // If crossover is within last 3 periods, signal should be bearish
              if (distanceFromEnd <= 3) {
                expect(result.currentSignal).toBe('bearish')
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should distinguish between golden and death crosses in same sequence', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }), // Number of each type
          (numEach) => {
            // Arrange: Create alternating golden and death crosses
            const macdLine: number[] = []
            const signalLine: number[] = []
            
            let currentMACD = 0
            let currentSignal = 1
            
            for (let i = 0; i < numEach; i++) {
              // Golden cross: MACD crosses above
              macdLine.push(currentMACD)
              signalLine.push(currentSignal)
              currentMACD = currentSignal + 1
              macdLine.push(currentMACD)
              signalLine.push(currentSignal)
              
              // Death cross: MACD crosses below
              currentMACD = currentSignal - 1
              macdLine.push(currentMACD)
              signalLine.push(currentSignal)
              
              // Prepare for next iteration
              currentSignal += 2
              currentMACD = currentSignal - 1
            }

            // Act
            const crossovers = service.detectCrossover(macdLine, signalLine)

            // Assert: Should have both types
            const goldenCrosses = crossovers.filter(c => c.type === 'golden')
            const deathCrosses = crossovers.filter(c => c.type === 'death')
            
            expect(goldenCrosses.length).toBeGreaterThan(0)
            expect(deathCrosses.length).toBeGreaterThan(0)
            
            // Verify all crossovers are correctly typed
            crossovers.forEach(cross => {
              const prevIndex = cross.index - 1
              const currIndex = cross.index
              
              if (cross.type === 'golden') {
                expect(macdLine[prevIndex]).toBeLessThanOrEqual(signalLine[prevIndex])
                expect(macdLine[currIndex]).toBeGreaterThan(signalLine[currIndex])
              } else {
                expect(macdLine[prevIndex]).toBeGreaterThanOrEqual(signalLine[prevIndex])
                expect(macdLine[currIndex]).toBeLessThan(signalLine[currIndex])
              }
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
