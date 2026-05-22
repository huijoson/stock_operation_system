import Decimal from 'decimal.js'
import { calculateMacdFallback } from '../lib/rust-indicators/indicator-fallback'
import { loadRustIndicatorsNative } from '../lib/rust-indicators/native-loader'
import { calculateMacdViaNative, RustMacdAddon } from '../lib/rust-indicators/macd-adapter'

/**
 * Crossover detection result
 */
export interface Crossover {
  type: 'golden' | 'death'
  index: number
  date: Date
  macdValue: number
  signalValue: number
  description: string
}

/**
 * MACD calculation result
 */
export interface MACDResult {
  macdLine: number[]
  signalLine: number[]
  histogram: number[]
  crossovers: Crossover[]
  currentSignal: 'bullish' | 'bearish' | 'neutral'
}

/**
 * MACDService handles MACD (Moving Average Convergence Divergence) calculations
 * for technical analysis.
 * 
 * MACD is a trend-following momentum indicator that shows the relationship between
 * two moving averages of a security's price. It consists of:
 * - MACD Line: 12-day EMA - 26-day EMA
 * - Signal Line: 9-day EMA of MACD Line
 * - Histogram: MACD Line - Signal Line
 */
export class MACDService {
  private readonly DEFAULT_FAST_PERIOD = 12
  private readonly DEFAULT_SLOW_PERIOD = 26
  private readonly DEFAULT_SIGNAL_PERIOD = 9

  /**
   * Calculate EMA (Exponential Moving Average)
   * 
   * Formula: EMA = Previous EMA × (1 - α) + Current Price × α
   * Where α = 2 / (period + 1)
   * 
   * @param prices - Array of price values
   * @param period - Period for EMA calculation
   * @returns Array of EMA values
   * 
   * Requirements: 4.6
   */
  calculateEMA(prices: Decimal.Value[], period: number): number[] {
    if (prices.length < period) {
      throw new Error(`Insufficient data: need at least ${period} prices for EMA calculation`)
    }

    const priceDecimals = prices.map(p => new Decimal(p))
    const emaValues: number[] = []
    
    // Calculate smoothing factor (α)
    const alpha = new Decimal(2).dividedBy(period + 1)
    
    // Calculate initial SMA as the first EMA value
    let ema = priceDecimals
      .slice(0, period)
      .reduce((sum, price) => sum.plus(price), new Decimal(0))
      .dividedBy(period)
    
    emaValues.push(ema.toNumber())

    // Calculate subsequent EMA values
    // Formula: EMA = Previous EMA × (1 - α) + Current Price × α
    for (let i = period; i < priceDecimals.length; i++) {
      ema = ema.times(new Decimal(1).minus(alpha)).plus(priceDecimals[i].times(alpha))
      emaValues.push(ema.toNumber())
    }

    return emaValues
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * 
   * Calculates:
   * - MACD Line: Fast EMA - Slow EMA
   * - Signal Line: EMA of MACD Line
   * - Histogram: MACD Line - Signal Line
   * 
   * @param prices - Array of price values (closing prices)
   * @param fastPeriod - Fast EMA period (default: 12)
   * @param slowPeriod - Slow EMA period (default: 26)
   * @param signalPeriod - Signal line EMA period (default: 9)
   * @returns MACD calculation result
   * 
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  calculateMACD(
    prices: Decimal.Value[],
    fastPeriod: number = this.DEFAULT_FAST_PERIOD,
    slowPeriod: number = this.DEFAULT_SLOW_PERIOD,
    signalPeriod: number = this.DEFAULT_SIGNAL_PERIOD
  ): MACDResult {
    const native = loadRustIndicatorsNative()

    if (native.available) {
      const priceStrings = prices.map((price) => new Decimal(price).toString())
      return calculateMacdViaNative(
        native.addon as RustMacdAddon,
        priceStrings,
        fastPeriod,
        slowPeriod,
        signalPeriod
      )
    }

    return calculateMacdFallback(
      prices,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      this.detectCrossover.bind(this)
    )
  }

  /**
   * Detect crossovers between MACD line and signal line
   * 
   * Golden Cross: MACD line crosses above signal line (bullish signal)
   * Death Cross: MACD line crosses below signal line (bearish signal)
   * 
   * @param macdLine - Array of MACD line values
   * @param signalLine - Array of signal line values (must be same length as macdLine)
   * @returns Array of detected crossovers
   * 
   * Requirements: 4.2, 4.3
   */
  detectCrossover(macdLine: number[], signalLine: number[]): Crossover[] {
    if (macdLine.length !== signalLine.length) {
      throw new Error('MACD line and signal line must have the same length')
    }

    if (macdLine.length < 2) {
      // Need at least 2 data points to detect crossover
      return []
    }

    const crossovers: Crossover[] = []
    const currentDate = new Date()

    for (let i = 1; i < macdLine.length; i++) {
      const prevMACD = macdLine[i - 1]
      const currMACD = macdLine[i]
      const prevSignal = signalLine[i - 1]
      const currSignal = signalLine[i]

      // Golden cross: MACD crosses above signal line
      if (prevMACD <= prevSignal && currMACD > currSignal) {
        const date = new Date(currentDate)
        date.setDate(date.getDate() - (macdLine.length - 1 - i))
        
        crossovers.push({
          type: 'golden',
          index: i,
          date,
          macdValue: currMACD,
          signalValue: currSignal,
          description: 'MACD line crossed above signal line (bullish signal)'
        })
      }

      // Death cross: MACD crosses below signal line
      if (prevMACD >= prevSignal && currMACD < currSignal) {
        const date = new Date(currentDate)
        date.setDate(date.getDate() - (macdLine.length - 1 - i))
        
        crossovers.push({
          type: 'death',
          index: i,
          date,
          macdValue: currMACD,
          signalValue: currSignal,
          description: 'MACD line crossed below signal line (bearish signal)'
        })
      }
    }

    return crossovers
  }
}
