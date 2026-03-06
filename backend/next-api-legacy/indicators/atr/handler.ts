import { NextRequest, NextResponse } from 'next/server'
import { ATRService } from '@/services/atr.service'
import { StockService } from '@/services/stock.service'
import { IndicatorCacheService } from '@/services/indicator-cache.service'
import prisma from '@/lib/db/prisma'
import Decimal from 'decimal.js'

const atrService = new ATRService()
const stockService = new StockService(prisma)
const cacheService = new IndicatorCacheService()

/**
 * GET /api/indicators/atr
 * Calculate ATR (Average True Range) indicator
 * Query params: symbol, period (optional, default: 14), days (optional, default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get('symbol')
    const periodParam = searchParams.get('period')
    const daysParam = searchParams.get('days')

    // Validate required parameters
    if (!symbol) {
      return NextResponse.json(
        { error: 'symbol parameter is required' },
        { status: 400 }
      )
    }

    // Parse optional parameters
    const period = periodParam ? parseInt(periodParam, 10) : 14
    const days = daysParam ? parseInt(daysParam, 10) : 100

    // Validate period
    if (isNaN(period) || period < 1) {
      return NextResponse.json(
        { error: 'period must be a positive number' },
        { status: 400 }
      )
    }

    // Validate days
    if (isNaN(days) || days < 1) {
      return NextResponse.json(
        { error: 'days must be a positive number' },
        { status: 400 }
      )
    }

    // Check cache
    const cached = await cacheService.get(symbol, 'ATR', period)
    if (cached) {
      return NextResponse.json(cached.data)
    }

    // Get historical prices
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days - period) // Extra days for ATR calculation

    const history = await stockService.getHistoricalOHLC(
      symbol,
      startDate,
      endDate
    )

    if (history.length < period + 1) {
      return NextResponse.json(
        { error: `Insufficient data. Need at least ${period + 1} data points` },
        { status: 400 }
      )
    }

    // Extract OHLC data
    const highs = history.map(h => h.high)
    const lows = history.map(h => h.low)
    const closes = history.map(h => h.close)

    // Calculate ATR
    const result = atrService.calculateATR(highs, lows, closes, period)

    // Get current price for stop loss suggestion
    const currentPrice = closes[closes.length - 1]
    const suggestedStopLoss = atrService.suggestStopLoss(currentPrice, result.value, 2)

    // Convert to response format
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

    // Cache the result (1 hour TTL)
    await cacheService.set(symbol, 'ATR', period, response, 1)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error calculating ATR:', error)

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
      { error: 'Failed to calculate ATR' },
      { status: 500 }
    )
  }
}
