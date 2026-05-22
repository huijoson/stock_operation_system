import Decimal from 'decimal.js'

import type { Divergence, RSIResult } from '../../services/rsi.service'

export interface RustRsiAddon {
  calculateRsi(prices: string[], period: number): {
    value: number
    status: 'overbought' | 'oversold' | 'neutral'
    history: number[]
  }
}

export function calculateRsiViaNative(
  addon: RustRsiAddon,
  prices: Decimal.Value[],
  period: number,
  detectDivergence: (prices: Decimal.Value[], rsiValues: number[]) => Divergence[]
): RSIResult {
  const priceStrings = prices.map((price) => new Decimal(price).toString())
  const nativeResult = addon.calculateRsi(priceStrings, period)
  const history = buildRsiHistory(nativeResult.history)
  const priceDecimals = prices.map((price) => new Decimal(price))
  const divergences = detectDivergence(priceDecimals.slice(period), nativeResult.history)

  return {
    value: nativeResult.value,
    status: nativeResult.status,
    history,
    divergences,
  }
}

function buildRsiHistory(values: number[]): Array<{ date: Date; value: number }> {
  const history: Array<{ date: Date; value: number }> = []
  const currentDate = new Date()

  for (let index = 0; index < values.length; index++) {
    const date = new Date(currentDate)
    date.setDate(date.getDate() - (values.length - 1 - index))
    history.push({ date, value: values[index] })
  }

  return history
}
