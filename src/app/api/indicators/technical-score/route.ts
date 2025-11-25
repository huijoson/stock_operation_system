import { NextRequest, NextResponse } from 'next/server'
import { TechnicalScoreService } from '@/services/technical-score.service'
import { StockService } from '@/services/stock.service'
import { IndicatorCacheService } from '@/services/indicator-cache.service'
import prisma from '@/lib/db/prisma'

const technicalScoreService = new TechnicalScoreService()
const stockService = new StockService(prisma)
const cacheService = new IndicatorCacheService()

/**
 * GET /api/indicators/technical-score
 * Calculate comprehensive technical score
 * Query params: symbol
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get('symbol')

    // Validate required parameters
    if (!symbol) {
      return NextResponse.json(
        { error: 'symbol parameter is required' },
        { status: 400 }
      )
    }

    // Check cache (use 100 as period for technical score)
    const cached = await cacheService.get(symbol, 'TECHNICAL_SCORE', 100)
    if (cached) {
      return NextResponse.json(cached.data)
    }

    // Get historical data (100 days for comprehensive analysis)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 100)

    const history = await stockService.getHistoricalOHLC(symbol, startDate, endDate)

    if (history.length < 30) {
      return NextResponse.json(
        { error: 'Insufficient data. Need at least 30 data points' },
        { status: 400 }
      )
    }

    // Prepare market data
    const prices = history.map(h => h.close)
    const highs = history.map(h => h.high)
    const lows = history.map(h => h.low)
    const currentPrice = prices[prices.length - 1]
    const recentHigh = highs.reduce((max, h) => h.gt(max) ? h : max, highs[0])
    const recentLow = lows.reduce((min, l) => l.lt(min) ? l : min, lows[0])

    const marketData = {
      prices,
      highs,
      lows,
      currentPrice,
      recentHigh,
      recentLow,
    }

    // Calculate technical score
    const score = technicalScoreService.calculateScore(marketData)
    const componentScores = technicalScoreService.getComponentScores(marketData)

    // Convert to response format
    const response = {
      symbol,
      totalScore: score.totalScore,
      rating: score.rating,
      components: {
        rsi: {
          score: componentScores.rsi.score,
          weight: componentScores.rsi.weight,
        },
        macd: {
          score: componentScores.macd.score,
          weight: componentScores.macd.weight,
        },
        bollinger: {
          score: componentScores.bollinger.score,
          weight: componentScores.bollinger.weight,
        },
        fibonacci: {
          score: componentScores.fibonacci.score,
          weight: componentScores.fibonacci.weight,
        },
      },
      timestamp: score.timestamp.toISOString(),
    }

    // Cache the result (1 hour TTL)
    await cacheService.set(symbol, 'TECHNICAL_SCORE', 100, response, 1)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error calculating technical score:', error)

    if (error instanceof Error) {
      if (error.message.includes('Stock not found')) {
        return NextResponse.json(
          { error: `Stock not found: ${request.nextUrl.searchParams.get('symbol')}` },
          { status: 404 }
        )
      }

      if (error.message.includes('Insufficient data')) {
        return NextResponse.json(
          { error: 'Insufficient historical data to calculate technical score' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to calculate technical score' },
      { status: 500 }
    )
  }
}
