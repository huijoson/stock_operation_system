import { NextRequest, NextResponse } from 'next/server'
import { FibonacciService } from '@/services/fibonacci.service'
import { IndicatorCacheService } from '@/services/indicator-cache.service'
import Decimal from 'decimal.js'

const fibonacciService = new FibonacciService()
const cacheService = new IndicatorCacheService()

/**
 * GET /api/indicators/fibonacci/extension
 * Calculate Fibonacci extension targets
 * Query params: start, retracement, breakout, symbol (optional, for caching)
 * 
 * Requirements: 2.1, 2.2
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startParam = searchParams.get('start')
    const retracementParam = searchParams.get('retracement')
    const breakoutParam = searchParams.get('breakout')
    const symbol = searchParams.get('symbol')

    // Validate required parameters
    if (!startParam) {
      return NextResponse.json(
        { error: 'start parameter is required' },
        { status: 400 }
      )
    }

    if (!retracementParam) {
      return NextResponse.json(
        { error: 'retracement parameter is required' },
        { status: 400 }
      )
    }

    if (!breakoutParam) {
      return NextResponse.json(
        { error: 'breakout parameter is required' },
        { status: 400 }
      )
    }

    // Parse parameters
    let start: Decimal
    let retracement: Decimal
    let breakout: Decimal
    
    try {
      start = new Decimal(startParam)
      retracement = new Decimal(retracementParam)
      breakout = new Decimal(breakoutParam)
    } catch (error) {
      return NextResponse.json(
        { error: 'start, retracement, and breakout must be valid numbers' },
        { status: 400 }
      )
    }

    // Validate prices
    if (start.lessThanOrEqualTo(0) || retracement.lessThanOrEqualTo(0) || breakout.lessThanOrEqualTo(0)) {
      return NextResponse.json(
        { error: 'start, retracement, and breakout must be greater than 0' },
        { status: 400 }
      )
    }

    // Check cache if symbol is provided
    if (symbol) {
      const cacheKey = `${start.toString()}_${retracement.toString()}_${breakout.toString()}`
      const cached = await cacheService.get(symbol, 'FIBONACCI_EXTENSION', cacheKey.length)
      if (cached && cached.data.cacheKey === cacheKey) {
        return NextResponse.json(cached.data)
      }
    }

    // Calculate Fibonacci extension targets
    const result = fibonacciService.calculateExtension(start, retracement, breakout)

    // Convert to response format
    const response = {
      targets: result.targets.map(target => ({
        ratio: target.ratio,
        price: target.price.toString(),
        label: target.label
      })),
      start: result.start.toString(),
      retracement: result.retracement.toString(),
      breakout: result.breakout.toString(),
      timestamp: new Date().toISOString(),
      cacheKey: symbol ? `${start.toString()}_${retracement.toString()}_${breakout.toString()}` : undefined
    }

    // Cache the result if symbol is provided (1 hour TTL)
    if (symbol) {
      const cacheKey = `${start.toString()}_${retracement.toString()}_${breakout.toString()}`
      await cacheService.set(symbol, 'FIBONACCI_EXTENSION', cacheKey.length, response, 1)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error calculating Fibonacci extension:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to calculate Fibonacci extension' },
      { status: 500 }
    )
  }
}
