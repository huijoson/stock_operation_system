import { NextRequest, NextResponse } from 'next/server'
import { TransactionService } from '@/services/transaction.service'
import { requireAuth } from '@/lib/auth/middleware'

/**
 * PUT /api/transactions/:id
 * Update a transaction and recalculate holdings
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
    const { type, quantity, price, date } = body

    // Validate required fields
    if (!type || !quantity || !price || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate type
    if (type !== 'BUY' && type !== 'SELL') {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      )
    }

    // Validate numbers
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      )
    }

    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: 'Price must be greater than 0' },
        { status: 400 }
      )
    }

    // Update transaction
    const transactionService = new TransactionService()
    const transaction = await transactionService.updateTransaction(id, {
      type,
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      date: new Date(date),
    })

    return NextResponse.json({ transaction })
  } catch (error: any) {
    console.error('Error updating transaction:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (error.message === 'Transaction not found') {
      return NextResponse.json(
        { error: 'Transaction not found' },
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
 * DELETE /api/transactions/:id
 * Delete a transaction and recalculate holdings
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

    // Delete transaction
    const transactionService = new TransactionService()
    await transactionService.deleteTransaction(id)

    return NextResponse.json({ message: 'Transaction deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting transaction:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (error.message === 'Transaction not found') {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
