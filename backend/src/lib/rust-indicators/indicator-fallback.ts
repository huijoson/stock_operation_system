import Decimal from 'decimal.js'

import { abs, divide } from '../calculations/decimal-utils'
import type { Divergence, RSIResult } from '../../services/rsi.service'
import type { Crossover, MACDResult } from '../../services/macd.service'
import type { BollingerBandsResult } from '../../services/bollinger-bands.service'

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

export function calculateMacdFallback(
  prices: Decimal.Value[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number,
  detectCrossover: (macdLine: number[], signalLine: number[]) => Crossover[]
): MACDResult {
  if (prices.length < slowPeriod + signalPeriod) {
    throw new Error(
      `Insufficient data: need at least ${slowPeriod + signalPeriod} prices for MACD calculation`
    )
  }

  const fastEMA = calculateEmaFallback(prices, fastPeriod)
  const slowEMA = calculateEmaFallback(prices, slowPeriod)
  const offset = slowPeriod - fastPeriod
  const alignedFastEMA = fastEMA.slice(offset)

  const macdLine: number[] = []
  for (let index = 0; index < slowEMA.length; index++) {
    const macdValue = new Decimal(alignedFastEMA[index]).minus(slowEMA[index])
    macdLine.push(macdValue.toNumber())
  }

  const signalLine = calculateEmaFallback(macdLine, signalPeriod)
  const alignedMACDLine = macdLine.slice(signalPeriod - 1)

  const histogram: number[] = []
  for (let index = 0; index < signalLine.length; index++) {
    const histogramValue = new Decimal(alignedMACDLine[index]).minus(signalLine[index])
    histogram.push(histogramValue.toNumber())
  }

  const crossovers = detectCrossover(alignedMACDLine, signalLine)

  let currentSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  const currentMACD = alignedMACDLine[alignedMACDLine.length - 1]
  const currentSignalValue = signalLine[signalLine.length - 1]

  if (currentMACD > currentSignalValue) {
    currentSignal = 'bullish'
  } else if (currentMACD < currentSignalValue) {
    currentSignal = 'bearish'
  }

  if (crossovers.length > 0) {
    const lastCrossover = crossovers[crossovers.length - 1]
    if (alignedMACDLine.length - lastCrossover.index <= 3) {
      currentSignal = lastCrossover.type === 'golden' ? 'bullish' : 'bearish'
    }
  }

  return {
    macdLine: alignedMACDLine,
    signalLine,
    histogram,
    crossovers,
    currentSignal,
  }
}

export function calculateBollingerFallback(
  prices: Decimal.Value[],
  period: number,
  stdDevMultiplier: number
): BollingerBandsResult {
  if (prices.length < period) {
    throw new Error(`Insufficient data: need at least ${period} prices for Bollinger Bands calculation`)
  }

  const middle = calculateSmaFallback(prices, period)
  const stdDev = calculateStandardDeviationFallback(prices, period, middle)
  const upper: Decimal[] = []
  const lower: Decimal[] = []
  const bandwidth: number[] = []

  for (let index = 0; index < middle.length; index++) {
    const upperBand = middle[index].plus(stdDev[index].times(stdDevMultiplier))
    const lowerBand = middle[index].minus(stdDev[index].times(stdDevMultiplier))
    upper.push(upperBand)
    lower.push(lowerBand)
    bandwidth.push(upperBand.minus(lowerBand).dividedBy(middle[index]).toNumber())
  }

  const currentPrice = new Decimal(prices[prices.length - 1])
  const currentUpper = upper[upper.length - 1]
  const currentLower = lower[lower.length - 1]

  const currentPosition = currentPrice.greaterThan(currentUpper)
    ? 'above_upper'
    : currentPrice.lessThan(currentLower)
      ? 'below_lower'
      : 'within_bands'

  return {
    upper,
    middle,
    lower,
    bandwidth,
    currentPosition,
  }
}

function calculateSmaFallback(prices: Decimal.Value[], period: number): Decimal[] {
  if (prices.length < period) {
    throw new Error(`Insufficient data: need at least ${period} prices for SMA calculation`)
  }

  const priceDecimals = prices.map((price) => new Decimal(price))
  const smaValues: Decimal[] = []

  for (let index = period - 1; index < priceDecimals.length; index++) {
    const sum = priceDecimals
      .slice(index - period + 1, index + 1)
      .reduce((accumulator, price) => accumulator.plus(price), new Decimal(0))
    smaValues.push(sum.dividedBy(period))
  }

  return smaValues
}

function calculateStandardDeviationFallback(
  prices: Decimal.Value[],
  period: number,
  smaValues?: Decimal[]
): Decimal[] {
  if (prices.length < period) {
    throw new Error(`Insufficient data: need at least ${period} prices for standard deviation calculation`)
  }

  const priceDecimals = prices.map((price) => new Decimal(price))
  const smas = smaValues || calculateSmaFallback(prices, period)
  const stdDevValues: Decimal[] = []

  for (let index = period - 1; index < priceDecimals.length; index++) {
    const smaIndex = index - period + 1
    const sma = smas[smaIndex]
    const variance = priceDecimals
      .slice(index - period + 1, index + 1)
      .reduce((accumulator, price) => {
        const diff = price.minus(sma)
        return accumulator.plus(diff.times(diff))
      }, new Decimal(0))
      .dividedBy(period)

    stdDevValues.push(new Decimal(Math.sqrt(variance.toNumber())))
  }

  return stdDevValues
}

function calculateEmaFallback(prices: Decimal.Value[], period: number): number[] {
  if (prices.length < period) {
    throw new Error(`Insufficient data: need at least ${period} prices for EMA calculation`)
  }

  const priceDecimals = prices.map((price) => new Decimal(price))
  const emaValues: number[] = []
  const alpha = new Decimal(2).dividedBy(period + 1)

  let ema = priceDecimals
    .slice(0, period)
    .reduce((sum, price) => sum.plus(price), new Decimal(0))
    .dividedBy(period)
  emaValues.push(ema.toNumber())

  for (let index = period; index < priceDecimals.length; index++) {
    ema = ema.times(new Decimal(1).minus(alpha)).plus(priceDecimals[index].times(alpha))
    emaValues.push(ema.toNumber())
  }

  return emaValues
}
