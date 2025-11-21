import { NextRequest, NextResponse } from 'next/server'
import { StockService } from '@/services/stock.service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * GET /api/stocks/search
 * 
 * Search for stocks by symbol or name
 * 
 * Query parameters:
 * - q: Search keyword (required, minimum 2 characters)
 * 
 * Returns:
 * - 200: Array of matching stocks
 * - 400: Invalid request (keyword too short or missing)
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Get search keyword from query parameters
    const searchParams = request.nextUrl.searchParams
    const keyword = searchParams.get('q')

    // Validate keyword
    if (!keyword) {
      return NextResponse.json(
        { error: 'Search keyword is required' },
        { status: 400 }
      )
    }

    if (keyword.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search keyword must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Search for stocks
    const stockService = new StockService(prisma)
    const stocks = await stockService.searchStocks(keyword)

    return NextResponse.json({
      stocks,
      count: stocks.length,
    })
  } catch (error) {
    console.error('Error searching stocks:', error)
    return NextResponse.json(
      { 
        error: 'Failed to search stocks',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
