import Decimal from 'decimal.js'
import { divide, abs } from '@/lib/calculations/decimal-utils'

/**
 * Divergence detection result
 */
export interface Divergence {
  type: 'bullish' | 'bearish'
  startIndex: number
  endIndex: number
  description: string
}

/**
 * RSI calculation result
 */
export interface RSIResult {
  value: number
  status: 'overbought' | 'oversold' | 'neutral'
  history: Array<{ date: Date; value: number }>
  divergences: Divergence[]
}

/**
 * RSIService handles Relative Strength Index (RSI) calculations
 * for technical analysis.
 * 
 * RSI is a momentum oscillator that measures the speed and magnitude
 * of price changes. It ranges from 0 to 100, with readings above 70
 * indicating overbought conditions and below 30 indicating oversold conditions.
 */
export class RSIService {
  private readonly OVERBOUGHT_THRESHOLD = 70
  private readonly OVERSOLD_THRESHOLD = 30
  private readonly DEFAULT_PERIOD = 14

  /**
   * Calculate RSI (Relative Strength Index)
   * 
   * Formula: RSI = 100 - (100 / (1 + RS))
   * Where RS = Average Gain / Average Loss
   * 
   * @param prices - Array of price values (closing prices)
   * @param period - Period for RSI calculation (default: 14)
   * @returns RSI calculation result
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  calculateRSI(
    prices: Decimal.Value[],
    period: number = this.DEFAULT_PERIOD
  ): RSIResult {
    if (prices.length < period + 1) {
      throw new Error(`Insufficient data: need at least ${period + 1} prices for RSI calculation`)
    }

    const priceDecimals = prices.map(p => new Decimal(p))
    const history: Array<{ date: Date; value: number }> = []
    
    // Calculate price changes
    const changes: Decimal[] = []
    for (let i = 1; i < priceDecimals.length; i++) {
      changes.push(priceDecimals[i].minus(priceDecimals[i - 1]))
    }

    // Separate gains and losses
    const gains: Decimal[] = changes.map(change => 
      change.greaterThan(0) ? change : new Decimal(0)
    )
    const losses: Decimal[] = changes.map(change => 
      change.lessThan(0) ? abs(change) : new Decimal(0)
    )

    // Calculate initial average gain and loss (SMA for first period)
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum.plus(gain), new Decimal(0)).dividedBy(period)
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum.plus(loss), new Decimal(0)).dividedBy(period)

    // Calculate first RSI value
    const rsiValues: number[] = []
    let rs = avgLoss.isZero() ? new Decimal(100) : divide(avgGain, avgLoss)
    let rsi = new Decimal(100).minus(new Decimal(100).dividedBy(rs.plus(1)))
    rsiValues.push(rsi.toNumber())

    // Calculate subsequent RSI values using smoothed averages
    for (let i = period; i < changes.length; i++) {
      // Smoothed average: (Previous Average × (period - 1) + Current Value) / period
      avgGain = avgGain.times(period - 1).plus(gains[i]).dividedBy(period)
      avgLoss = avgLoss.times(period - 1).plus(losses[i]).dividedBy(period)

      rs = avgLoss.isZero() ? new Decimal(100) : divide(avgGain, avgLoss)
      rsi = new Decimal(100).minus(new Decimal(100).dividedBy(rs.plus(1)))
      rsiValues.push(rsi.toNumber())
    }

    // Build history (using placeholder dates for now)
    const currentDate = new Date()
    for (let i = 0; i < rsiValues.length; i++) {
      const date = new Date(currentDate)
      date.setDate(date.getDate() - (rsiValues.length - 1 - i))
      history.push({ date, value: rsiValues[i] })
    }

    // Get current RSI value
    const currentRSI = rsiValues[rsiValues.length - 1]

    // Determine status
    let status: 'overbought' | 'oversold' | 'neutral'
    if (currentRSI > this.OVERBOUGHT_THRESHOLD) {
      status = 'overbought'
    } else if (currentRSI < this.OVERSOLD_THRESHOLD) {
      status = 'oversold'
    } else {
      status = 'neutral'
    }

    // Detect divergences
    const divergences = this.detectDivergence(priceDecimals.slice(period), rsiValues)

    return {
      value: currentRSI,
      status,
      history,
      divergences
    }
  }

  /**
   * Detect divergence between price and RSI
   * 
   * Bullish divergence: Price makes lower low, but RSI makes higher low
   * Bearish divergence: Price makes higher high, but RSI makes lower high
   * 
   * @param prices - Array of price values
   * @param rsiValues - Array of RSI values (must be same length as prices)
   * @returns Array of detected divergences
   * 
   * Requirements: 3.6
   */
  detectDivergence(
    prices: Decimal.Value[],
    rsiValues: number[]
  ): Divergence[] {
    if (prices.length !== rsiValues.length) {
      throw new Error('Prices and RSI values must have the same length')
    }

    if (prices.length < 5) {
      // Need at least 5 data points to detect meaningful divergence
      return []
    }

    const priceDecimals = prices.map(p => new Decimal(p))
    const divergences: Divergence[] = []

    // Look for local peaks and troughs
    const peaks: number[] = []
    const troughs: number[] = []

    for (let i = 2; i < priceDecimals.length - 2; i++) {
      const isPeak = priceDecimals[i].greaterThan(priceDecimals[i - 1]) &&
                     priceDecimals[i].greaterThan(priceDecimals[i - 2]) &&
                     priceDecimals[i].greaterThan(priceDecimals[i + 1]) &&
                     priceDecimals[i].greaterThan(priceDecimals[i + 2])
      
      const isTrough = priceDecimals[i].lessThan(priceDecimals[i - 1]) &&
                       priceDecimals[i].lessThan(priceDecimals[i - 2]) &&
                       priceDecimals[i].lessThan(priceDecimals[i + 1]) &&
                       priceDecimals[i].lessThan(priceDecimals[i + 2])

      if (isPeak) peaks.push(i)
      if (isTrough) troughs.push(i)
    }

    // Check for bearish divergence (price higher high, RSI lower high)
    for (let i = 1; i < peaks.length; i++) {
      const prevPeakIdx = peaks[i - 1]
      const currPeakIdx = peaks[i]

      const priceHigherHigh = priceDecimals[currPeakIdx].greaterThan(priceDecimals[prevPeakIdx])
      const rsiLowerHigh = rsiValues[currPeakIdx] < rsiValues[prevPeakIdx]

      if (priceHigherHigh && rsiLowerHigh) {
        divergences.push({
          type: 'bearish',
          startIndex: prevPeakIdx,
          endIndex: currPeakIdx,
          description: 'Price made higher high but RSI made lower high'
        })
      }
    }

    // Check for bullish divergence (price lower low, RSI higher low)
    for (let i = 1; i < troughs.length; i++) {
      const prevTroughIdx = troughs[i - 1]
      const currTroughIdx = troughs[i]

      const priceLowerLow = priceDecimals[currTroughIdx].lessThan(priceDecimals[prevTroughIdx])
      const rsiHigherLow = rsiValues[currTroughIdx] > rsiValues[prevTroughIdx]

      if (priceLowerLow && rsiHigherLow) {
        divergences.push({
          type: 'bullish',
          startIndex: prevTroughIdx,
          endIndex: currTroughIdx,
          description: 'Price made lower low but RSI made higher low'
        })
      }
    }

    return divergences
  }
}
