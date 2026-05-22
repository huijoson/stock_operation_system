import type { MACDResult } from '../../services/macd.service'

export interface RustMacdAddon {
  calculateMacd(
    prices: string[],
    fastPeriod: number,
    slowPeriod: number,
    signalPeriod: number
  ): {
    macdLine: number[]
    signalLine: number[]
    histogram: number[]
    crossovers: Array<{
      type: 'golden' | 'death'
      index: number
      macdValue: number
      signalValue: number
    }>
    currentSignal: 'bullish' | 'bearish' | 'neutral'
  }
}

export function calculateMacdViaNative(
  addon: RustMacdAddon,
  prices: string[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): MACDResult {
  const nativeResult = addon.calculateMacd(prices, fastPeriod, slowPeriod, signalPeriod)
  const currentDate = new Date()

  return {
    macdLine: nativeResult.macdLine,
    signalLine: nativeResult.signalLine,
    histogram: nativeResult.histogram,
    crossovers: nativeResult.crossovers.map((crossover) => {
      const date = new Date(currentDate)
      date.setDate(date.getDate() - (nativeResult.macdLine.length - 1 - crossover.index))

      return {
        type: crossover.type,
        index: crossover.index,
        date,
        macdValue: crossover.macdValue,
        signalValue: crossover.signalValue,
        description:
          crossover.type === 'golden'
            ? 'MACD line crossed above signal line (bullish signal)'
            : 'MACD line crossed below signal line (bearish signal)',
      }
    }),
    currentSignal: nativeResult.currentSignal,
  }
}
