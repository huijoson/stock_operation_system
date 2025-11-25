import Decimal from 'decimal.js'

/**
 * ATR calculation result
 */
export interface ATRResult {
  value: Decimal
  history: Array<{ date: Date; value: Decimal }>
  volatilityStatus: 'high' | 'medium' | 'low'
}

/**
 * ATRService handles ATR (Average True Range) calculations for technical analysis.
 * 
 * ATR is a volatility indicator that measures the average range of price movement.
 * It helps traders assess market volatility and set appropriate stop-loss levels.
 */
export class ATRService {
  private readonly DEFAULT_PERIOD = 14

  /**
   * Calculate True Range (TR)
   * 
   * TR = max(High - Low, |High - Previous Close|, |Low - Previous Close|)
   * 
   * @param high - Current high price
   * @param low - Current low price
   * @param previousClose - Previous closing price
   * @returns True Range value
   */
  calculateTrueRange(high: Decimal.Value, low: Decimal.Value, previousClose: Decimal.Value): Decimal {
    const highDecimal = new Decimal(high)
    const lowDecimal = new Decimal(low)
    const prevCloseDecimal = new Decimal(previousClose)

    // Calculate three values
    const range1 = highDecimal.minus(lowDecimal) // High - Low
    const range2 = highDecimal.minus(prevCloseDecimal).abs() // |High - Previous Close|
    const range3 = lowDecimal.minus(prevCloseDecimal).abs() // |Low - Previous Close|

    // Return the maximum
    return Decimal.max(range1, range2, range3)
  }

  /**
   * Calculate ATR (Average True Range)
   * 
   * Formula: ATR = (Previous ATR × (period - 1) + Current TR) / period
   * 
   * The first ATR value is calculated as the simple average of the first 'period' TR values.
   * 
   * @param highs - Array of high prices
   * @param lows - Array of low prices
   * @param closes - Array of closing prices
   * @param period - Period for ATR calculation (default: 14)
   * @returns ATR calculation result
   * 
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   */
  calculateATR(
    highs: Decimal.Value[],
    lows: Decimal.Value[],
    closes: Decimal.Value[],
    period: number = this.DEFAULT_PERIOD
  ): ATRResult {
    if (highs.length !== lows.length || highs.length !== closes.length) {
      throw new Error('Highs, lows, and closes arrays must have the same length')
    }

    if (highs.length < period + 1) {
      throw new Error(`Insufficient data: need at least ${period + 1} data points for ATR calculation`)
    }

    const trValues: Decimal[] = []
    const atrHistory: Array<{ date: Date; value: Decimal }> = []
    const currentDate = new Date()

    // Calculate True Range for each period (starting from index 1)
    for (let i = 1; i < highs.length; i++) {
      const tr = this.calculateTrueRange(highs[i], lows[i], closes[i - 1])
      trValues.push(tr)
    }

    // Calculate first ATR as simple average of first 'period' TR values
    let atr = trValues
      .slice(0, period)
      .reduce((sum, tr) => sum.plus(tr), new Decimal(0))
      .dividedBy(period)

    // Add first ATR to history
    const firstDate = new Date(currentDate)
    firstDate.setDate(firstDate.getDate() - (trValues.length - period))
    atrHistory.push({ date: firstDate, value: atr })

    // Calculate subsequent ATR values using the smoothing formula
    // ATR = (Previous ATR × (period - 1) + Current TR) / period
    for (let i = period; i < trValues.length; i++) {
      atr = atr.times(period - 1).plus(trValues[i]).dividedBy(period)
      
      const date = new Date(currentDate)
      date.setDate(date.getDate() - (trValues.length - 1 - i))
      atrHistory.push({ date, value: atr })
    }

    // Determine volatility status
    // Calculate average ATR over the history
    const avgATR = atrHistory
      .reduce((sum, item) => sum.plus(item.value), new Decimal(0))
      .dividedBy(atrHistory.length)

    const currentATR = atr
    let volatilityStatus: 'high' | 'medium' | 'low'

    if (currentATR.greaterThan(avgATR.times(1.2))) {
      volatilityStatus = 'high'
    } else if (currentATR.lessThan(avgATR.times(0.8))) {
      volatilityStatus = 'low'
    } else {
      volatilityStatus = 'medium'
    }

    return {
      value: atr,
      history: atrHistory,
      volatilityStatus
    }
  }

  /**
   * Suggest stop-loss level based on ATR
   * 
   * A common approach is to set stop-loss at 2× ATR below the entry price for long positions,
   * or 2× ATR above the entry price for short positions.
   * 
   * @param currentPrice - Current price or entry price
   * @param atr - ATR value
   * @param multiplier - ATR multiplier (default: 2)
   * @param isLong - True for long position, false for short position (default: true)
   * @returns Suggested stop-loss price
   * 
   * Requirements: 6.5
   */
  suggestStopLoss(
    currentPrice: Decimal.Value,
    atr: Decimal.Value,
    multiplier: number = 2,
    isLong: boolean = true
  ): Decimal {
    const price = new Decimal(currentPrice)
    const atrValue = new Decimal(atr)
    const distance = atrValue.times(multiplier)

    if (isLong) {
      // For long positions: stop-loss below entry price
      return price.minus(distance)
    } else {
      // For short positions: stop-loss above entry price
      return price.plus(distance)
    }
  }
}
