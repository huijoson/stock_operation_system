import Decimal from 'decimal.js'
import { abs, divide } from '../lib/calculations/decimal-utils'

/**
 * Candlestick data structure
 */
export interface Candle {
  open: Decimal
  high: Decimal
  low: Decimal
  close: Decimal
  date: Date
}

/**
 * Pattern types supported by the service
 */
export type PatternType = 
  | 'HAMMER'
  | 'HANGING_MAN'
  | 'DOJI'
  | 'BULLISH_ENGULFING'
  | 'BEARISH_ENGULFING'
  | 'MORNING_STAR'
  | 'EVENING_STAR'

/**
 * Market context for reliability calculation
 */
export interface MarketContext {
  trend: 'uptrend' | 'downtrend' | 'sideways'
  volatility: 'high' | 'medium' | 'low'
  volume?: number
  atGoldenRatio?: boolean
}

/**
 * Pattern identification result
 */
export interface PatternResult {
  pattern: PatternType
  signal: 'bullish' | 'bearish' | 'neutral'
  reliability: number  // 0-100
  description: string
  date: Date
  atGoldenRatio: boolean
  candle: Candle
}

/**
 * CandlestickPatternService handles candlestick pattern recognition
 * for technical analysis.
 * 
 * Identifies common candlestick patterns and calculates their reliability
 * based on market context and position relative to Fibonacci levels.
 */
export class CandlestickPatternService {
  // Thresholds for pattern recognition
  private readonly DOJI_BODY_RATIO = 0.1  // Body is less than 10% of total range
  private readonly HAMMER_BODY_RATIO = 0.3  // Body is at least 30% of total range
  private readonly HAMMER_SHADOW_RATIO = 2.0  // Lower shadow is at least 2x body
  private readonly ENGULFING_MIN_RATIO = 1.0  // Engulfing body must be larger

  /**
   * Identify all candlestick patterns in the given candle data
   * 
   * Scans through candles and identifies various patterns including:
   * - Single candle patterns (Hammer, Hanging Man, Doji)
   * - Two candle patterns (Bullish/Bearish Engulfing)
   * - Three candle patterns (Morning Star, Evening Star)
   * 
   * @param candles - Array of candlestick data
   * @param goldenRatioLevels - Optional Fibonacci levels to check proximity
   * @returns Array of identified patterns
   * 
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
   */
  identifyPatterns(
    candles: Candle[],
    goldenRatioLevels?: Decimal[]
  ): PatternResult[] {
    if (candles.length < 1) {
      return []
    }

    const patterns: PatternResult[] = []

    // Identify single candle patterns
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i]
      
      // Check for Hammer
      const hammer = this.isHammer(candle)
      if (hammer) {
        const atGoldenRatio = this.isAtGoldenRatio(candle, goldenRatioLevels)
        const context = this.getMarketContext(candles, i)
        const reliability = this.calculateReliability('HAMMER', context)
        
        patterns.push({
          pattern: 'HAMMER',
          signal: 'bullish',
          reliability,
          description: 'Hammer pattern detected - potential bullish reversal',
          date: candle.date,
          atGoldenRatio,
          candle
        })
      }

      // Check for Hanging Man
      const hangingMan = this.isHangingMan(candle)
      if (hangingMan) {
        const atGoldenRatio = this.isAtGoldenRatio(candle, goldenRatioLevels)
        const context = this.getMarketContext(candles, i)
        const reliability = this.calculateReliability('HANGING_MAN', context)
        
        patterns.push({
          pattern: 'HANGING_MAN',
          signal: 'bearish',
          description: 'Hanging Man pattern detected - potential bearish reversal',
          reliability,
          date: candle.date,
          atGoldenRatio,
          candle
        })
      }

