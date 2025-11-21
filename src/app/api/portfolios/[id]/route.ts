import { NextRequest, NextResponse } from 'next/server'
import { PortfolioService } from '@/services/portfolio.service'
import { requireAuth } from '@/lib/auth/middleware'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * GET /api/portfolios/:id
 * Get a single portfolio
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

    // Get portfolio
    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (portfolio.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json({ portfolio })
  } catch (error: any) {
    console.error('Error fetching portfolio:', error)
    
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
 * PUT /api/portfolios/:id
 * Update a portfolio
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate session
    const user = await requireAuth(request)

    // Await params in Next.js 15
    const { id } = await params

    // Parse request body
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Portfolio name is required' },
        { status: 400 }
      )
    }

    // Update portfolio
    const portfolioService = new PortfolioService()
    const portfolio = await portfolioService.updatePortfolio(id, name)

    return NextResponse.json({ portfolio })
  } catch (error: any) {
    console.error('Error updating portfolio:', error)
    
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

    // Handle not found errors
    if (error.code === 'P2025') {
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

/**
 * DELETE /api/portfolios/:id
 * Delete a portfolio
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate session
    const user = await requireAuth(request)

    // Await params in Next.js 15
    const { id } = await params

    // Delete portfolio
    const portfolioService = new PortfolioService()
    await portfolioService.deletePortfolio(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting portfolio:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Handle not found errors
    if (error.code === 'P2025') {
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
