import Decimal from 'decimal.js'
import { multiply, subtract, add, abs, divide } from '../lib/calculations/decimal-utils'

/**
 * Fibonacci level with ratio and calculated price
 */
export interface FibonacciLevel {
  ratio: number      // 0.236, 0.382, 0.5, 0.618, 0.786
  price: Decimal
  label: string
}

/**
 * Fibonacci retracement levels result
 */
export interface FibonacciLevels {
  levels: FibonacciLevel[]
  high: Decimal
  low: Decimal
  direction: 'uptrend' | 'downtrend'
}

/**
 * Fibonacci extension target
 */
export interface FibonacciTarget {
  ratio: number      // 1.0, 1.618, 2.618
  price: Decimal
  label: string
}

/**
 * Fibonacci extension targets result
 */
export interface FibonacciTargets {
  targets: FibonacciTarget[]
  start: Decimal
  retracement: Decimal
  breakout: Decimal
}

/**
 * FibonacciService handles Fibonacci retracement and extension calculations
 * using golden ratio principles for technical analysis.
 * 
 * All calculations use Decimal.js for high precision to avoid floating-point errors.
 */
export class FibonacciService {
  // Standard Fibonacci retracement ratios
  private readonly RETRACEMENT_RATIOS = [0.236, 0.382, 0.5, 0.618, 0.786]
  
  // Standard Fibonacci extension ratios
  private readonly EXTENSION_RATIOS = [1.0, 1.618, 2.618]

  /**
   * Calculate Fibonacci retracement levels
   * 
   * Formula: Retracement Price = High - (High - Low) × Ratio
   * 
   * @param high - High price point
   * @param low - Low price point
   * @param isUptrend - True for uptrend (retracing from high), false for downtrend (retracing from low)
   * @returns Fibonacci retracement levels
   * 
   * Requirements: 1.1, 1.2
   */
  calculateRetracement(
    high: Decimal.Value,
    low: Decimal.Value,
    isUptrend: boolean
  ): FibonacciLevels {
    const highDecimal = new Decimal(high)
    const lowDecimal = new Decimal(low)
    
    // Calculate the price range
    const range = subtract(highDecimal, lowDecimal)
    
    // Calculate each retracement level
    const levels: FibonacciLevel[] = this.RETRACEMENT_RATIOS.map(ratio => {
      // Formula: High - (High - Low) × Ratio
      const retracementAmount = multiply(range, ratio)
      const price = subtract(highDecimal, retracementAmount)
      
      return {
        ratio,
        price,
        label: `${(ratio * 100).toFixed(1)}%`
      }
    })

    return {
      levels,
      high: highDecimal,
      low: lowDecimal,
      direction: isUptrend ? 'uptrend' : 'downtrend'
    }
  }

  /**
   * Calculate Fibonacci extension targets
   * 
   * Formula: Target Price = Breakout + (Start - Retracement) × Ratio
   * 
   * @param start - Starting price point
   * @param retracement - Retracement price point
   * @param breakout - Breakout price point
   * @returns Fibonacci extension targets
   * 
   * Requirements: 2.1, 2.2
   */
  calculateExtension(
    start: Decimal.Value,
    retracement: Decimal.Value,
    breakout: Decimal.Value
  ): FibonacciTargets {
    const startDecimal = new Decimal(start)
    const retracementDecimal = new Decimal(retracement)
    const breakoutDecimal = new Decimal(breakout)
    
    // Calculate the move size
    const moveSize = subtract(startDecimal, retracementDecimal)
    
    // Calculate each extension target
    const targets: FibonacciTarget[] = this.EXTENSION_RATIOS.map(ratio => {
      // Formula: Breakout + (Start - Retracement) × Ratio
      const extensionAmount = multiply(moveSize, ratio)
      const price = add(breakoutDecimal, extensionAmount)
      
      return {
        ratio,
        price,
        label: `${(ratio * 100).toFixed(1)}%`
      }
    })

    return {
      targets,
      start: startDecimal,
      retracement: retracementDecimal,
      breakout: breakoutDecimal
    }
  }

  /**
   * Find the nearest Fibonacci level to the current price
   * 
   * A level is considered "near" if the price difference is within the tolerance percentage.
   * Default tolerance is 2% as per requirements.
   * 
   * @param currentPrice - Current price to compare
   * @param levels - Fibonacci levels to search
   * @param tolerance - Tolerance percentage (default: 0.02 = 2%)
   * @returns Nearest level within tolerance, or null if none found
   * 
   * Requirements: 1.4
   */
  findNearestLevel(
    currentPrice: Decimal.Value,
    levels: FibonacciLevels,
    tolerance: number = 0.02
  ): FibonacciLevel | null {
    const priceDecimal = new Decimal(currentPrice)
    let nearestLevel: FibonacciLevel | null = null
    let minDistance = new Decimal(Infinity)

    for (const level of levels.levels) {
      // Calculate absolute difference
      const difference = abs(subtract(priceDecimal, level.price))
      
      // Calculate percentage difference relative to the level price
      const percentageDiff = divide(difference, level.price)
      
      // Check if within tolerance
      if (percentageDiff.lessThanOrEqualTo(tolerance)) {
        // Track the closest level within tolerance
        if (difference.lessThan(minDistance)) {
          minDistance = difference
          nearestLevel = level
        }
      }
    }

    return nearestLevel
  }
}