      // Check for Doji
      const doji = this.isDoji(candle)
      if (doji) {
        const atGoldenRatio = this.isAtGoldenRatio(candle, goldenRatioLevels)
        const context = this.getMarketContext(candles, i)
        const reliability = this.calculateReliability('DOJI', context)
        
        patterns.push({
          pattern: 'DOJI',
          signal: 'neutral',
          reliability,
          description: 'Doji pattern detected - market indecision',
          date: candle.date,
          atGoldenRatio,
          candle
        })
      }
    }

    // Identify two candle patterns
    for (let i = 1; i < candles.length; i++) {
      const prevCandle = candles[i - 1]
      const currCandle = candles[i]

      // Check for Bullish Engulfing
      const bullishEngulfing = this.isBullishEngulfing(prevCandle, currCandle)
      if (bullishEngulfing) {
        const atGoldenRatio = this.isAtGoldenRatio(currCandle, goldenRatioLevels)
        const context = this.getMarketContext(candles, i)
        const reliability = this.calculateReliability('BULLISH_ENGULFING', context)
        
        patterns.push({
          pattern: 'BULLISH_ENGULFING',
          signal: 'bullish',
          reliability,
          description: 'Bullish Engulfing pattern detected - strong bullish reversal',
          date: currCandle.date,
          atGoldenRatio,
          candle: currCandle
        })
      }

      // Check for Bearish Engulfing
      const bearishEngulfing = this.isBearishEngulfing(prevCandle, currCandle)
      if (bearishEngulfing) {
        const atGoldenRatio = this.isAtGoldenRatio(currCandle, goldenRatioLevels)
        const context = this.getMarketContext(candles, i)
        const reliability = this.calculateReliability('BEARISH_ENGULFING', context)
        
        patterns.push({
          pattern: 'BEARISH_ENGULFING',
          signal: 'bearish',
          reliability,
          description: 'Bearish Engulfing pattern detected - strong bearish reversal',
          date: currCandle.date,
          atGoldenRatio,
          candle: currCandle
        })
      }
    }

    // Identify three candle patterns
    for (let i = 2; i < candles.length; i++) {
      const firstCandle = candles[i - 2]
      const secondCandle = candles[i - 1]
      const thirdCandle = candles[i]

      // Check for Morning Star
      const morningStar = this.isMorningStar(firstCandle, secondCandle, thirdCandle)
      if (morningStar) {
        const atGoldenRatio = this.isAtGoldenRatio(thirdCandle, goldenRatioLevels)
        const context = this.getMarketContext(candles, i)
        const reliability = this.calculateReliability('MORNING_STAR', context)
        
        patterns.push({
          pattern: 'MORNING_STAR',
          signal: 'bullish',
          reliability,
          description: 'Morning Star pattern detected - strong bullish reversal',
          date: thirdCandle.date,
          atGoldenRatio,
          candle: thirdCandle
        })
      }

      // Check for Evening Star
      const eveningStar = this.isEveningStar(firstCandle, secondCandle, thirdCandle)
      if (eveningStar) {
        const atGoldenRatio = this.isAtGoldenRatio(thirdCandle, goldenRatioLevels)
        const context = this.getMarketContext(candles, i)
        const reliability = this.calculateReliability('EVENING_STAR', context)
        
        patterns.push({
          pattern: 'EVENING_STAR',
          signal: 'bearish',
          reliability,
          description: 'Evening Star pattern detected - strong bearish reversal',
          date: thirdCandle.date,
          atGoldenRatio,
          candle: thirdCandle
        })
      }
    }

    return patterns
  }

  /**
   * Calculate reliability score for a pattern based on market context
   * 
   * Factors considered:
   * - Pattern type (some patterns are inherently more reliable)
   * - Market trend (reversal patterns more reliable in trending markets)
   * - Position at golden ratio levels (increases reliability)
   * - Market volatility
   * 
   * @param pattern - Pattern type
   * @param context - Market context
   * @returns Reliability score (0-100)
   * 
   * Requirements: 9.4, 9.5, 9.6
   */
  calculateReliability(pattern: PatternType, context: MarketContext): number {
    let baseReliability = 50

    // Base reliability by pattern type
    switch (pattern) {
      case 'BULLISH_ENGULFING':
      case 'BEARISH_ENGULFING':
        baseReliability = 70
        break
      case 'MORNING_STAR':
      case 'EVENING_STAR':
        baseReliability = 75
        break
      case 'HAMMER':
      case 'HANGING_MAN':
        baseReliability = 60
        break
      case 'DOJI':
        baseReliability = 40
        break
    }

    // Adjust for trend context
    const isBullishPattern = ['HAMMER', 'BULLISH_ENGULFING', 'MORNING_STAR'].includes(pattern)
    const isBearishPattern = ['HANGING_MAN', 'BEARISH_ENGULFING', 'EVENING_STAR'].includes(pattern)

    if (isBullishPattern && context.trend === 'downtrend') {
      baseReliability += 10  // Bullish reversal in downtrend is more reliable
    } else if (isBearishPattern && context.trend === 'uptrend') {
      baseReliability += 10  // Bearish reversal in uptrend is more reliable
    } else if (context.trend === 'sideways') {
      baseReliability -= 5  // Patterns less reliable in sideways markets
    }

    // Adjust for golden ratio position
    if (context.atGoldenRatio) {
      baseReliability += 15  // Significant boost for patterns at key levels
    }

    // Adjust for volatility
    if (context.volatility === 'high') {
      baseReliability -= 5  // High volatility reduces reliability
    } else if (context.volatility === 'low') {
      baseReliability += 5  // Low volatility increases reliability
    }

    // Ensure reliability is within 0-100 range
    return Math.max(0, Math.min(100, baseReliability))
  }

  /**
   * Check if candle is a Hammer pattern
   * 
   * Characteristics:
   * - Small body at the upper end
   * - Long lower shadow (at least 2x body)
   * - Little or no upper shadow
   * 
   * @param candle - Candlestick data
   * @returns True if hammer pattern detected
   */
  private isHammer(candle: Candle): boolean {
    const body = abs(candle.close.minus(candle.open))
    const totalRange = candle.high.minus(candle.low)
    const lowerShadow = Decimal.min(candle.open, candle.close).minus(candle.low)
    const upperShadow = candle.high.minus(Decimal.max(candle.open, candle.close))

    if (totalRange.isZero()) return false
    if (body.isZero()) return false  // Can't be a hammer if there's no body

    const bodyRatio = divide(body, totalRange).toNumber()
    const lowerShadowRatio = divide(lowerShadow, body).toNumber()
    const upperShadowRatio = divide(upperShadow, totalRange).toNumber()

    return (
      bodyRatio >= this.HAMMER_BODY_RATIO &&
      lowerShadowRatio >= this.HAMMER_SHADOW_RATIO &&
      upperShadowRatio < 0.1
    )
  }

  /**
   * Check if candle is a Hanging Man pattern
   * 
   * Same structure as Hammer but appears in uptrend
   * 
   * @param candle - Candlestick data
   * @returns True if hanging man pattern detected
   */
  private isHangingMan(candle: Candle): boolean {
    // Structurally same as hammer
    return this.isHammer(candle)
  }

  /**
   * Check if candle is a Doji pattern
   * 
   * Characteristics:
   * - Very small body (open ≈ close)
   * - Can have long or short shadows
   * 
   * @param candle - Candlestick data
   * @returns True if doji pattern detected
   */
  private isDoji(candle: Candle): boolean {
    const body = abs(candle.close.minus(candle.open))
    const totalRange = candle.high.minus(candle.low)

    if (totalRange.isZero()) return false

    const bodyRatio = divide(body, totalRange).toNumber()

    return bodyRatio <= this.DOJI_BODY_RATIO
  }

  /**
   * Check if two candles form a Bullish Engulfing pattern
   * 
   * Characteristics:
   * - First candle is bearish (red)
   * - Second candle is bullish (green) and engulfs first candle's body
   * 
   * @param prevCandle - Previous candlestick
   * @param currCandle - Current candlestick
   * @returns True if bullish engulfing pattern detected
   */
  private isBullishEngulfing(prevCandle: Candle, currCandle: Candle): boolean {
    const prevIsBearish = prevCandle.close.lessThan(prevCandle.open)
    const currIsBullish = currCandle.close.greaterThan(currCandle.open)

    if (!prevIsBearish || !currIsBullish) return false

    // Current candle's body must engulf previous candle's body
    const currEngulfsPrev = 
      currCandle.open.lessThanOrEqualTo(prevCandle.close) &&
      currCandle.close.greaterThanOrEqualTo(prevCandle.open)

    return currEngulfsPrev
  }

  /**
   * Check if two candles form a Bearish Engulfing pattern
   * 
   * Characteristics:
   * - First candle is bullish (green)
   * - Second candle is bearish (red) and engulfs first candle's body
   * 
   * @param prevCandle - Previous candlestick
   * @param currCandle - Current candlestick
   * @returns True if bearish engulfing pattern detected
   */
  private isBearishEngulfing(prevCandle: Candle, currCandle: Candle): boolean {
    const prevIsBullish = prevCandle.close.greaterThan(prevCandle.open)
    const currIsBearish = currCandle.close.lessThan(currCandle.open)

    if (!prevIsBullish || !currIsBearish) return false

    // Current candle's body must engulf previous candle's body
    const currEngulfsPrev = 
      currCandle.open.greaterThanOrEqualTo(prevCandle.close) &&
      currCandle.close.lessThanOrEqualTo(prevCandle.open)

    return currEngulfsPrev
  }

  /**
   * Check if three candles form a Morning Star pattern
   * 
   * Characteristics:
   * - First candle is bearish with large body
   * - Second candle is small (star) - can be bullish or bearish
   * - Third candle is bullish with large body
   * 
   * @param first - First candlestick
   * @param second - Second candlestick (star)
   * @param third - Third candlestick
   * @returns True if morning star pattern detected
   */
  private isMorningStar(first: Candle, second: Candle, third: Candle): boolean {
    const firstIsBearish = first.close.lessThan(first.open)
    const thirdIsBullish = third.close.greaterThan(third.open)

    if (!firstIsBearish || !thirdIsBullish) return false

    // First candle should have a large body
    const firstBody = abs(first.close.minus(first.open))
    const firstRange = first.high.minus(first.low)
    if (firstRange.isZero()) return false
    const firstBodyRatio = divide(firstBody, firstRange).toNumber()
    if (firstBodyRatio < 0.5) return false

    // Second candle should be small (star)
    const secondBody = abs(second.close.minus(second.open))
    const secondRange = second.high.minus(second.low)
    if (secondRange.isZero()) return false
    const secondBodyRatio = divide(secondBody, secondRange).toNumber()
    if (secondBodyRatio > 0.3) return false

    // Third candle should have a large body
    const thirdBody = abs(third.close.minus(third.open))
    const thirdRange = third.high.minus(third.low)
    if (thirdRange.isZero()) return false
    const thirdBodyRatio = divide(thirdBody, thirdRange).toNumber()
    if (thirdBodyRatio < 0.5) return false

    // Third candle should close well into first candle's body
    const thirdClosesIntoFirst = third.close.greaterThan(
      first.close.plus(first.open).dividedBy(2)
    )

    return thirdClosesIntoFirst
  }

  /**
   * Check if three candles form an Evening Star pattern
   * 
   * Characteristics:
   * - First candle is bullish with large body
   * - Second candle is small (star) - can be bullish or bearish
   * - Third candle is bearish with large body
   * 
   * @param first - First candlestick
   * @param second - Second candlestick (star)
   * @param third - Third candlestick
   * @returns True if evening star pattern detected
   */
  private isEveningStar(first: Candle, second: Candle, third: Candle): boolean {
    const firstIsBullish = first.close.greaterThan(first.open)
    const thirdIsBearish = third.close.lessThan(third.open)

    if (!firstIsBullish || !thirdIsBearish) return false

    // First candle should have a large body
    const firstBody = abs(first.close.minus(first.open))
    const firstRange = first.high.minus(first.low)
    if (firstRange.isZero()) return false
    const firstBodyRatio = divide(firstBody, firstRange).toNumber()
    if (firstBodyRatio < 0.5) return false

    // Second candle should be small (star)
    const secondBody = abs(second.close.minus(second.open))
    const secondRange = second.high.minus(second.low)
    if (secondRange.isZero()) return false
    const secondBodyRatio = divide(secondBody, secondRange).toNumber()
    if (secondBodyRatio > 0.3) return false

    // Third candle should have a large body
    const thirdBody = abs(third.close.minus(third.open))
    const thirdRange = third.high.minus(third.low)
    if (thirdRange.isZero()) return false
    const thirdBodyRatio = divide(thirdBody, thirdRange).toNumber()
    if (thirdBodyRatio < 0.5) return false

    // Third candle should close well into first candle's body
    const thirdClosesIntoFirst = third.close.lessThan(
      first.close.plus(first.open).dividedBy(2)
    )

    return thirdClosesIntoFirst
  }

  /**
   * Check if candle is at or near a golden ratio level
   * 
   * @param candle - Candlestick data
   * @param goldenRatioLevels - Array of Fibonacci levels
   * @param tolerance - Tolerance percentage (default: 0.02 = 2%)
   * @returns True if candle is near a golden ratio level
   */
  private isAtGoldenRatio(
    candle: Candle,
    goldenRatioLevels?: Decimal[],
    tolerance: number = 0.02
  ): boolean {
    if (!goldenRatioLevels || goldenRatioLevels.length === 0) {
      return false
    }

    const candlePrice = candle.close

    for (const level of goldenRatioLevels) {
      const difference = abs(candlePrice.minus(level))
      const percentageDiff = divide(difference, level)

      if (percentageDiff.lessThanOrEqualTo(tolerance)) {
        return true
      }
    }

    return false
  }

  /**
   * Get market context for reliability calculation
   * 
   * @param candles - Array of candlestick data
   * @param currentIndex - Index of current candle
   * @returns Market context
   */
  private getMarketContext(candles: Candle[], currentIndex: number): MarketContext {
    // Determine trend by looking at recent price movement
    const lookback = Math.min(10, currentIndex)
    if (lookback < 2) {
      return {
        trend: 'sideways',
        volatility: 'medium',
        atGoldenRatio: false
      }
    }

    const recentCandles = candles.slice(currentIndex - lookback, currentIndex + 1)
    const firstPrice = recentCandles[0].close
    const lastPrice = recentCandles[recentCandles.length - 1].close
    const priceChange = lastPrice.minus(firstPrice)
    const percentChange = divide(priceChange, firstPrice).toNumber()

    let trend: 'uptrend' | 'downtrend' | 'sideways'
    if (percentChange > 0.05) {
      trend = 'uptrend'
    } else if (percentChange < -0.05) {
      trend = 'downtrend'
    } else {
      trend = 'sideways'
    }

    // Calculate volatility based on price ranges
    const ranges = recentCandles.map(c => c.high.minus(c.low))
    const avgRange = ranges.reduce((sum, r) => sum.plus(r), new Decimal(0)).dividedBy(ranges.length)
    const avgPrice = recentCandles.reduce((sum, c) => sum.plus(c.close), new Decimal(0)).dividedBy(recentCandles.length)
    const volatilityRatio = divide(avgRange, avgPrice).toNumber()

    let volatility: 'high' | 'medium' | 'low'
    if (volatilityRatio > 0.03) {
      volatility = 'high'
    } else if (volatilityRatio < 0.01) {
      volatility = 'low'
    } else {
      volatility = 'medium'
    }

    return {
      trend,
      volatility,
      atGoldenRatio: false  // This will be set by the caller
    }
  }
}
