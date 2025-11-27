import { NextRequest, NextResponse } from 'next/server'
import { RSIService } from '@/services/rsi.service'
import { StockService } from '@/services/stock.service'
import { IndicatorCacheService } from '@/services/indicator-cache.service'
import prisma from '@/lib/db/prisma'
import Decimal from 'decimal.js'

const rsiService = new RSIService()
const stockService = new StockService(prisma)
const cacheService = new IndicatorCacheService()

/**
 * GET /api/indicators/rsi
 * Calculate RSI indicator
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
    if (isNaN(period) || period < 2) {
      return NextResponse.json(
        { error: 'period must be a number greater than or equal to 2' },
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

    // Check cache and validate it has the rsi field
    const cached = await cacheService.get(symbol, 'RSI', period)
    if (cached && cached.data.history && cached.data.history[0]?.rsi !== undefined) {
      return NextResponse.json(cached.data)
    }

    // Get historical prices
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days - period) // Extra days for RSI calculation

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

    // Extract closing prices
    const prices = history.map(h => h.close)

    // Calculate RSI
    const result = rsiService.calculateRSI(prices, period)

    // Convert to response format
    const response = {
      symbol,
      period,
      value: result.value,
      status: result.status,
      history: result.history.slice(-days).map(h => ({
        date: h.date.toISOString().split('T')[0],
        rsi: h.value, // Use 'rsi' to match RSIIndicator component expectation
      })),
      divergences: result.divergences,
      timestamp: new Date().toISOString(),
    }

    // Cache the result (1 hour TTL)
    await cacheService.set(symbol, 'RSI', period, response, 1)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error calculating RSI:', error)

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
      { error: 'Failed to calculate RSI' },
      { status: 500 }
    )
  }
}
