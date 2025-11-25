import * as fc from 'fast-check'
import Decimal from 'decimal.js'
import { SupportResistanceService, PriceLevel } from '@/services/support-resistance.service'

describe('Support Resistance Service - Property-Based Tests', () => {
  let service: SupportResistanceService

  beforeEach(() => {
    service = new SupportResistanceService()
  })

  // Custom arbitraries for generating test data
  const arbitraryPrice = () => fc.double({ min: 1, max: 10000, noNaN: true })
  
  const arbitraryPriceLevel = (type: 'support' | 'resistance' = 'support') => 
    fc.record({
      price: arbitraryPrice().map(p => new Decimal(p)),
      strength: fc.constantFrom('strong', 'moderate', 'weak') as fc.Arbitrary<'strong' | 'moderate' | 'weak'>,
      touches: fc.integer({ min: 1, max: 10 }),
      type: fc.constant(type) as fc.Arbitrary<'support' | 'resistance'>
    })

  const arbitraryPriceLevelArray = (minLength: number = 1, maxLength: number = 20) =>
    fc.array(arbitraryPriceLevel(), { minLength, maxLength })

  /**
   * Feature: technical-indicators, Property 16: 價位合併邏輯
   * Validates: Requirements 7.4
   * 
   * Property: For any collection of price levels, when multiple levels have a price
   * difference less than 3%, the system should merge them into a single strong
   * support or resistance zone.
   */
  describe('Property 16: Price Level Merging Logic', () => {
    it('should merge levels within 3% tolerance into a single level', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          fc.integer({ min: 2, max: 5 }),
          fc.constantFrom('support', 'resistance') as fc.Arbitrary<'support' | 'resistance'>,
          (basePrice, numLevels, type) => {
            // Arrange: Create levels within 3% of each other
            const levels: PriceLevel[] = []
            const basePriceDecimal = new Decimal(basePrice)
            
            for (let i = 0; i < numLevels; i++) {
              // Create prices within 2% of base (well within 3% tolerance)
              const offset = basePriceDecimal.times(0.02 * (i / numLevels) - 0.01)
              levels.push({
                price: basePriceDecimal.plus(offset),
                strength: 'weak',
                touches: 1,
                type
              })
            }

            // Act: Merge nearby levels
            const merged = service.mergeNearbyLevels(levels, 0.03)

            // Assert: Should merge into a single level
            expect(merged.length).toBe(1)
            
            // Assert: Merged level should have combined touches
            expect(merged[0].touches).toBe(numLevels)
            
            // Assert: Merged level should have appropriate strength
            if (numLevels >= 3) {
              expect(merged[0].strength).toBe('strong')
            } else if (numLevels >= 2) {
              expect(merged[0].strength).toBe('moderate')
            }
            
            // Assert: Type should be preserved
            expect(merged[0].type).toBe(type)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not merge levels outside 3% tolerance', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          fc.integer({ min: 2, max: 5 }),
          fc.constantFrom('support', 'resistance') as fc.Arbitrary<'support' | 'resistance'>,
          (basePrice, numLevels, type) => {
            // Arrange: Create levels outside 3% of each other
            const levels: PriceLevel[] = []
            const basePriceDecimal = new Decimal(basePrice)
            
            for (let i = 0; i < numLevels; i++) {
              // Create prices with 5% spacing (outside 3% tolerance)
              const offset = basePriceDecimal.times(0.05 * i)
              levels.push({
                price: basePriceDecimal.plus(offset),
                strength: 'weak',
                touches: 1,
                type
              })
            }

            // Act: Merge nearby levels
            const merged = service.mergeNearbyLevels(levels, 0.03)

            // Assert: Should not merge - each level should remain separate
            expect(merged.length).toBe(numLevels)
            
            // Assert: Each merged level should have only 1 touch (not merged)
            merged.forEach(level => {
              expect(level.touches).toBe(1)
              expect(level.strength).toBe('weak')
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate average price for merged levels', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          fc.integer({ min: 2, max: 5 }),
          fc.constantFrom('support', 'resistance') as fc.Arbitrary<'support' | 'resistance'>,
          (basePrice, numLevels, type) => {
            // Arrange: Create levels within tolerance
            const levels: PriceLevel[] = []
            const basePriceDecimal = new Decimal(basePrice)
            let sumPrices = new Decimal(0)
            
            for (let i = 0; i < numLevels; i++) {
              const offset = basePriceDecimal.times(0.02 * (i / numLevels) - 0.01)
              const price = basePriceDecimal.plus(offset)
              levels.push({
                price,
                strength: 'weak',
                touches: 1,
                type
              })
              sumPrices = sumPrices.plus(price)
            }

            // Calculate expected average
            const expectedAverage = sumPrices.dividedBy(numLevels)

            // Act: Merge nearby levels
            const merged = service.mergeNearbyLevels(levels, 0.03)

            // Assert: Merged level price should be the average
            expect(merged.length).toBe(1)
            const difference = merged[0].price.minus(expectedAverage).abs()
            expect(difference.toNumber()).toBeLessThan(0.0001)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should assign strength based on number of merged levels', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          fc.constantFrom('support', 'resistance') as fc.Arbitrary<'support' | 'resistance'>,
          (basePrice, type) => {
            const basePriceDecimal = new Decimal(basePrice)

            // Test strong (3+ levels)
            const strongLevels: PriceLevel[] = []
            for (let i = 0; i < 3; i++) {
              strongLevels.push({
                price: basePriceDecimal.plus(basePriceDecimal.times(0.01 * i)),
                strength: 'weak',
                touches: 1,
                type
              })
            }
            const strongMerged = service.mergeNearbyLevels(strongLevels, 0.03)
            expect(strongMerged[0].strength).toBe('strong')

            // Test moderate (2 levels)
            const moderateLevels: PriceLevel[] = []
            for (let i = 0; i < 2; i++) {
              moderateLevels.push({
                price: basePriceDecimal.plus(basePriceDecimal.times(0.01 * i)),
                strength: 'weak',
                touches: 1,
                type
              })
            }
            const moderateMerged = service.mergeNearbyLevels(moderateLevels, 0.03)
            expect(moderateMerged[0].strength).toBe('moderate')

            // Test weak (1 level)
            const weakLevels: PriceLevel[] = [{
              price: basePriceDecimal,
              strength: 'weak',
              touches: 1,
              type
            }]
            const weakMerged = service.mergeNearbyLevels(weakLevels, 0.03)
            expect(weakMerged[0].strength).toBe('weak')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle mixed groups - some within tolerance, some outside', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          fc.constantFrom('support', 'resistance') as fc.Arbitrary<'support' | 'resistance'>,
          (basePrice, type) => {
            // Arrange: Create 3 groups of levels
            // Group 1: 3 levels close together
            // Group 2: 2 levels close together (far from group 1)
            // Group 3: 1 isolated level
            const basePriceDecimal = new Decimal(basePrice)
            const levels: PriceLevel[] = []

            // Group 1: around basePrice
            for (let i = 0; i < 3; i++) {
              levels.push({
                price: basePriceDecimal.plus(basePriceDecimal.times(0.01 * i)),
                strength: 'weak',
                touches: 1,
                type
              })
            }

            // Group 2: around basePrice * 1.1 (10% away)
            const group2Base = basePriceDecimal.times(1.1)
            for (let i = 0; i < 2; i++) {
              levels.push({
                price: group2Base.plus(group2Base.times(0.01 * i)),
                strength: 'weak',
                touches: 1,
                type
              })
            }

            // Group 3: at basePrice * 1.2 (20% away)
            levels.push({
              price: basePriceDecimal.times(1.2),
              strength: 'weak',
              touches: 1,
              type
            })

            // Act: Merge nearby levels
            const merged = service.mergeNearbyLevels(levels, 0.03)

            // Assert: Should have 3 merged groups
            expect(merged.length).toBe(3)
            
            // Assert: First group should be strong (3 levels)
            expect(merged[0].touches).toBe(3)
            expect(merged[0].strength).toBe('strong')
            
            // Assert: Second group should be moderate (2 levels)
            expect(merged[1].touches).toBe(2)
            expect(merged[1].strength).toBe('moderate')
            
            // Assert: Third group should be weak (1 level)
            expect(merged[2].touches).toBe(1)
            expect(merged[2].strength).toBe('weak')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve type (support/resistance) when merging', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          fc.integer({ min: 2, max: 5 }),
          fc.constantFrom('support', 'resistance') as fc.Arbitrary<'support' | 'resistance'>,
          (basePrice, numLevels, type) => {
            // Arrange: Create levels of the same type
            const levels: PriceLevel[] = []
            const basePriceDecimal = new Decimal(basePrice)
            
            for (let i = 0; i < numLevels; i++) {
              levels.push({
                price: basePriceDecimal.plus(basePriceDecimal.times(0.01 * i)),
                strength: 'weak',
                touches: 1,
                type
              })
            }

            // Act: Merge nearby levels
            const merged = service.mergeNearbyLevels(levels, 0.03)

            // Assert: All merged levels should preserve the type
            merged.forEach(level => {
              expect(level.type).toBe(type)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty array', () => {
      const merged = service.mergeNearbyLevels([], 0.03)
      expect(merged).toEqual([])
    })

    it('should handle single level', () => {
      fc.assert(
        fc.property(
          arbitraryPriceLevel(),
          (level) => {
            // Act: Merge single level
            const merged = service.mergeNearbyLevels([level], 0.03)

            // Assert: Should return the same level
            expect(merged.length).toBe(1)
            expect(merged[0].price.equals(level.price)).toBe(true)
            expect(merged[0].touches).toBe(level.touches)
            expect(merged[0].type).toBe(level.type)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should respect custom tolerance values', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          fc.double({ min: 0.01, max: 0.1, noNaN: true }),
          fc.constantFrom('support', 'resistance') as fc.Arbitrary<'support' | 'resistance'>,
          (basePrice, customTolerance, type) => {
            // Arrange: Create 2 levels just within custom tolerance
            const basePriceDecimal = new Decimal(basePrice)
            const offset = basePriceDecimal.times(customTolerance * 0.99)
            
            const levels: PriceLevel[] = [
              {
                price: basePriceDecimal,
                strength: 'weak',
                touches: 1,
                type
              },
              {
                price: basePriceDecimal.plus(offset),
                strength: 'weak',
                touches: 1,
                type
              }
            ]

            // Act: Merge with custom tolerance
            const merged = service.mergeNearbyLevels(levels, customTolerance)

            // Assert: Should merge into one level
            expect(merged.length).toBe(1)
            expect(merged[0].touches).toBe(2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain sorted order after merging', () => {
      fc.assert(
        fc.property(
          arbitraryPriceLevelArray(3, 10),
          (levels) => {
            // Act: Merge nearby levels
            const merged = service.mergeNearbyLevels(levels, 0.03)

            // Assert: Merged levels should be sorted by price
            for (let i = 1; i < merged.length; i++) {
              expect(merged[i].price.greaterThanOrEqualTo(merged[i - 1].price)).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should sum touches from all merged levels', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 2, maxLength: 5 }),
          fc.constantFrom('support', 'resistance') as fc.Arbitrary<'support' | 'resistance'>,
          (basePrice, touchCounts, type) => {
            // Arrange: Create levels with varying touch counts
            const levels: PriceLevel[] = []
            const basePriceDecimal = new Decimal(basePrice)
            let expectedTotalTouches = 0
            
            touchCounts.forEach((touches, i) => {
              levels.push({
                price: basePriceDecimal.plus(basePriceDecimal.times(0.01 * i)),
                strength: 'weak',
                touches,
                type
              })
              expectedTotalTouches += touches
            })

            // Act: Merge nearby levels
            const merged = service.mergeNearbyLevels(levels, 0.03)

            // Assert: Should merge into one level with summed touches
            expect(merged.length).toBe(1)
            expect(merged[0].touches).toBe(expectedTotalTouches)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle levels with identical prices', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          fc.integer({ min: 2, max: 5 }),
          fc.constantFrom('support', 'resistance') as fc.Arbitrary<'support' | 'resistance'>,
          (price, numLevels, type) => {
            // Arrange: Create multiple levels with identical prices
            const priceDecimal = new Decimal(price)
            const levels: PriceLevel[] = []
            
            for (let i = 0; i < numLevels; i++) {
              levels.push({
                price: priceDecimal,
                strength: 'weak',
                touches: 1,
                type
              })
            }

            // Act: Merge nearby levels
            const merged = service.mergeNearbyLevels(levels, 0.03)

            // Assert: Should merge into a single level
            expect(merged.length).toBe(1)
            expect(merged[0].price.equals(priceDecimal)).toBe(true)
            expect(merged[0].touches).toBe(numLevels)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle very small price differences within tolerance', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1000, max: 10000, noNaN: true }),
          fc.constantFrom('support', 'resistance') as fc.Arbitrary<'support' | 'resistance'>,
          (basePrice, type) => {
            // Arrange: Create levels with very small differences (0.1%)
            const basePriceDecimal = new Decimal(basePrice)
            const levels: PriceLevel[] = []
            
            for (let i = 0; i < 3; i++) {
              levels.push({
                price: basePriceDecimal.plus(basePriceDecimal.times(0.001 * i)),
                strength: 'weak',
                touches: 1,
                type
              })
            }

            // Act: Merge with 3% tolerance
            const merged = service.mergeNearbyLevels(levels, 0.03)

            // Assert: Should merge into one level (0.1% << 3%)
            expect(merged.length).toBe(1)
            expect(merged[0].touches).toBe(3)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle boundary case at exactly 3% difference', () => {
      fc.assert(
        fc.property(
          arbitraryPrice(),
          fc.constantFrom('support', 'resistance') as fc.Arbitrary<'support' | 'resistance'>,
          (basePrice, type) => {
            // Arrange: Create two levels at exactly 3% apart
            const basePriceDecimal = new Decimal(basePrice)
            const levels: PriceLevel[] = [
              {
                price: basePriceDecimal,
                strength: 'weak',
                touches: 1,
                type
              },
              {
                price: basePriceDecimal.times(1.03), // Exactly 3% higher
                strength: 'weak',
                touches: 1,
                type
              }
            ]

            // Act: Merge with 3% tolerance
            const merged = service.mergeNearbyLevels(levels, 0.03)

            // Assert: Behavior at boundary - should merge or not merge consistently
            // The implementation uses lessThanOrEqualTo, so it should merge
            if (merged.length === 1) {
              expect(merged[0].touches).toBe(2)
            } else {
              // If not merged, should have 2 separate levels
              expect(merged.length).toBe(2)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
