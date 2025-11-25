import { NextRequest, NextResponse } from 'next/server'
import { StrategyService, StrategyInput } from '@/services/strategy.service'
import { requireAuth } from '@/lib/auth/middleware'

/**
 * GET /api/strategies
 * Get all strategies for the authenticated user
 * 
 * Requirements: 10.1, 10.2
 */
export async function GET(request: NextRequest) {
  try {
    // Validate session
    const user = await requireAuth(request)

    // Get strategies
    const strategyService = new StrategyService()
    const strategies = await strategyService.getUserStrategies(user.id)

    return NextResponse.json(strategies)
  } catch (error: any) {
    console.error('Error fetching strategies:', error)
    
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
 * POST /api/strategies
 * Create a new strategy
 * 
 * Requirements: 10.1, 10.2
 */
export async function POST(request: NextRequest) {
  try {
    // Validate session
    const user = await requireAuth(request)

    // Parse request body
    const body = await request.json()
    const { name, description, conditions, logic } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Strategy name is required' },
        { status: 400 }
      )
    }

    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return NextResponse.json(
        { error: 'Strategy must have at least one condition' },
        { status: 400 }
      )
    }

    if (!logic || !['AND', 'OR'].includes(logic)) {
      return NextResponse.json(
        { error: 'Strategy logic must be either AND or OR' },
        { status: 400 }
      )
    }

    // Create strategy input
    const strategyInput: StrategyInput = {
      userId: user.id,
      name,
      description,
      conditions,
      logic,
    }

    // Create strategy
    const strategyService = new StrategyService()
    const strategy = await strategyService.createStrategy(strategyInput)

    return NextResponse.json(strategy, { status: 201 })
  } catch (error: any) {
    console.error('Error creating strategy:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Handle validation errors
    if (
      error.message?.includes('name cannot be empty') ||
      error.message?.includes('must have at least one condition') ||
      error.message?.includes('logic must be') ||
      error.message?.includes('Invalid condition') ||
      error.message?.includes('requires a value') ||
      error.message?.includes('requires high and low')
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
