import Decimal from 'decimal.js'
import { RSIService } from './rsi.service'
import { MACDService } from './macd.service'
import { BollingerBandsService } from './bollinger-bands.service'
import { FibonacciService } from './fibonacci.service'

/**
 * Component scores with weight
 */
export interface ComponentScores {
  rsi: { score: number; weight: number }
  macd: { score: number; weight: number }
  bollinger: { score: number; weight: number }
  fibonacci: { score: number; weight: number }
}

/**
 * Technical score result
 */
export interface TechnicalScore {
  totalScore: number // 0-100
  rating: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'
  components: ComponentScores
  timestamp: Date
}

/**
 * Market data for technical score calculation
 */
export interface MarketData {
  prices: Decimal.Value[]
  highs?: Decimal.Value[]
  lows?: Decimal.Value[]
  currentPrice: Decimal.Value
  recentHigh?: Decimal.Value
  recentLow?: Decimal.Value
}

/**
 * TechnicalScoreService calculates a comprehensive technical score
 * by combining multiple technical indicators.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export class TechnicalScoreService {
  private rsiService: RSIService
  private macdService: MACDService
  private bollingerService: BollingerBandsService
  private fibonacciService: FibonacciService

  // Default weights for each indicator
  private readonly DEFAULT_WEIGHTS = {
    rsi: 0.25,
    macd: 0.30,
    bollinger: 0.25,
    fibonacci: 0.20
  }

  constructor() {
    this.rsiService = new RSIService()
    this.macdService = new MACDService()
    this.bollingerService = new BollingerBandsService()
    this.fibonacciService = new FibonacciService()
  }

  /**
   * Calculate comprehensive technical score
   * 
   * @param marketData - Market data including prices and current price
   * @param weights - Custom weights for each indicator (optional)
   * @returns Technical score result
   * 
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
   */
  calculateScore(
    marketData: MarketData,
    weights: Partial<typeof this.DEFAULT_WEIGHTS> = {}
  ): TechnicalScore {
    const finalWeights = { ...this.DEFAULT_WEIGHTS, ...weights }
    
    // Calculate component scores
    const components = this.getComponentScores(marketData)

    // Calculate weighted total score
    const totalScore = Math.round(
      components.rsi.score * finalWeights.rsi +
      components.macd.score * finalWeights.macd +
      components.bollinger.score * finalWeights.bollinger +
      components.fibonacci.score * finalWeights.fibonacci
    )

    // Ensure score is within 0-100 range
    const clampedScore = Math.max(0, Math.min(100, totalScore))

    // Determine rating based on score
    let rating: TechnicalScore['rating']
    if (clampedScore > 70) {
      rating = 'strong_buy'
    } else if (clampedScore > 55) {
      rating = 'buy'
    } else if (clampedScore >= 45) {
      rating = 'neutral'
    } else if (clampedScore >= 30) {
      rating = 'sell'
    } else {
      rating = 'strong_sell'
    }

    return {
      totalScore: clampedScore,
      rating,
      components,
      timestamp: new Date()
    }
  }

  /**
   * Get individual component scores
   * 
   * @param marketData - Market data
   * @returns Component scores with weights
   * 
   * Requirements: 8.5
   */
  getComponentScores(marketData: MarketData): ComponentScores {
    return {
      rsi: {
        score: this.calculateRSIScore(marketData.prices),
        weight: this.DEFAULT_WEIGHTS.rsi
      },
      macd: {
        score: this.calculateMACDScore(marketData.prices),
        weight: this.DEFAULT_WEIGHTS.macd
      },
      bollinger: {
        score: this.calculateBollingerScore(marketData.prices),
        weight: this.DEFAULT_WEIGHTS.bollinger
      },
      fibonacci: {
        score: this.calculateFibonacciScore(marketData),
        weight: this.DEFAULT_WEIGHTS.fibonacci
      }
    }
  }

  /**
   * Calculate RSI component score (0-100)
   * 
   * - RSI < 30: Oversold (bullish) → High score (70-100)
   * - RSI 30-45: Slightly oversold → Medium-high score (55-70)
   * - RSI 45-55: Neutral → Medium score (45-55)
   * - RSI 55-70: Slightly overbought → Medium-low score (30-45)
   * - RSI > 70: Overbought (bearish) → Low score (0-30)
   */
  private calculateRSIScore(prices: Decimal.Value[]): number {
    try {
      const rsiResult = this.rsiService.calculateRSI(prices, 14)
      const rsi = rsiResult.value

      if (rsi < 30) {
        // Oversold - bullish signal
        return 70 + (30 - rsi) // 70-100
      } else if (rsi < 45) {
        // Slightly oversold
        return 55 + (45 - rsi) / 15 * 15 // 55-70
      } else if (rsi <= 55) {
        // Neutral
        return 45 + (rsi - 45) // 45-55
      } else if (rsi <= 70) {
        // Slightly overbought
        return 30 + (70 - rsi) / 15 * 15 // 30-45
      } else {
        // Overbought - bearish signal
        return Math.max(0, 30 - (rsi - 70)) // 0-30
      }
    } catch (error) {
      // If RSI calculation fails, return neutral score
      return 50
    }
  }

  /**
   * Calculate MACD component score (0-100)
   * 
   * - Bullish signal (golden cross) → High score (70-100)
   * - Neutral → Medium score (40-60)
   * - Bearish signal (death cross) → Low score (0-30)
   */
  private calculateMACDScore(prices: Decimal.Value[]): number {
    try {
      const macdResult = this.macdService.calculateMACD(prices)
      
      if (macdResult.currentSignal === 'bullish') {
        // Check histogram strength
        const lastHistogram = macdResult.histogram[macdResult.histogram.length - 1]
        if (lastHistogram > 0) {
          return 70 + Math.min(30, lastHistogram * 10)
        }
        return 70
      } else if (macdResult.currentSignal === 'bearish') {
        // Check histogram strength
        const lastHistogram = macdResult.histogram[macdResult.histogram.length - 1]
        if (lastHistogram < 0) {
          return Math.max(0, 30 + lastHistogram * 10)
        }
        return 30
      } else {
        return 50
      }
    } catch (error) {
      return 50
    }
  }

  /**
   * Calculate Bollinger Bands component score (0-100)
   * 
   * - Price below lower band → Oversold (bullish) → High score (70-100)
   * - Price within bands → Neutral → Medium score (40-60)
   * - Price above upper band → Overbought (bearish) → Low score (0-30)
   */
  private calculateBollingerScore(prices: Decimal.Value[]): number {
    try {
      const bollingerResult = this.bollingerService.calculateBands(prices)
      
      if (bollingerResult.currentPosition === 'below_lower') {
        // Oversold - bullish
        return 80
      } else if (bollingerResult.currentPosition === 'above_upper') {
        // Overbought - bearish
        return 20
      } else {
        // Within bands - neutral
        return 50
      }
    } catch (error) {
      return 50
    }
  }

  /**
   * Calculate Fibonacci component score (0-100)
   * 
   * - Price near support levels → Bullish → High score
   * - Price in middle → Neutral → Medium score
   * - Price near resistance levels → Bearish → Low score
   */
  private calculateFibonacciScore(marketData: MarketData): number {
    try {
      // Need recent high and low for Fibonacci calculation
      if (!marketData.recentHigh || !marketData.recentLow) {
        return 50
      }

      const currentPrice = new Decimal(marketData.currentPrice)
      const high = new Decimal(marketData.recentHigh)
      const low = new Decimal(marketData.recentLow)

      // Calculate retracement levels
      const retracement = this.fibonacciService.calculateRetracement(high, low, true)
      
      // Find nearest level
      const nearestLevel = this.fibonacciService.findNearestLevel(
        currentPrice,
        retracement,
        0.02
      )

      if (nearestLevel) {
        // Score based on which Fibonacci level we're near
        if (nearestLevel.ratio <= 0.382) {
          // Near lower levels (support) - bullish
          const score = 70 + (0.382 - nearestLevel.ratio) * 50
          return Math.max(0, Math.min(100, Math.round(score)))
        } else if (nearestLevel.ratio >= 0.618) {
          // Near upper levels (resistance) - bearish
          const score = 30 - (nearestLevel.ratio - 0.618) * 50
          return Math.max(0, Math.min(100, Math.round(score)))
        } else {
          // Middle levels - neutral
          return 50
        }
      }

      // If no nearby level, calculate position in range
      const range = high.minus(low)
      
      // Handle edge case where range is zero
      if (range.isZero()) {
        return 50
      }
      
      const position = currentPrice.minus(low).dividedBy(range).toNumber()
      
      // Lower in range = more bullish, higher = more bearish
      // Clamp position to 0-1 range to ensure score stays within 0-100
      const clampedPosition = Math.max(0, Math.min(1, position))
      return Math.round(100 - clampedPosition * 100)
    } catch (error) {
      return 50
    }
  }
}
