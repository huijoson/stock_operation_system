import { NextRequest, NextResponse } from 'next/server'
import { realizedPLService } from '@/services/realized-pl.service'
import { requireAuth } from '@/lib/auth/middleware'
import { isValidTimePeriod } from '@/lib/utils/date-filters'

/**
 * GET /api/realized-pl/portfolio/[portfolioId]
 * Get realized P&L for a specific portfolio
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ portfolioId: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { portfolioId } = await params
    
    const { searchParams } = new URL(request.url)
    const periodParam = searchParams.get('period') || 'all'
    const symbol = searchParams.get('symbol') || undefined
    
    if (!isValidTimePeriod(periodParam)) {
      return NextResponse.json(
        { error: 'Invalid period parameter. Must be one of: month, quarter, year, all' },
        { status: 400 }
      )
    }
    
    const result = await realizedPLService.getByPortfolio(
      portfolioId,
      user.id,
      periodParam,
      symbol
    )
    
    return NextResponse.json({
      portfolioId: result.portfolioId,
      portfolioName: result.portfolioName,
      totalRealizedPL: result.totalRealizedPL.toString(),
      periodStart: result.periodStart.toISOString().split('T')[0],
      periodEnd: result.periodEnd.toISOString().split('T')[0],
      shortTermPL: result.shortTermPL.toString(),
      longTermPL: result.longTermPL.toString(),
      records: result.records.map(record => ({
        id: record.id,
        symbol: record.symbol,
        saleDate: record.saleDate.toISOString(),
        sharesSold: record.sharesSold.toString(),
        costBasis: record.costBasis.toString(),
        saleProceeds: record.saleProceeds.toString(),
        realizedPL: record.realizedPL.toString(),
        holdingPeriod: record.holdingPeriod
      })),
      symbolBreakdown: result.symbolBreakdown.map(item => ({
        symbol: item.symbol,
        totalPL: item.totalPL.toString(),
        tradeCount: item.tradeCount
      }))
    })
  } catch (error: any) {
    console.error('Error fetching portfolio realized P&L:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (error.message === 'Portfolio not found') {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
