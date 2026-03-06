import { NextRequest, NextResponse } from 'next/server'
import { CandlestickPatternService } from '@/services/candlestick-pattern.service'
import { StockService } from '@/services/stock.service'
import { IndicatorCacheService } from '@/services/indicator-cache.service'
import prisma from '@/lib/db/prisma'
import Decimal from 'decimal.js'

const patternService = new CandlestickPatternService()
const stockService = new StockService(prisma)
const cacheService = new IndicatorCacheService()

/**
 * GET /api/indicators/candlestick-patterns
 * Identify candlestick patterns
 * Query params: symbol, days (optional, default: 30)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get('symbol')
    const daysParam = searchParams.get('days')

    // Validate required parameters
    if (!symbol) {
      return NextResponse.json(
        { error: 'symbol parameter is required' },
        { status: 400 }
      )
    }

    // Parse optional parameters
    const days = daysParam ? parseInt(daysParam, 10) : 30

    // Validate days
    if (isNaN(days) || days < 1) {
      return NextResponse.json(
        { error: 'days must be a positive number' },
        { status: 400 }
      )
    }

    // Check cache
    const cached = await cacheService.get(symbol, 'CANDLESTICK_PATTERNS', days)
    if (cached) {
      return NextResponse.json(cached.data)
    }

    // Get historical prices (need extra days for pattern context)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days - 5) // Extra days for pattern detection

    const history = await stockService.getHistoricalOHLC(
      symbol,
      startDate,
      endDate
    )

    if (history.length < 3) {
      return NextResponse.json(
        { error: 'Insufficient data. Need at least 3 data points' },
        { status: 400 }
      )
    }

    // Convert to candle format
    const candles = history.map(h => ({
      date: h.date,
      open: h.open,
      high: h.high,
      low: h.low,
      close: h.close,
    }))

    // Identify patterns
    const patterns = patternService.identifyPatterns(candles)

    // Filter to requested days and convert to response format
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

    // Cache the result (1 hour TTL)
    await cacheService.set(symbol, 'CANDLESTICK_PATTERNS', days, response, 1)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error identifying candlestick patterns:', error)

    if (error instanceof Error) {
      if (error.message.includes('Stock not found')) {
        return NextResponse.json(
          { error: `Stock not found: ${request.nextUrl.searchParams.get('symbol')}` },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to identify candlestick patterns' },
      { status: 500 }
    )
  }
}
