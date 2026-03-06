import { NextRequest, NextResponse } from 'next/server'
import { FibonacciService } from '@/services/fibonacci.service'
import { IndicatorCacheService } from '@/services/indicator-cache.service'
import Decimal from 'decimal.js'

const fibonacciService = new FibonacciService()
const cacheService = new IndicatorCacheService()

/**
 * GET /api/indicators/fibonacci/retracement
 * Calculate Fibonacci retracement levels
 * Query params: high, low, isUptrend (optional, default: true), symbol (optional, for caching)
 * 
 * Requirements: 1.1, 1.2
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const highParam = searchParams.get('high')
    const lowParam = searchParams.get('low')
    const isUptrendParam = searchParams.get('isUptrend')
    const symbol = searchParams.get('symbol')

    // Validate required parameters
    if (!highParam) {
      return NextResponse.json(
        { error: 'high parameter is required' },
        { status: 400 }
      )
    }

    if (!lowParam) {
      return NextResponse.json(
        { error: 'low parameter is required' },
        { status: 400 }
      )
    }

    // Parse parameters
    let high: Decimal
    let low: Decimal
    
    try {
      high = new Decimal(highParam)
      low = new Decimal(lowParam)
    } catch (error) {
      return NextResponse.json(
        { error: 'high and low must be valid numbers' },
        { status: 400 }
      )
    }

    // Validate price range
    if (high.lessThanOrEqualTo(0) || low.lessThanOrEqualTo(0)) {
      return NextResponse.json(
        { error: 'high and low must be greater than 0' },
        { status: 400 }
      )
    }

    if (high.lessThanOrEqualTo(low)) {
      return NextResponse.json(
        { error: 'high must be greater than low' },
        { status: 400 }
      )
    }

    const isUptrend = isUptrendParam !== 'false' // Default to true

    // Check cache if symbol is provided
    if (symbol) {
      const cacheKey = `${high.toString()}_${low.toString()}_${isUptrend}`
      const cached = await cacheService.get(symbol, 'FIBONACCI_RETRACEMENT', cacheKey.length)
      if (cached && cached.data.cacheKey === cacheKey) {
        return NextResponse.json(cached.data)
      }
    }

    // Calculate Fibonacci retracement levels
    const result = fibonacciService.calculateRetracement(high, low, isUptrend)

    // Convert to response format
    const response = {
      levels: result.levels.map(level => ({
        ratio: level.ratio,
        price: level.price.toString(),
        label: level.label
      })),
      high: result.high.toString(),
      low: result.low.toString(),
      direction: result.direction,
      timestamp: new Date().toISOString(),
      cacheKey: symbol ? `${high.toString()}_${low.toString()}_${isUptrend}` : undefined
    }

    // Cache the result if symbol is provided (1 hour TTL)
    if (symbol) {
      const cacheKey = `${high.toString()}_${low.toString()}_${isUptrend}`
      await cacheService.set(symbol, 'FIBONACCI_RETRACEMENT', cacheKey.length, response, 1)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error calculating Fibonacci retracement:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to calculate Fibonacci retracement' },
      { status: 500 }
    )
  }
}
