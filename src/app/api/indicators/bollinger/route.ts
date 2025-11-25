import { NextRequest, NextResponse } from 'next/server'
import { BollingerBandsService } from '@/services/bollinger-bands.service'
import { StockService } from '@/services/stock.service'
import { IndicatorCacheService } from '@/services/indicator-cache.service'
import prisma from '@/lib/db/prisma'
import Decimal from 'decimal.js'

const bollingerService = new BollingerBandsService()
const stockService = new StockService(prisma)
const cacheService = new IndicatorCacheService()

/**
 * GET /api/indicators/bollinger
 * Calculate Bollinger Bands indicator
 * Query params: symbol, period (optional, default: 20), stdDev (optional, default: 2), 
 *               days (optional, default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get('symbol')
    const periodParam = searchParams.get('period')
    const stdDevParam = searchParams.get('stdDev')
    const daysParam = searchParams.get('days')

    // Validate required parameters
    if (!symbol) {
      return NextResponse.json(
        { error: 'symbol parameter is required' },
        { status: 400 }
      )
    }

    // Parse optional parameters
    const period = periodParam ? parseInt(periodParam, 10) : 20
    const stdDev = stdDevParam ? parseFloat(stdDevParam) : 2
    const days = daysParam ? parseInt(daysParam, 10) : 100

    // Validate period
    if (isNaN(period) || period < 2) {
      return NextResponse.json(
        { error: 'period must be a number greater than or equal to 2' },
        { status: 400 }
      )
    }

    // Validate stdDev
    if (isNaN(stdDev) || stdDev <= 0) {
      return NextResponse.json(
        { error: 'stdDev must be a positive number' },
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
    const cached = await cacheService.get(symbol, 'BOLLINGER', period)
    if (cached) {
      return NextResponse.json(cached.data)
    }

    // Get historical prices
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days - period) // Extra days for calculation

    const history = await stockService.getHistoricalOHLC(
      symbol,
      startDate,
      endDate
    )

    if (history.length < period) {
      return NextResponse.json(
        { error: `Insufficient data. Need at least ${period} data points` },
        { status: 400 }
      )
    }

    // Extract closing prices
    const prices = history.map(h => h.close)

    // Calculate Bollinger Bands
    const result = bollingerService.calculateBands(prices, period, stdDev)

    // Convert to response format (return only requested days)
    const slicedData = {
      upper: result.upper.slice(-days),
      middle: result.middle.slice(-days),
      lower: result.lower.slice(-days),
      bandwidth: result.bandwidth.slice(-days),
    }

    // Generate dates for history
    const currentDate = new Date()
    const history = slicedData.upper.map((_, idx) => {
      const date = new Date(currentDate)
      date.setDate(date.getDate() - (slicedData.upper.length - 1 - idx))
      return {
        date: date.toISOString().split('T')[0],
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
      history,
      currentPosition: result.currentPosition,
      isSqueezed: bollingerService.detectSqueeze(result, 20),
      squeezeThreshold: 0.5,
      expansionThreshold: 1.5,
      timestamp: new Date().toISOString(),
    }

    // Cache the result (1 hour TTL)
    await cacheService.set(symbol, 'BOLLINGER', period, response, 1)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error calculating Bollinger Bands:', error)

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
      { error: 'Failed to calculate Bollinger Bands' },
      { status: 500 }
    )
  }
}
