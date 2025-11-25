import { NextRequest, NextResponse } from 'next/server'
import { IndicatorCacheService } from '@/services/indicator-cache.service'

const cacheService = new IndicatorCacheService()

/**
 * POST /api/indicators/cache/clear
 * Clear indicator cache
 * 
 * Query params:
 * - symbol (optional): Clear cache for specific symbol only
 * 
 * If no symbol is provided, clears all cache entries.
 * 
 * Requirements: 11.3, 11.4
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get('symbol')

    let count: number

    if (symbol) {
      // Clear cache for specific symbol
      await cacheService.invalidate(symbol)
      
      // Get count of cleared entries (approximate)
      // Since invalidate doesn't return count, we return a success message
      return NextResponse.json({
        success: true,
        message: `Cache cleared for symbol: ${symbol}`,
        symbol
      })
    } else {
      // Clear all cache
      count = await cacheService.clear()
      
      return NextResponse.json({
        success: true,
        message: 'All cache cleared',
        count
      })
    }
  } catch (error) {
    console.error('Error clearing cache:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/indicators/cache/clear
 * Get cache statistics
 * 
 * Returns information about current cache state.
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await cacheService.getStats()
    
    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Error getting cache stats:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    )
  }
}
