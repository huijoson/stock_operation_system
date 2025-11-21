import { NextRequest, NextResponse } from 'next/server'
import { StockService } from '@/services/stock.service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const stockService = new StockService(prisma)

/**
 * GET /api/stocks/:symbol/history
 * Get historical stock prices
 * 
 * Query parameters:
 * - startDate: Start date (ISO format)
 * - endDate: End date (ISO format)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    // Await params in Next.js 15
    const { symbol } = await params
    const { searchParams } = new URL(request.url)

    if (!symbol) {
      return NextResponse.json(
        { error: 'Stock symbol is required' },
        { status: 400 }
      )
    }

    // Parse date parameters
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const startDate = new Date(startDateParam)
    const endDate = new Date(endDateParam)

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO format (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'startDate must be before endDate' },
        { status: 400 }
      )
    }

    // Get historical prices
    const prices = await stockService.getHistoricalPrices(symbol, startDate, endDate)

    return NextResponse.json({
      symbol,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      prices: prices.map(p => ({
        date: p.date.toISOString(),
        price: p.price.toString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching historical prices:', error)

    if (error instanceof Error) {
      if (error.message.includes('Stock not found')) {
        const { symbol: errorSymbol } = await params
        return NextResponse.json(
          { error: `Stock not found: ${errorSymbol}` },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch historical prices' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
