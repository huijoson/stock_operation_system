import { NextRequest, NextResponse } from 'next/server'
import { StrategyService, StrategyInput } from '@/services/strategy.service'
import { requireAuth } from '@/lib/auth/middleware'

/**
 * GET /api/strategies/:id
 * Get strategy details by ID
 * 
 * Requirements: 10.1, 10.2
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate session
    const user = await requireAuth(request)

    const { id: strategyId } = await params

    // Get strategy
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

    return NextResponse.json(strategy)
  } catch (error: any) {
    console.error('Error fetching strategy:', error)
    
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
 * PUT /api/strategies/:id
 * Update strategy
 * 
 * Requirements: 10.1, 10.2
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate session
    const user = await requireAuth(request)

    const { id: strategyId } = await params

    // Get existing strategy to verify ownership
    const strategyService = new StrategyService()
    const existingStrategy = await strategyService.getStrategy(strategyId)

    if (!existingStrategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (existingStrategy.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this strategy' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, description, conditions, logic } = body

    // Validate logic if provided
    if (logic && !['AND', 'OR'].includes(logic)) {
      return NextResponse.json(
        { error: 'Strategy logic must be either AND or OR' },
        { status: 400 }
      )
    }

    // Validate conditions if provided
    if (conditions !== undefined) {
      if (!Array.isArray(conditions) || conditions.length === 0) {
        return NextResponse.json(
          { error: 'Strategy must have at least one condition' },
          { status: 400 }
        )
      }
    }

    // Create update object
    const updates: Partial<StrategyInput> = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (conditions !== undefined) updates.conditions = conditions
    if (logic !== undefined) updates.logic = logic

    // Update strategy
    const strategy = await strategyService.updateStrategy(strategyId, updates)

    return NextResponse.json(strategy)
  } catch (error: any) {
    console.error('Error updating strategy:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Handle validation errors
    if (
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

    // Handle not found errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Strategy not found' },
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
 * DELETE /api/strategies/:id
 * Delete strategy
 * 
 * Requirements: 10.1, 10.2
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate session
    const user = await requireAuth(request)

    const { id: strategyId } = await params

    // Get existing strategy to verify ownership
    const strategyService = new StrategyService()
    const existingStrategy = await strategyService.getStrategy(strategyId)

    if (!existingStrategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (existingStrategy.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this strategy' },
        { status: 403 }
      )
    }

    // Delete strategy
    await strategyService.deleteStrategy(strategyId)

    return NextResponse.json({ message: 'Strategy deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting strategy:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Handle not found errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
