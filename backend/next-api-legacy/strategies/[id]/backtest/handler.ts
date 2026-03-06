import { NextRequest, NextResponse } from 'next/server'
import { StrategyService } from '@/services/strategy.service'
import { requireAuth } from '@/lib/auth/middleware'

/**
 * GET /api/strategies/:id/backtest
 * Execute strategy backtest
 * 
 * Requirements: 10.4, 10.6
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate session
    const user = await requireAuth(request)

    const { id: strategyId } = await params

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    // Validate required parameters
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      )
    }

    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    // Parse dates
    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    // Get strategy to verify ownership
    const strategyService = new StrategyService()
    const strategy = await strategyService.getStrategy(strategyId)

    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (strategy.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this strategy' },
        { status: 403 }
      )
    }

    // Execute backtest
    const result = await strategyService.backtest(
      strategyId,
      symbol,
      startDate,
      endDate
    )

    // Calculate total return and equity curve
    let totalReturn = 0
    const equityCurve: Array<{ date: string; equity: number }> = []
    let currentEquity = 100000 // Starting capital
    
    // Build equity curve from trades
    const sellTrades = result.trades.filter(t => t.type === 'SELL')
    for (const trade of sellTrades) {
      if (trade.return) {
        totalReturn += trade.return
        currentEquity = currentEquity * (1 + trade.return / 100)
        equityCurve.push({
          date: trade.date.toISOString().split('T')[0],
          equity: currentEquity,
        })
      }
    }

    // Convert Decimal values to numbers for JSON serialization
    const serializedResult = {
      id: strategyId,
      strategyId: strategyId,
      strategyName: strategy.name,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalTrades: result.totalTrades,
      winRate: result.winRate,
      avgReturn: parseFloat(result.averageReturn.toString()),
      maxDrawdown: parseFloat(result.maxDrawdown.toString()),
      totalReturn: totalReturn,
      trades: result.trades.map(trade => ({
        date: trade.date.toISOString().split('T')[0],
        type: trade.type,
        price: parseFloat(trade.price.toString()),
        quantity: trade.quantity,
        profit: trade.profit ? parseFloat(trade.profit.toString()) : undefined,
        profitPercent: trade.return,
      })),
      equityCurve: equityCurve,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json(serializedResult)
  } catch (error: any) {
    console.error('Error executing backtest:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Handle validation errors
    if (
      error.message?.includes('Strategy not found') ||
      error.message?.includes('Insufficient historical data') ||
      error.message?.includes('Stock not found')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
