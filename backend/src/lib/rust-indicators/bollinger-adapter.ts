import Decimal from 'decimal.js'

import type { BollingerBandsResult } from '../../services/bollinger-bands.service'

export interface RustBollingerAddon {
  calculateBollinger(
    prices: string[],
    period: number,
    stdDevMultiplier: string
  ): {
    upper: number[]
    middle: string[]
    lower: number[]
    bandwidth: number[]
    currentPosition: 'above_upper' | 'below_lower' | 'within_bands'
  }
}

export function calculateBollingerViaNative(
  addon: RustBollingerAddon,
  prices: Decimal.Value[],
  period: number,
  stdDevMultiplier: number
): BollingerBandsResult {
  const priceStrings = prices.map((price) => new Decimal(price).toString())
  const nativeResult = addon.calculateBollinger(
    priceStrings,
    period,
    new Decimal(stdDevMultiplier).toString()
  )

  return {
    upper: nativeResult.upper.map((value) => new Decimal(value)),
    middle: nativeResult.middle.map((value) => new Decimal(value)),
    lower: nativeResult.lower.map((value) => new Decimal(value)),
    bandwidth: nativeResult.bandwidth,
    currentPosition: nativeResult.currentPosition,
  }
}
