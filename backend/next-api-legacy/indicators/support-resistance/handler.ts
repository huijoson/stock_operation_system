import { NextRequest, NextResponse } from 'next/server'
import { SupportResistanceService } from '@/services/support-resistance.service'
import { StockService } from '@/services/stock.service'
import { IndicatorCacheService } from '@/services/indicator-cache.service'
import prisma from '@/lib/db/prisma'
import Decimal from 'decimal.js'

const supportResistanceService = new SupportResistanceService()
const stockService = new StockService(prisma)
const cacheService = new IndicatorCacheService()

/**
 * GET /api/indicators/support-resistance
 * Calculate support and resistance levels
 * Query params: symbol, period (optional, default: 90), tolerance (optional, default: 0.03)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get('symbol')
    const periodParam = searchParams.get('period')
    const toleranceParam = searchParams.get('tolerance')

    // Validate required parameters
    if (!symbol) {
      return NextResponse.json(
        { error: 'symbol parameter is required' },
        { status: 400 }
      )
    }

    // Parse optional parameters
    const period = periodParam ? parseInt(periodParam, 10) : 90
    const tolerance = toleranceParam ? parseFloat(toleranceParam) : 0.03

    // Validate period
    if (isNaN(period) || period < 10) {
      return NextResponse.json(
        { error: 'period must be a number greater than or equal to 10' },
        { status: 400 }
      )
    }

    // Validate tolerance
    if (isNaN(tolerance) || tolerance <= 0 || tolerance >= 1) {
      return NextResponse.json(
        { error: 'tolerance must be a number between 0 and 1' },
        { status: 400 }
      )
    }

    // Check cache
    const cached = await cacheService.get(symbol, 'SUPPORT_RESISTANCE', period)
    if (cached) {
      return NextResponse.json(cached.data)
    }

    // Get historical prices
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)

    const history = await stockService.getHistoricalOHLC(
      symbol,
      startDate,
      endDate
    )

    if (history.length < 10) {
      return NextResponse.json(
        { error: 'Insufficient data. Need at least 10 data points' },
        { status: 400 }
      )
    }

    // Extract closing prices for level calculation
    const closePrices = history.map(h => h.close)
    const currentPrice = closePrices[closePrices.length - 1]

    // Calculate support and resistance levels
    const result = supportResistanceService.calculateLevels(
      closePrices,
      [30, 60, 90],
      currentPrice
    )

    // Calculate golden ratio levels using highs and lows
    const highs = history.map(h => h.high)
    const lows = history.map(h => h.low)
    const high = highs.reduce((max, h) => h.gt(max) ? h : max, highs[0])
    const low = lows.reduce((min, l) => l.lt(min) ? l : min, lows[0])
    const goldenRatioLevels = supportResistanceService.findGoldenRatioLevels(high, low)

    // Convert to response format
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
      currentNearestSupport: result.currentNearestSupport ? {
        price: result.currentNearestSupport.price.toString(),
        strength: result.currentNearestSupport.strength,
        touches: result.currentNearestSupport.touches,
      } : null,
      currentNearestResistance: result.currentNearestResistance ? {
        price: result.currentNearestResistance.price.toString(),
        strength: result.currentNearestResistance.strength,
        touches: result.currentNearestResistance.touches,
      } : null,
      goldenRatioLevels: goldenRatioLevels.levels.map(level => ({
        ratio: level.ratio,
        price: level.price.toString(),
        label: level.label,
      })),
      timestamp: new Date().toISOString(),
    }

    // Cache the result (1 hour TTL)
    await cacheService.set(symbol, 'SUPPORT_RESISTANCE', period, response, 1)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error calculating support/resistance:', error)

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
      { error: 'Failed to calculate support/resistance levels' },
      { status: 500 }
    )
  }
}
