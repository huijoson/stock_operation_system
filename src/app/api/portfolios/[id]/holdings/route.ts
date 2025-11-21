import { NextRequest, NextResponse } from 'next/server'
import { PortfolioService } from '@/services/portfolio.service'
import { requireAuth } from '@/lib/auth/middleware'

/**
 * GET /api/portfolios/:id/holdings
 * Get all holdings for a portfolio
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate session
    const user = await requireAuth(request)

    // Await params in Next.js 15
    const { id } = await params

    // Get holdings
    const portfolioService = new PortfolioService()
    const holdings = await portfolioService.getHoldings(id)

    return NextResponse.json({ holdings })
  } catch (error: any) {
    console.error('Error fetching holdings:', error)
    
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
