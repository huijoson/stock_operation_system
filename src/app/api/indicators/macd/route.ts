import { NextRequest, NextResponse } from 'next/server'
import { MACDService } from '@/services/macd.service'
import { StockService } from '@/services/stock.service'
import { IndicatorCacheService } from '@/services/indicator-cache.service'
import prisma from '@/lib/db/prisma'
import Decimal from 'decimal.js'

const macdService = new MACDService()
const stockService = new StockService(prisma)
const cacheService = new IndicatorCacheService()

/**
 * GET /api/indicators/macd
 * Calculate MACD indicator
 * Query params: symbol, fastPeriod (optional, default: 12), slowPeriod (optional, default: 26), 
 *               signalPeriod (optional, default: 9), days (optional, default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get('symbol')
    const fastPeriodParam = searchParams.get('fastPeriod')
    const slowPeriodParam = searchParams.get('slowPeriod')
    const signalPeriodParam = searchParams.get('signalPeriod')
    const daysParam = searchParams.get('days')

    // Validate required parameters
    if (!symbol) {
      return NextResponse.json(
        { error: 'symbol parameter is required' },
        { status: 400 }
      )
    }

    // Parse optional parameters
    const fastPeriod = fastPeriodParam ? parseInt(fastPeriodParam, 10) : 12
    const slowPeriod = slowPeriodParam ? parseInt(slowPeriodParam, 10) : 26
    const signalPeriod = signalPeriodParam ? parseInt(signalPeriodParam, 10) : 9
    const days = daysParam ? parseInt(daysParam, 10) : 100

    // Validate periods
    if (isNaN(fastPeriod) || fastPeriod < 1) {
      return NextResponse.json(
        { error: 'fastPeriod must be a positive number' },
        { status: 400 }
      )
    }

    if (isNaN(slowPeriod) || slowPeriod < 1) {
      return NextResponse.json(
        { error: 'slowPeriod must be a positive number' },
        { status: 400 }
      )
    }

    if (isNaN(signalPeriod) || signalPeriod < 1) {
      return NextResponse.json(
        { error: 'signalPeriod must be a positive number' },
        { status: 400 }
      )
    }

    if (fastPeriod >= slowPeriod) {
      return NextResponse.json(
        { error: 'fastPeriod must be less than slowPeriod' },
        { status: 400 }
      )
    }

    if (isNaN(days) || days < 1) {
      return NextResponse.json(
        { error: 'days must be a positive number' },
        { status: 400 }
      )
    }

    // Check cache (use slowPeriod as the period key)
    const cached = await cacheService.get(symbol, 'MACD', slowPeriod)
    if (cached) {
      return NextResponse.json(cached.data)
    }

    // Get historical prices
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days - slowPeriod - signalPeriod) // Extra days for MACD calculation

    const history = await stockService.getHistoricalOHLC(
      symbol,
      startDate,
      endDate
    )

    const minDataPoints = slowPeriod + signalPeriod
    if (history.length < minDataPoints) {
      return NextResponse.json(
        { error: `Insufficient data. Need at least ${minDataPoints} data points` },
        { status: 400 }
      )
    }

    // Extract closing prices
    const prices = history.map(h => h.close)

    // Calculate MACD
    const result = macdService.calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod)

    // Convert to response format (return only requested days)
    const response = {
      symbol,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      macdLine: result.macdLine.slice(-days),
      signalLine: result.signalLine.slice(-days),
      histogram: result.histogram.slice(-days),
      crossovers: result.crossovers.filter((_, idx) => idx >= result.crossovers.length - days),
      currentSignal: result.currentSignal,
      timestamp: new Date().toISOString(),
    }

    // Cache the result (1 hour TTL)
    await cacheService.set(symbol, 'MACD', slowPeriod, response, 1)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error calculating MACD:', error)

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
      { error: 'Failed to calculate MACD' },
      { status: 500 }
    )
  }
}
