import Decimal from 'decimal.js'

/**
 * Price level with strength indicator
 */
export interface PriceLevel {
  price: Decimal
  strength: 'strong' | 'moderate' | 'weak'
  touches: number
  type: 'support' | 'resistance'
}

/**
 * Golden ratio levels based on Fibonacci ratios
 */
export interface GoldenRatioLevels {
  levels: Array<{
    ratio: number
    price: Decimal
    label: string
  }>
}

/**
 * Support and resistance levels result
 */
export interface SupportResistanceLevels {
  supports: PriceLevel[]
  resistances: PriceLevel[]
  currentNearestSupport: PriceLevel | null
  currentNearestResistance: PriceLevel | null
}

/**
 * SupportResistanceService calculates support and resistance levels
 * using historical price data and golden ratio (Fibonacci) principles.
 */
export class SupportResistanceService {
  private readonly GOLDEN_RATIOS = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0]
  private readonly DEFAULT_LOOKBACK_PERIODS = [30, 60, 90]

  /**
   * Calculate support and resistance levels based on historical highs and lows
   * 
   * @param prices - Array of price values
   * @param lookbackPeriods - Periods to look back for highs/lows (default: [30, 60, 90])
   * @param currentPrice - Current price for determining nearest levels
   * @returns Support and resistance levels
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   */
  calculateLevels(
    prices: Decimal.Value[],
    lookbackPeriods: number[] = this.DEFAULT_LOOKBACK_PERIODS,
    currentPrice?: Decimal.Value
  ): SupportResistanceLevels {
    if (prices.length < Math.min(...lookbackPeriods)) {
      throw new Error(`Insufficient data: need at least ${Math.min(...lookbackPeriods)} prices`)
    }

    const priceDecimals = prices.map(p => new Decimal(p))
    const allSupports: PriceLevel[] = []
    const allResistances: PriceLevel[] = []

    // Calculate levels for each lookback period
    for (const period of lookbackPeriods) {
      if (prices.length >= period) {
        const recentPrices = priceDecimals.slice(-period)
        
        // Find local highs and lows
        const high = Decimal.max(...recentPrices)
        const low = Decimal.min(...recentPrices)

        // Add resistance at high
        allResistances.push({
          price: high,
          strength: 'moderate',
          touches: 1,
          type: 'resistance'
        })

        // Add support at low
        allSupports.push({
          price: low,
          strength: 'moderate',
          touches: 1,
          type: 'support'
        })

        // Calculate golden ratio levels between high and low
        const goldenLevels = this.findGoldenRatioLevels(high, low)
        
        // Add golden ratio levels as support/resistance
        goldenLevels.levels.forEach(level => {
          if (level.ratio < 0.5) {
            // Lower levels are support
            allSupports.push({
              price: level.price,
              strength: 'weak',
              touches: 1,
              type: 'support'
            })
          } else if (level.ratio > 0.5) {
            // Upper levels are resistance
            allResistances.push({
              price: level.price,
              strength: 'weak',
              touches: 1,
              type: 'resistance'
            })
          }
        })
      }
    }

    // Merge nearby levels
    const mergedSupports = this.mergeNearbyLevels(allSupports, 0.03)
    const mergedResistances = this.mergeNearbyLevels(allResistances, 0.03)

    // Find nearest support and resistance to current price
    let currentNearestSupport: PriceLevel | null = null
    let currentNearestResistance: PriceLevel | null = null

    if (currentPrice !== undefined) {
      const current = new Decimal(currentPrice)
      
      // Find nearest support below current price
      const supportsBelow = mergedSupports.filter(s => s.price.lessThan(current))
      if (supportsBelow.length > 0) {
        currentNearestSupport = supportsBelow.reduce((nearest, level) => 
          level.price.greaterThan(nearest.price) ? level : nearest
        )
      }

      // Find nearest resistance above current price
      const resistancesAbove = mergedResistances.filter(r => r.price.greaterThan(current))
      if (resistancesAbove.length > 0) {
        currentNearestResistance = resistancesAbove.reduce((nearest, level) => 
          level.price.lessThan(nearest.price) ? level : nearest
        )
      }
    }

    return {
      supports: mergedSupports.sort((a, b) => b.price.comparedTo(a.price)), // Sort descending
      resistances: mergedResistances.sort((a, b) => a.price.comparedTo(b.price)), // Sort ascending
      currentNearestSupport,
      currentNearestResistance
    }
  }

  /**
   * Calculate golden ratio levels between high and low prices
   * 
   * @param high - High price
   * @param low - Low price
   * @returns Golden ratio levels
   * 
   * Requirements: 7.2
   */
  findGoldenRatioLevels(high: Decimal.Value, low: Decimal.Value): GoldenRatioLevels {
    const highDecimal = new Decimal(high)
    const lowDecimal = new Decimal(low)
    const range = highDecimal.minus(lowDecimal)

    const levels = this.GOLDEN_RATIOS.map(ratio => ({
      ratio,
      price: lowDecimal.plus(range.times(ratio)),
      label: `${(ratio * 100).toFixed(1)}%`
    }))

    return { levels }
  }

  /**
   * Merge nearby price levels to identify strong support/resistance zones
   * 
   * When multiple levels are within a certain tolerance (e.g., 3% of each other),
   * they are merged into a single stronger level.
   * 
   * @param levels - Array of price levels
   * @param tolerance - Tolerance as a decimal (e.g., 0.03 for 3%)
   * @returns Merged price levels
   * 
   * Requirements: 7.4
   */
  mergeNearbyLevels(levels: PriceLevel[], tolerance: number): PriceLevel[] {
    if (levels.length === 0) return []

    // Sort levels by price
    const sortedLevels = [...levels].sort((a, b) => a.price.comparedTo(b.price))
    const merged: PriceLevel[] = []
    let currentGroup: PriceLevel[] = [sortedLevels[0]]

    for (let i = 1; i < sortedLevels.length; i++) {
      const currentLevel = sortedLevels[i]
      const groupAvgPrice = currentGroup.reduce((sum, l) => sum.plus(l.price), new Decimal(0))
        .dividedBy(currentGroup.length)

      // Check if current level is within tolerance of group average
      const priceDiff = currentLevel.price.minus(groupAvgPrice).abs()
      const toleranceAmount = groupAvgPrice.times(tolerance)

      if (priceDiff.lessThanOrEqualTo(toleranceAmount)) {
        // Add to current group
        currentGroup.push(currentLevel)
      } else {
        // Merge current group and start new group
        merged.push(this.mergeLevelGroup(currentGroup))
        currentGroup = [currentLevel]
      }
    }

    // Merge last group
    if (currentGroup.length > 0) {
      merged.push(this.mergeLevelGroup(currentGroup))
    }

    return merged
  }

  /**
   * Merge a group of price levels into a single level
   * 
   * @param group - Group of price levels to merge
   * @returns Merged price level
   */
  private mergeLevelGroup(group: PriceLevel[]): PriceLevel {
    // Calculate average price
    const avgPrice = group.reduce((sum, l) => sum.plus(l.price), new Decimal(0))
      .dividedBy(group.length)

    // Sum touches
    const totalTouches = group.reduce((sum, l) => sum + l.touches, 0)

    // Determine strength based on number of levels merged
    let strength: 'strong' | 'moderate' | 'weak'
    if (group.length >= 3 || totalTouches >= 3) {
      strength = 'strong'
    } else if (group.length >= 2 || totalTouches >= 2) {
      strength = 'moderate'
    } else {
      strength = 'weak'
    }

    return {
      price: avgPrice,
      strength,
      touches: totalTouches,
      type: group[0].type
    }
  }
}
