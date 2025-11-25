import Decimal from 'decimal.js'
import { MACDService } from './macd.service'
import { ATRService } from './atr.service'
import { RSIService } from './rsi.service'
import { BollingerBandsService } from './bollinger-bands.service'
import { indicatorCacheService } from './indicator-cache.service'

/**
 * Preprocessed data cache for common calculations
 */
interface PreprocessedData {
  sma: Map<number, number[]>
  ema: Map<number, number[]>
  stdDev: Map<number, number[]>
  trueRange: Decimal[]
}

/**
 * Incremental calculation state for EMA
 */
interface EMAState {
  value: Decimal
  period: number
  alpha: Decimal
}

/**
 * Incremental calculation state for ATR
 */
interface ATRState {
  value: Decimal
  period: number
}

/**
 * IndicatorOptimizationService provides performance optimizations for indicator calculations
 * including incremental updates, parallel processing, and data preprocessing cache.
 * 
 * Requirements: 11.1, 11.2
 */
export class IndicatorOptimizationService {
  private macdService = new MACDService()
  private atrService = new ATRService()
  private rsiService = new RSIService()
  private bollingerService = new BollingerBandsService()
  
  // In-memory preprocessing cache
  private preprocessCache = new Map<string, PreprocessedData>()

  /**
   * Calculate multiple indicators in parallel
   * 
   * Executes multiple indicator calculations concurrently to improve performance.
   * 
   * @param symbol - Stock symbol
   * @param prices - Price data
   * @param indicators - Array of indicator types to calculate
   * @returns Object with results for each requested indicator
   * 
   * Requirements: 11.1
   */
  async calculateParallel(
    symbol: string,
    prices: {
      closes: Decimal.Value[]
      highs?: Decimal.Value[]
      lows?: Decimal.Value[]
    },
    indicators: Array<'RSI' | 'MACD' | 'BOLLINGER' | 'ATR'>
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {}
    
    // Create array of promises for parallel execution
    const promises = indicators.map(async (indicator) => {
      try {
        let result
        
        switch (indicator) {
          case 'RSI':
            result = await this.calculateWithCache(
              symbol,
              'RSI',
              14,
              () => this.rsiService.calculateRSI(prices.closes, 14)
            )
            break
            
          case 'MACD':
            result = await this.calculateWithCache(
              symbol,
              'MACD',
              12,
              () => this.macdService.calculateMACD(prices.closes)
            )
            break
            
          case 'BOLLINGER':
            result = await this.calculateWithCache(
              symbol,
              'BOLLINGER',
              20,
              () => this.bollingerService.calculateBands(prices.closes, 20, 2)
            )
            break
            
          case 'ATR':
            if (!prices.highs || !prices.lows) {
              throw new Error('ATR requires high and low prices')
            }
            result = await this.calculateWithCache(
              symbol,
              'ATR',
              14,
              () => this.atrService.calculateATR(prices.highs!, prices.lows!, prices.closes, 14)
            )
            break
        }
        
        return { indicator, result }
      } catch (error) {
        console.error(`Error calculating ${indicator}:`, error)
        return { indicator, result: null, error }
      }
    })
    
    // Wait for all calculations to complete
    const settled = await Promise.all(promises)
    
    // Organize results
    settled.forEach(({ indicator, result }) => {
      results[indicator] = result
    })
    
    return results
  }

  /**
   * Calculate indicator with cache check
   * 
   * @param symbol - Stock symbol
   * @param indicatorType - Type of indicator
   * @param period - Period parameter
   * @param calculator - Function to calculate the indicator
   * @returns Cached or calculated result
   */
  private async calculateWithCache(
    symbol: string,
    indicatorType: string,
    period: number,
    calculator: () => any
  ): Promise<any> {
    // Check cache first
    const cached = await indicatorCacheService.get(symbol, indicatorType, period)
    if (cached) {
      return cached.data
    }
    
    // Calculate if not cached
    const result = calculator()
    
    // Store in cache
    await indicatorCacheService.set(symbol, indicatorType, period, result)
    
    return result
  }

