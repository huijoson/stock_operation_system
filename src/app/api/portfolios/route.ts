import { NextRequest, NextResponse } from 'next/server'
import { PortfolioService } from '@/services/portfolio.service'
import { requireAuth } from '@/lib/auth/middleware'

/**
 * GET /api/portfolios
 * Get all portfolios for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Validate session
    const user = await requireAuth(request)

    // Get portfolios
    const portfolioService = new PortfolioService()
    const portfolios = await portfolioService.getPortfolios(user.id)

    return NextResponse.json({ portfolios })
  } catch (error: any) {
    console.error('Error fetching portfolios:', error)
    
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

/**
 * POST /api/portfolios
 * Create a new portfolio
 */
export async function POST(request: NextRequest) {
  try {
    // Validate session
    const user = await requireAuth(request)

    // Parse request body
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Portfolio name is required' },
        { status: 400 }
      )
    }

    // Create portfolio
    const portfolioService = new PortfolioService()
    const portfolio = await portfolioService.createPortfolio(user.id, name)

    return NextResponse.json({ portfolio }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating portfolio:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Handle validation errors
    if (error.message?.includes('empty or whitespace')) {
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
