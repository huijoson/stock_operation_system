import { NextRequest, NextResponse } from 'next/server'
import { realizedPLService } from '@/services/realized-pl.service'
import { requireAuth } from '@/lib/auth/middleware'
import { isValidTimePeriod } from '@/lib/utils/date-filters'

/**
 * GET /api/realized-pl
 * Get realized P&L summary for all portfolios owned by the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    const { searchParams } = new URL(request.url)
    const periodParam = searchParams.get('period') || 'all'
    
    if (!isValidTimePeriod(periodParam)) {
      return NextResponse.json(
        { error: 'Invalid period parameter. Must be one of: month, quarter, year, all' },
        { status: 400 }
      )
    }
    
    const summary = await realizedPLService.getSummary(user.id, periodParam)
    
    return NextResponse.json({
      totalRealizedPL: summary.totalRealizedPL.toString(),
      periodStart: summary.periodStart.toISOString().split('T')[0],
      periodEnd: summary.periodEnd.toISOString().split('T')[0],
      shortTermPL: summary.shortTermPL.toString(),
      longTermPL: summary.longTermPL.toString(),
      portfolioBreakdown: summary.portfolioBreakdown.map(item => ({
        portfolioId: item.portfolioId,
        portfolioName: item.portfolioName,
        realizedPL: item.realizedPL.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching realized P&L summary:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
