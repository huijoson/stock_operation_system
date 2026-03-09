import { Request, Response, Router } from 'express'
import Decimal from 'decimal.js'
import prisma from '../lib/prisma'
import { ATRService } from '../services/atr.service'
import { BollingerBandsService } from '../services/bollinger-bands.service'
import { CandlestickPatternService } from '../services/candlestick-pattern.service'
import { FibonacciService } from '../services/fibonacci.service'
import { IndicatorCacheService } from '../services/indicator-cache.service'
import { MACDService } from '../services/macd.service'
import { RSIService } from '../services/rsi.service'
import { StockService } from '../services/stock.service'
import { SupportResistanceService } from '../services/support-resistance.service'
import { TechnicalScoreService } from '../services/technical-score.service'

const router = Router()

const atrService = new ATRService()
const bollingerService = new BollingerBandsService()
const patternService = new CandlestickPatternService()
const fibonacciService = new FibonacciService()
const technicalScoreService = new TechnicalScoreService()
const supportResistanceService = new SupportResistanceService()
const macdService = new MACDService()
const rsiService = new RSIService()
const stockService = new StockService(prisma)
const cacheService = new IndicatorCacheService()

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key]
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0]
  }
  return undefined
}

router.get('/rsi', async (req: Request, res: Response) => {
  try {
    const symbol = getQueryParam(req, 'symbol')
    const periodParam = getQueryParam(req, 'period')
    const daysParam = getQueryParam(req, 'days')

    if (!symbol) {
      return res.status(400).json({ error: 'symbol parameter is required' })
    }

    const period = periodParam ? parseInt(periodParam, 10) : 14
    const days = daysParam ? parseInt(daysParam, 10) : 100

    if (isNaN(period) || period < 2) {
      return res.status(400).json({ error: 'period must be a number greater than or equal to 2' })
    }

    if (isNaN(days) || days < 1) {
      return res.status(400).json({ error: 'days must be a positive number' })
    }

    const cached = await cacheService.get(symbol, 'RSI', period)
    if (cached && cached.data.history && cached.data.history[0]?.rsi !== undefined) {
      return res.json(cached.data)
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days - period)

    const history = await stockService.getHistoricalOHLC(symbol, startDate, endDate)

    if (history.length < period + 1) {
      return res.status(400).json({ error: `Insufficient data. Need at least ${period + 1} data points` })
    }

    const prices = history.map(h => h.close)
    const result = rsiService.calculateRSI(prices, period)

    const response = {
      symbol,
      period,
      value: result.value,
      status: result.status,
      history: result.history.slice(-days).map(h => ({
        date: h.date.toISOString().split('T')[0],
        rsi: h.value,
      })),
      divergences: result.divergences,
      timestamp: new Date().toISOString(),
    }

    await cacheService.set(symbol, 'RSI', period, response, 1)

    return res.json(response)
  } catch (error) {
    console.error('Error calculating RSI:', error)

    if (error instanceof Error) {
      if (error.message.includes('Stock not found')) {
        return res.status(404).json({
          error: `Stock not found: ${getQueryParam(req, 'symbol')}`,
        })
      }

      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Failed to calculate RSI' })
  }
})

router.get('/macd', async (req: Request, res: Response) => {
  try {
    const symbol = getQueryParam(req, 'symbol')
    const fastPeriodParam = getQueryParam(req, 'fastPeriod')
    const slowPeriodParam = getQueryParam(req, 'slowPeriod')
    const signalPeriodParam = getQueryParam(req, 'signalPeriod')
    const daysParam = getQueryParam(req, 'days')

    if (!symbol) {
      return res.status(400).json({ error: 'symbol parameter is required' })
    }

    const fastPeriod = fastPeriodParam ? parseInt(fastPeriodParam, 10) : 12
    const slowPeriod = slowPeriodParam ? parseInt(slowPeriodParam, 10) : 26
    const signalPeriod = signalPeriodParam ? parseInt(signalPeriodParam, 10) : 9
    const days = daysParam ? parseInt(daysParam, 10) : 100

    if (isNaN(fastPeriod) || fastPeriod < 1) {
      return res.status(400).json({ error: 'fastPeriod must be a positive number' })
    }

    if (isNaN(slowPeriod) || slowPeriod < 1) {
      return res.status(400).json({ error: 'slowPeriod must be a positive number' })
    }

    if (isNaN(signalPeriod) || signalPeriod < 1) {
      return res.status(400).json({ error: 'signalPeriod must be a positive number' })
    }

    if (fastPeriod >= slowPeriod) {
      return res.status(400).json({ error: 'fastPeriod must be less than slowPeriod' })
    }

    if (isNaN(days) || days < 1) {
      return res.status(400).json({ error: 'days must be a positive number' })
    }

    const cached = await cacheService.get(symbol, 'MACD', slowPeriod)
    if (cached) {
      return res.json(cached.data)
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days - slowPeriod - signalPeriod)

    const history = await stockService.getHistoricalOHLC(symbol, startDate, endDate)

    const minDataPoints = slowPeriod + signalPeriod
    if (history.length < minDataPoints) {
      return res.status(400).json({ error: `Insufficient data. Need at least ${minDataPoints} data points` })
    }

    const prices = history.map(h => h.close)
    const result = macdService.calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod)

    const slicedHistory = history.slice(-days)
    const slicedMacdLine = result.macdLine.slice(-days)
    const slicedSignalLine = result.signalLine.slice(-days)
    const slicedHistogram = result.histogram.slice(-days)

    const response = {
      symbol,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      macdLine: slicedMacdLine.map(v => Number(v)),
      signalLine: slicedSignalLine.map(v => Number(v)),
      histogram: slicedHistogram.map((h, idx) => ({
        date: slicedHistory[idx].date.toISOString().split('T')[0],
        value: Number(h),
      })),
      crossovers: result.crossovers.filter((_, idx) => idx >= result.crossovers.length - days),
      currentSignal: result.currentSignal,
      history: slicedHistogram.map((h, idx) => ({
        date: slicedHistory[idx].date.toISOString().split('T')[0],
        macd: Number(slicedMacdLine[idx]),
        signal: Number(slicedSignalLine[idx]),
        histogram: Number(h),
      })),
      timestamp: new Date().toISOString(),
    }

    await cacheService.set(symbol, 'MACD', slowPeriod, response, 1)

    return res.json(response)
  } catch (error) {
    console.error('Error calculating MACD:', error)

    if (error instanceof Error) {
      if (error.message.includes('Stock not found')) {
        return res.status(404).json({
          error: `Stock not found: ${getQueryParam(req, 'symbol')}`,
        })
      }

      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Failed to calculate MACD' })
  }
})

router.get('/bollinger', async (req: Request, res: Response) => {
  try {
    const symbol = getQueryParam(req, 'symbol')
    const periodParam = getQueryParam(req, 'period')
    const stdDevParam = getQueryParam(req, 'stdDev')
    const daysParam = getQueryParam(req, 'days')

    if (!symbol) {
      return res.status(400).json({ error: 'symbol parameter is required' })
    }

    const period = periodParam ? parseInt(periodParam, 10) : 20
    const stdDev = stdDevParam ? parseFloat(stdDevParam) : 2
    const days = daysParam ? parseInt(daysParam, 10) : 100

    if (isNaN(period) || period < 2) {
      return res.status(400).json({ error: 'period must be a number greater than or equal to 2' })
    }

    if (isNaN(stdDev) || stdDev <= 0) {
      return res.status(400).json({ error: 'stdDev must be a positive number' })
    }

    if (isNaN(days) || days < 1) {
      return res.status(400).json({ error: 'days must be a positive number' })
    }

    const cached = await cacheService.get(symbol, 'BOLLINGER', period)
    if (cached && cached.data.history && cached.data.history[0]?.price !== undefined) {
      return res.json(cached.data)
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days - period)

    const history = await stockService.getHistoricalOHLC(symbol, startDate, endDate)

    if (history.length < period) {
      return res.status(400).json({ error: `Insufficient data. Need at least ${period} data points` })
    }

    const prices = history.map(h => h.close)
    const result = bollingerService.calculateBands(prices, period, stdDev)

    const slicedData = {
      upper: result.upper.slice(-days),
      middle: result.middle.slice(-days),
      lower: result.lower.slice(-days),
      bandwidth: result.bandwidth.slice(-days),
    }

    const currentDate = new Date()
    const slicedPrices = prices.slice(-days)
    const historyData = slicedData.upper.map((_, idx) => {
      const date = new Date(currentDate)
      date.setDate(date.getDate() - (slicedData.upper.length - 1 - idx))
      return {
        date: date.toISOString().split('T')[0],
        price: slicedPrices[idx],
        upper: slicedData.upper[idx].toNumber(),
        middle: slicedData.middle[idx].toNumber(),
        lower: slicedData.lower[idx].toNumber(),
        bandwidth: slicedData.bandwidth[idx],
      }
    })

    const response = {
      symbol,
      period,
      stdDev,
      history: historyData,
      currentPosition: result.currentPosition,
      isSqueezed: bollingerService.detectSqueeze(result, 20),
      squeezeThreshold: 0.5,
      expansionThreshold: 1.5,
      timestamp: new Date().toISOString(),
    }

    await cacheService.set(symbol, 'BOLLINGER', period, response, 1)

    return res.json(response)
  } catch (error) {
    console.error('Error calculating Bollinger Bands:', error)

    if (error instanceof Error) {
      if (error.message.includes('Stock not found')) {
        return res.status(404).json({
          error: `Stock not found: ${getQueryParam(req, 'symbol')}`,
        })
      }

      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Failed to calculate Bollinger Bands' })
  }
})

router.get('/atr', async (req: Request, res: Response) => {
  try {
    const symbol = getQueryParam(req, 'symbol')
    const periodParam = getQueryParam(req, 'period')
    const daysParam = getQueryParam(req, 'days')

    if (!symbol) {
      return res.status(400).json({ error: 'symbol parameter is required' })
    }

    const period = periodParam ? parseInt(periodParam, 10) : 14
    const days = daysParam ? parseInt(daysParam, 10) : 100

    if (isNaN(period) || period < 1) {
      return res.status(400).json({ error: 'period must be a positive number' })
    }

    if (isNaN(days) || days < 1) {
      return res.status(400).json({ error: 'days must be a positive number' })
    }

    const cached = await cacheService.get(symbol, 'ATR', period)
    if (cached) {
      return res.json(cached.data)
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days - period)

    const history = await stockService.getHistoricalOHLC(symbol, startDate, endDate)

    if (history.length < period + 1) {
      return res.status(400).json({ error: `Insufficient data. Need at least ${period + 1} data points` })
    }

    const highs = history.map(h => h.high)
    const lows = history.map(h => h.low)
    const closes = history.map(h => h.close)
    const result = atrService.calculateATR(highs, lows, closes, period)

    const currentPrice = closes[closes.length - 1]
    const suggestedStopLoss = atrService.suggestStopLoss(currentPrice, result.value, 2)

    const response = {
      symbol,
      period,
      value: result.value.toNumber(),
      history: result.history.slice(-days).map(h => ({
        date: h.date,
        value: h.value.toNumber(),
      })),
      volatilityStatus: result.volatilityStatus,
      suggestedStopLoss: suggestedStopLoss.toNumber(),
      timestamp: new Date().toISOString(),
    }

    await cacheService.set(symbol, 'ATR', period, response, 1)

    return res.json(response)
  } catch (error) {
    console.error('Error calculating ATR:', error)

    if (error instanceof Error) {
      if (error.message.includes('Stock not found')) {
        return res.status(404).json({
          error: `Stock not found: ${getQueryParam(req, 'symbol')}`,
        })
      }

      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Failed to calculate ATR' })
  }
})

router.get('/support-resistance', async (req: Request, res: Response) => {
  try {
    const symbol = getQueryParam(req, 'symbol')
    const periodParam = getQueryParam(req, 'period')
    const toleranceParam = getQueryParam(req, 'tolerance')

    if (!symbol) {
      return res.status(400).json({ error: 'symbol parameter is required' })
    }

    const period = periodParam ? parseInt(periodParam, 10) : 90
    const tolerance = toleranceParam ? parseFloat(toleranceParam) : 0.03

    if (isNaN(period) || period < 10) {
      return res.status(400).json({ error: 'period must be a number greater than or equal to 10' })
    }

    if (isNaN(tolerance) || tolerance <= 0 || tolerance >= 1) {
      return res.status(400).json({ error: 'tolerance must be a number between 0 and 1' })
    }

    const cached = await cacheService.get(symbol, 'SUPPORT_RESISTANCE', period)
    if (cached) {
      return res.json(cached.data)
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)

    const history = await stockService.getHistoricalOHLC(symbol, startDate, endDate)

    if (history.length < 10) {
      return res.status(400).json({ error: 'Insufficient data. Need at least 10 data points' })
    }

    const closePrices = history.map(h => h.close)
    const currentPrice = closePrices[closePrices.length - 1]

    const result = supportResistanceService.calculateLevels(closePrices, [30, 60, 90], currentPrice)

    const highs = history.map(h => h.high)
    const lows = history.map(h => h.low)
    const high = highs.reduce((max, h) => (h.gt(max) ? h : max), highs[0])
    const low = lows.reduce((min, l) => (l.lt(min) ? l : min), lows[0])
    const goldenRatioLevels = supportResistanceService.findGoldenRatioLevels(high, low)

    const response = {
      symbol,
      period,
      currentPrice: currentPrice.toString(),
      supports: result.supports.map(level => ({
        price: level.price.toString(),
        strength: level.strength,
        touches: level.touches,
      })),
      resistances: result.resistances.map(level => ({
        price: level.price.toString(),
        strength: level.strength,
        touches: level.touches,
      })),
      currentNearestSupport: result.currentNearestSupport
        ? {
            price: result.currentNearestSupport.price.toString(),
            strength: result.currentNearestSupport.strength,
            touches: result.currentNearestSupport.touches,
          }
        : null,
      currentNearestResistance: result.currentNearestResistance
        ? {
            price: result.currentNearestResistance.price.toString(),
            strength: result.currentNearestResistance.strength,
            touches: result.currentNearestResistance.touches,
          }
        : null,
      goldenRatioLevels: goldenRatioLevels.levels.map(level => ({
        ratio: level.ratio,
        price: level.price.toString(),
        label: level.label,
      })),
      timestamp: new Date().toISOString(),
    }

    await cacheService.set(symbol, 'SUPPORT_RESISTANCE', period, response, 1)

    return res.json(response)
  } catch (error) {
    console.error('Error calculating support/resistance:', error)

    if (error instanceof Error) {
      if (error.message.includes('Stock not found')) {
        return res.status(404).json({
          error: `Stock not found: ${getQueryParam(req, 'symbol')}`,
        })
      }

      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Failed to calculate support/resistance levels' })
  }
})

router.get('/technical-score', async (req: Request, res: Response) => {
  try {
    const symbol = getQueryParam(req, 'symbol')

    if (!symbol) {
      return res.status(400).json({ error: 'symbol parameter is required' })
    }

    const cached = await cacheService.get(symbol, 'TECHNICAL_SCORE', 100)
    if (cached) {
      return res.json(cached.data)
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 100)

    const history = await stockService.getHistoricalOHLC(symbol, startDate, endDate)

    if (history.length < 30) {
      return res.status(400).json({ error: 'Insufficient data. Need at least 30 data points' })
    }

    const prices = history.map(h => h.close)
    const highs = history.map(h => h.high)
    const lows = history.map(h => h.low)
    const currentPrice = prices[prices.length - 1]
    const recentHigh = highs.reduce((max, h) => (h.gt(max) ? h : max), highs[0])
    const recentLow = lows.reduce((min, l) => (l.lt(min) ? l : min), lows[0])

    const marketData = {
      prices,
      highs,
      lows,
      currentPrice,
      recentHigh,
      recentLow,
    }

    const score = technicalScoreService.calculateScore(marketData)
    const componentScores = technicalScoreService.getComponentScores(marketData)

    const response = {
      symbol,
      totalScore: score.totalScore,
      rating: score.rating,
      components: {
        rsi: {
          score: componentScores.rsi.score,
          weight: componentScores.rsi.weight,
          contribution: componentScores.rsi.score * componentScores.rsi.weight,
        },
        macd: {
          score: componentScores.macd.score,
          weight: componentScores.macd.weight,
          contribution: componentScores.macd.score * componentScores.macd.weight,
        },
        bollinger: {
          score: componentScores.bollinger.score,
          weight: componentScores.bollinger.weight,
          contribution: componentScores.bollinger.score * componentScores.bollinger.weight,
        },
        fibonacci: {
          score: componentScores.fibonacci.score,
          weight: componentScores.fibonacci.weight,
          contribution: componentScores.fibonacci.score * componentScores.fibonacci.weight,
        },
      },
      timestamp: score.timestamp.toISOString(),
    }

    await cacheService.set(symbol, 'TECHNICAL_SCORE', 100, response, 1)

    return res.json(response)
  } catch (error) {
    console.error('Error calculating technical score:', error)

    if (error instanceof Error) {
      if (error.message.includes('Stock not found')) {
        return res.status(404).json({
          error: `Stock not found: ${getQueryParam(req, 'symbol')}`,
        })
      }

      if (error.message.includes('Insufficient data')) {
        return res.status(400).json({
          error: 'Insufficient historical data to calculate technical score',
        })
      }

      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Failed to calculate technical score' })
  }
})

router.get('/candlestick-patterns', async (req: Request, res: Response) => {
  try {
    const symbol = getQueryParam(req, 'symbol')
    const daysParam = getQueryParam(req, 'days')

    if (!symbol) {
      return res.status(400).json({ error: 'symbol parameter is required' })
    }

    const days = daysParam ? parseInt(daysParam, 10) : 30

    if (isNaN(days) || days < 1) {
      return res.status(400).json({ error: 'days must be a positive number' })
    }

    const cached = await cacheService.get(symbol, 'CANDLESTICK_PATTERNS', days)
    if (cached) {
      return res.json(cached.data)
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days - 5)

    const history = await stockService.getHistoricalOHLC(symbol, startDate, endDate)

    if (history.length < 3) {
      return res.status(400).json({ error: 'Insufficient data. Need at least 3 data points' })
    }

    const candles = history.map(h => ({
      date: h.date,
      open: h.open,
      high: h.high,
      low: h.low,
      close: h.close,
    }))

    const patterns = patternService.identifyPatterns(candles)

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const response = {
      symbol,
      patterns: patterns
        .filter(p => p.date >= cutoffDate)
        .map(p => ({
          pattern: p.pattern,
          signal: p.signal,
          reliability: p.reliability,
          description: p.description,
          date: p.date.toISOString(),
          atGoldenRatio: p.atGoldenRatio,
        })),
      timestamp: new Date().toISOString(),
    }

    await cacheService.set(symbol, 'CANDLESTICK_PATTERNS', days, response, 1)

    return res.json(response)
  } catch (error) {
    console.error('Error identifying candlestick patterns:', error)

    if (error instanceof Error) {
      if (error.message.includes('Stock not found')) {
        return res.status(404).json({
          error: `Stock not found: ${getQueryParam(req, 'symbol')}`,
        })
      }

      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Failed to identify candlestick patterns' })
  }
})

router.get('/fibonacci/retracement', async (req: Request, res: Response) => {
  try {
    const highParam = getQueryParam(req, 'high')
    const lowParam = getQueryParam(req, 'low')
    const isUptrendParam = getQueryParam(req, 'isUptrend')
    const symbol = getQueryParam(req, 'symbol')

    if (!highParam) {
      return res.status(400).json({ error: 'high parameter is required' })
    }

    if (!lowParam) {
      return res.status(400).json({ error: 'low parameter is required' })
    }

    let high: Decimal
    let low: Decimal

    try {
      high = new Decimal(highParam)
      low = new Decimal(lowParam)
    } catch {
      return res.status(400).json({ error: 'high and low must be valid numbers' })
    }

    if (high.lessThanOrEqualTo(0) || low.lessThanOrEqualTo(0)) {
      return res.status(400).json({ error: 'high and low must be greater than 0' })
    }

    if (high.lessThanOrEqualTo(low)) {
      return res.status(400).json({ error: 'high must be greater than low' })
    }

    const isUptrend = isUptrendParam !== 'false'

    if (symbol) {
      const cacheKey = `${high.toString()}_${low.toString()}_${isUptrend}`
      const cached = await cacheService.get(symbol, 'FIBONACCI_RETRACEMENT', cacheKey.length)
      if (cached && cached.data.cacheKey === cacheKey) {
        return res.json(cached.data)
      }
    }

    const result = fibonacciService.calculateRetracement(high, low, isUptrend)

    const response = {
      levels: result.levels.map(level => ({
        ratio: level.ratio,
        price: level.price.toString(),
        label: level.label,
      })),
      high: result.high.toString(),
      low: result.low.toString(),
      direction: result.direction,
      timestamp: new Date().toISOString(),
      cacheKey: symbol ? `${high.toString()}_${low.toString()}_${isUptrend}` : undefined,
    }

    if (symbol) {
      const cacheKey = `${high.toString()}_${low.toString()}_${isUptrend}`
      await cacheService.set(symbol, 'FIBONACCI_RETRACEMENT', cacheKey.length, response, 1)
    }

    return res.json(response)
  } catch (error) {
    console.error('Error calculating Fibonacci retracement:', error)

    if (error instanceof Error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Failed to calculate Fibonacci retracement' })
  }
})

router.get('/fibonacci/extension', async (req: Request, res: Response) => {
  try {
    const startParam = getQueryParam(req, 'start')
    const retracementParam = getQueryParam(req, 'retracement')
    const breakoutParam = getQueryParam(req, 'breakout')
    const symbol = getQueryParam(req, 'symbol')

    if (!startParam) {
      return res.status(400).json({ error: 'start parameter is required' })
    }

    if (!retracementParam) {
      return res.status(400).json({ error: 'retracement parameter is required' })
    }

    if (!breakoutParam) {
      return res.status(400).json({ error: 'breakout parameter is required' })
    }

    let start: Decimal
    let retracement: Decimal
    let breakout: Decimal

    try {
      start = new Decimal(startParam)
      retracement = new Decimal(retracementParam)
      breakout = new Decimal(breakoutParam)
    } catch {
      return res
        .status(400)
        .json({ error: 'start, retracement, and breakout must be valid numbers' })
    }

    if (start.lessThanOrEqualTo(0) || retracement.lessThanOrEqualTo(0) || breakout.lessThanOrEqualTo(0)) {
      return res.status(400).json({ error: 'start, retracement, and breakout must be greater than 0' })
    }

    if (symbol) {
      const cacheKey = `${start.toString()}_${retracement.toString()}_${breakout.toString()}`
      const cached = await cacheService.get(symbol, 'FIBONACCI_EXTENSION', cacheKey.length)
      if (cached && cached.data.cacheKey === cacheKey) {
        return res.json(cached.data)
      }
    }

    const result = fibonacciService.calculateExtension(start, retracement, breakout)

    const response = {
      targets: result.targets.map(target => ({
        ratio: target.ratio,
        price: target.price.toString(),
        label: target.label,
      })),
      start: result.start.toString(),
      retracement: result.retracement.toString(),
      breakout: result.breakout.toString(),
      timestamp: new Date().toISOString(),
      cacheKey: symbol ? `${start.toString()}_${retracement.toString()}_${breakout.toString()}` : undefined,
    }

    if (symbol) {
      const cacheKey = `${start.toString()}_${retracement.toString()}_${breakout.toString()}`
      await cacheService.set(symbol, 'FIBONACCI_EXTENSION', cacheKey.length, response, 1)
    }

    return res.json(response)
  } catch (error) {
    console.error('Error calculating Fibonacci extension:', error)

    if (error instanceof Error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Failed to calculate Fibonacci extension' })
  }
})

router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    const symbol = getQueryParam(req, 'symbol')

    if (symbol) {
      await cacheService.invalidate(symbol)

      return res.json({
        success: true,
        message: `Cache cleared for symbol: ${symbol}`,
        symbol,
      })
    }

    const count = await cacheService.clear()

    return res.json({
      success: true,
      message: 'All cache cleared',
      count,
    })
  } catch (error) {
    console.error('Error clearing cache:', error)

    if (error instanceof Error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Failed to clear cache' })
  }
})

router.get('/cache/clear', async (_req: Request, res: Response) => {
  try {
    const stats = await cacheService.getStats()

    return res.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Error getting cache stats:', error)

    if (error instanceof Error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Failed to get cache stats' })
  }
})

export { router }
