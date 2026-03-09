import Decimal from 'decimal.js'

/**
 * Bollinger Bands calculation result
 */
export interface BollingerBandsResult {
  upper: Decimal[]
  middle: Decimal[]
  lower: Decimal[]
  bandwidth: number[]
  currentPosition: 'above_upper' | 'below_lower' | 'within_bands'
}

/**
 * BollingerBandsService handles Bollinger Bands calculations for technical analysis.
 * 
 * Bollinger Bands consist of:
 * - Middle Band: Simple Moving Average (SMA)
 * - Upper Band: Middle Band + (2 × Standard Deviation)
 * - Lower Band: Middle Band - (2 × Standard Deviation)
 * 
 * The bands expand and contract based on market volatility.
 */
export class BollingerBandsService {
  private readonly DEFAULT_PERIOD = 20
  private readonly DEFAULT_STD_DEV_MULTIPLIER = 2

  /**
   * Calculate Simple Moving Average (SMA)
   * 
   * @param prices - Array of price values
   * @param period - Period for SMA calculation
   * @returns Array of SMA values
   */
  calculateSMA(prices: Decimal.Value[], period: number): Decimal[] {
    if (prices.length < period) {
      throw new Error(`Insufficient data: need at least ${period} prices for SMA calculation`)
    }

    const priceDecimals = prices.map(p => new Decimal(p))
    const smaValues: Decimal[] = []

    for (let i = period - 1; i < priceDecimals.length; i++) {
      const sum = priceDecimals
        .slice(i - period + 1, i + 1)
        .reduce((acc, price) => acc.plus(price), new Decimal(0))
      
      const sma = sum.dividedBy(period)
      smaValues.push(sma)
    }

    return smaValues
  }

  /**
   * Calculate Standard Deviation
   * 
   * @param prices - Array of price values
   * @param period - Period for standard deviation calculation
   * @param smaValues - Pre-calculated SMA values (optional, will calculate if not provided)
   * @returns Array of standard deviation values
   */
  calculateStandardDeviation(
    prices: Decimal.Value[],
    period: number,
    smaValues?: Decimal[]
  ): Decimal[] {
    if (prices.length < period) {
      throw new Error(`Insufficient data: need at least ${period} prices for standard deviation calculation`)
    }

    const priceDecimals = prices.map(p => new Decimal(p))
    const smas = smaValues || this.calculateSMA(prices, period)
    const stdDevValues: Decimal[] = []

    for (let i = period - 1; i < priceDecimals.length; i++) {
      const smaIndex = i - period + 1
      const sma = smas[smaIndex]
      
      // Calculate variance: sum of squared differences from mean
      const variance = priceDecimals
        .slice(i - period + 1, i + 1)
        .reduce((acc, price) => {
          const diff = price.minus(sma)
          return acc.plus(diff.times(diff))
        }, new Decimal(0))
        .dividedBy(period)
      
      // Standard deviation is square root of variance
      const stdDev = new Decimal(Math.sqrt(variance.toNumber()))
      stdDevValues.push(stdDev)
    }

    return stdDevValues
  }

  /**
   * Calculate Bollinger Bands
   * 
   * Calculates:
   * - Middle Band: SMA
   * - Upper Band: SMA + (stdDevMultiplier × Standard Deviation)
   * - Lower Band: SMA - (stdDevMultiplier × Standard Deviation)
   * - Bandwidth: (Upper Band - Lower Band) / Middle Band
   * 
   * @param prices - Array of price values (closing prices)
   * @param period - Period for calculation (default: 20)
   * @param stdDevMultiplier - Standard deviation multiplier (default: 2)
   * @returns Bollinger Bands calculation result
   * 
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
   */
  calculateBands(
    prices: Decimal.Value[],
    period: number = this.DEFAULT_PERIOD,
    stdDevMultiplier: number = this.DEFAULT_STD_DEV_MULTIPLIER
  ): BollingerBandsResult {
    if (prices.length < period) {
      throw new Error(`Insufficient data: need at least ${period} prices for Bollinger Bands calculation`)
    }

    // Calculate middle band (SMA)
    const middle = this.calculateSMA(prices, period)

    // Calculate standard deviation
    const stdDev = this.calculateStandardDeviation(prices, period, middle)

    // Calculate upper and lower bands
    const upper: Decimal[] = []
    const lower: Decimal[] = []
    const bandwidth: number[] = []

    for (let i = 0; i < middle.length; i++) {
      const upperBand = middle[i].plus(stdDev[i].times(stdDevMultiplier))
      const lowerBand = middle[i].minus(stdDev[i].times(stdDevMultiplier))
      
      upper.push(upperBand)
      lower.push(lowerBand)

      // Bandwidth = (Upper - Lower) / Middle
      const bw = upperBand.minus(lowerBand).dividedBy(middle[i]).toNumber()
      bandwidth.push(bw)
    }

    // Determine current position
    const currentPrice = new Decimal(prices[prices.length - 1])
    const currentUpper = upper[upper.length - 1]
    const currentLower = lower[lower.length - 1]

    let currentPosition: 'above_upper' | 'below_lower' | 'within_bands'
    if (currentPrice.greaterThan(currentUpper)) {
      currentPosition = 'above_upper'
    } else if (currentPrice.lessThan(currentLower)) {
      currentPosition = 'below_lower'
    } else {
      currentPosition = 'within_bands'
    }

    return {
      upper,
      middle,
      lower,
      bandwidth,
      currentPosition
    }
  }

  /**
   * Detect Bollinger Bands squeeze
   * 
   * A squeeze occurs when the bandwidth is significantly narrower than average,
   * indicating low volatility and potential for a breakout.
   * 
   * @param bands - Bollinger Bands result
   * @param lookbackPeriod - Period to calculate average bandwidth (default: 20)
   * @param threshold - Threshold percentage (default: 0.5 = 50% of average)
   * @returns True if squeeze is detected
   * 
   * Requirements: 5.4
   */
  detectSqueeze(
    bands: BollingerBandsResult,
    lookbackPeriod: number = 20,
    threshold: number = 0.5
  ): boolean {
    if (bands.bandwidth.length < lookbackPeriod) {
      // Not enough data to determine squeeze
      return false
    }

    // Calculate average bandwidth over lookback period
    const recentBandwidths = bands.bandwidth.slice(-lookbackPeriod)
    const avgBandwidth = recentBandwidths.reduce((sum, bw) => sum + bw, 0) / lookbackPeriod

    // Current bandwidth
    const currentBandwidth = bands.bandwidth[bands.bandwidth.length - 1]

    // Squeeze detected if current bandwidth is less than threshold × average
    return currentBandwidth < avgBandwidth * threshold
  }
}
