import Decimal from 'decimal.js'

import { abs, divide } from '../calculations/decimal-utils'
import type { Divergence, RSIResult } from '../../services/rsi.service'

export function calculateRsiFallback(
  prices: Decimal.Value[],
  period: number,
  detectDivergence: (prices: Decimal.Value[], rsiValues: number[]) => Divergence[]
): RSIResult {
  if (prices.length < period + 1) {
    throw new Error(`Insufficient data: need at least ${period + 1} prices for RSI calculation`)
  }

  const priceDecimals = prices.map((price) => new Decimal(price))
  const history: Array<{ date: Date; value: number }> = []

  const changes: Decimal[] = []
  for (let index = 1; index < priceDecimals.length; index++) {
    changes.push(priceDecimals[index].minus(priceDecimals[index - 1]))
  }

  const gains = changes.map((change) =>
    change.greaterThan(0) ? change : new Decimal(0)
  )
  const losses = changes.map((change) =>
    change.lessThan(0) ? abs(change) : new Decimal(0)
  )

  let avgGain = gains
    .slice(0, period)
    .reduce((sum, gain) => sum.plus(gain), new Decimal(0))
    .dividedBy(period)
  let avgLoss = losses
    .slice(0, period)
    .reduce((sum, loss) => sum.plus(loss), new Decimal(0))
    .dividedBy(period)

  const rsiValues: number[] = []
  let rs = avgLoss.isZero() ? new Decimal(100) : divide(avgGain, avgLoss)
  let rsi = new Decimal(100).minus(new Decimal(100).dividedBy(rs.plus(1)))
  rsiValues.push(rsi.toNumber())

  for (let index = period; index < changes.length; index++) {
    avgGain = avgGain.times(period - 1).plus(gains[index]).dividedBy(period)
    avgLoss = avgLoss.times(period - 1).plus(losses[index]).dividedBy(period)

    rs = avgLoss.isZero() ? new Decimal(100) : divide(avgGain, avgLoss)
    rsi = new Decimal(100).minus(new Decimal(100).dividedBy(rs.plus(1)))
    rsiValues.push(rsi.toNumber())
  }

  const currentDate = new Date()
  for (let index = 0; index < rsiValues.length; index++) {
    const date = new Date(currentDate)
    date.setDate(date.getDate() - (rsiValues.length - 1 - index))
    history.push({ date, value: rsiValues[index] })
  }

  const currentRSI = rsiValues[rsiValues.length - 1]
  const status = currentRSI > 70
    ? 'overbought'
    : currentRSI < 30
      ? 'oversold'
      : 'neutral'

  const divergences = detectDivergence(priceDecimals.slice(period), rsiValues)

  return {
    value: currentRSI,
    status,
    history,
    divergences,
  }
}