  /**
   * Preprocess common calculations for a price series
   * 
   * Calculates and caches common intermediate values (SMA, EMA, standard deviation)
   * that are used by multiple indicators.
   * 
   * @param symbol - Stock symbol
   * @param prices - Array of prices
   * @param periods - Array of periods to preprocess (default: [9, 12, 14, 20, 26])
   * @returns Preprocessed data
   * 
   * Requirements: 11.1
   */
  preprocessData(
    symbol: string,
    prices: Decimal.Value[],
    periods: number[] = [9, 12, 14, 20, 26]
  ): PreprocessedData {
    // Check if already cached
    const cacheKey = `${symbol}:${prices.length}`
    const cached = this.preprocessCache.get(cacheKey)
    if (cached) {
      return cached
    }

    const preprocessed: PreprocessedData = {
      sma: new Map(),
      ema: new Map(),
      stdDev: new Map(),
      trueRange: []
    }

    // Calculate SMA, EMA, and standard deviation for each period
    periods.forEach(period => {
      if (prices.length >= period) {
        // Calculate SMA
        const sma = this.bollingerService.calculateSMA(prices, period)
        preprocessed.sma.set(period, sma.map(d => d.toNumber()))

        // Calculate EMA
        const ema = this.macdService.calculateEMA(prices, period)
        preprocessed.ema.set(period, ema)

        // Calculate standard deviation
        const stdDev = this.bollingerService.calculateStandardDeviation(prices, period)
        preprocessed.stdDev.set(period, stdDev.map(d => d.toNumber()))
      }
    })

    // Cache the preprocessed data
    this.preprocessCache.set(cacheKey, preprocessed)

    // Limit cache size to prevent memory issues
    if (this.preprocessCache.size > 100) {
      const firstKey = this.preprocessCache.keys().next().value
      if (firstKey !== undefined) {
        this.preprocessCache.delete(firstKey)
      }
    }

    return preprocessed
  }

  /**
   * Update EMA incrementally with new price
   * 
   * Instead of recalculating the entire EMA series, this method updates
   * the EMA value incrementally when a new price is added.
   * 
   * Formula: New EMA = Previous EMA × (1 - α) + New Price × α
   * Where α = 2 / (period + 1)
   * 
   * @param state - Current EMA state
   * @param newPrice - New price to incorporate
   * @returns Updated EMA state
   * 
   * Requirements: 11.1
   */
  updateEMAIncremental(state: EMAState, newPrice: Decimal.Value): EMAState {
    const price = new Decimal(newPrice)
    const newValue = state.value
      .times(new Decimal(1).minus(state.alpha))
      .plus(price.times(state.alpha))

    return {
      ...state,
      value: newValue
    }
  }

  /**
   * Create initial EMA state from price series
   * 
   * @param prices - Historical prices
   * @param period - EMA period
   * @returns Initial EMA state
   */
  createEMAState(prices: Decimal.Value[], period: number): EMAState {
    if (prices.length < period) {
      throw new Error(`Need at least ${period} prices to initialize EMA`)
    }

    const priceDecimals = prices.map(p => new Decimal(p))
    const alpha = new Decimal(2).dividedBy(period + 1)

    // Calculate initial SMA
    const initialSMA = priceDecimals
      .slice(0, period)
      .reduce((sum, p) => sum.plus(p), new Decimal(0))
      .dividedBy(period)

    // Calculate EMA up to the last price
    let ema = initialSMA
    for (let i = period; i < priceDecimals.length; i++) {
      ema = ema.times(new Decimal(1).minus(alpha)).plus(priceDecimals[i].times(alpha))
    }

    return {
      value: ema,
      period,
      alpha
    }
  }

  /**
   * Update ATR incrementally with new price data
   * 
   * Instead of recalculating the entire ATR series, this method updates
   * the ATR value incrementally when new price data is added.
   * 
   * Formula: New ATR = (Previous ATR × (period - 1) + Current TR) / period
   * 
   * @param state - Current ATR state
   * @param high - New high price
   * @param low - New low price
   * @param previousClose - Previous closing price
   * @returns Updated ATR state
   * 
   * Requirements: 11.1
   */
  updateATRIncremental(
    state: ATRState,
    high: Decimal.Value,
    low: Decimal.Value,
    previousClose: Decimal.Value
  ): ATRState {
    const tr = this.atrService.calculateTrueRange(high, low, previousClose)
    const newValue = state.value
      .times(state.period - 1)
      .plus(tr)
      .dividedBy(state.period)

    return {
      ...state,
      value: newValue
    }
  }

  /**
   * Create initial ATR state from price series
   * 
   * @param highs - Historical high prices
   * @param lows - Historical low prices
   * @param closes - Historical closing prices
   * @param period - ATR period
   * @returns Initial ATR state
   */
  createATRState(
    highs: Decimal.Value[],
    lows: Decimal.Value[],
    closes: Decimal.Value[],
    period: number
  ): ATRState {
    const result = this.atrService.calculateATR(highs, lows, closes, period)
    
    return {
      value: result.value,
      period
    }
  }

  /**
   * Clear preprocessing cache
   * 
   * Clears the in-memory preprocessing cache. Useful for testing or
   * when memory needs to be freed.
   */
  clearPreprocessCache(): void {
    this.preprocessCache.clear()
  }

  /**
   * Get preprocessing cache statistics
   * 
   * @returns Cache statistics
   */
  getPreprocessCacheStats(): {
    size: number
    keys: string[]
  } {
    return {
      size: this.preprocessCache.size,
      keys: Array.from(this.preprocessCache.keys())
    }
  }
}

// Export singleton instance
export const indicatorOptimizationService = new IndicatorOptimizationService()
