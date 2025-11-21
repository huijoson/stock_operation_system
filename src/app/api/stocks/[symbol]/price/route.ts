import { NextRequest, NextResponse } from 'next/server'
import { StockService } from '@/services/stock.service'
import prisma from '@/lib/db/prisma'

const stockService = new StockService(prisma)

/**
 * GET /api/stocks/:symbol/price
 * Get current stock price
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    // Await params in Next.js 15
    const { symbol } = await params

    if (!symbol) {
      return NextResponse.json(
        { error: 'Stock symbol is required' },
        { status: 400 }
      )
    }

    // Get current price
    const price = await stockService.getCurrentPrice(symbol)

    return NextResponse.json({
      symbol,
      price: price.toString(),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching stock price:', error)

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
      { error: 'Failed to fetch stock price' },
      { status: 500 }
    )
  }
}
