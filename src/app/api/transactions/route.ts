import { NextRequest, NextResponse } from 'next/server'
import { TransactionService } from '@/services/transaction.service'
import { requireAuth } from '@/lib/auth/middleware'
import Decimal from 'decimal.js'

/**
 * POST /api/transactions
 * Create a new transaction
 */
export async function POST(request: NextRequest) {
  try {
    // Validate session
    const user = await requireAuth(request)

    // Parse request body
    const body = await request.json()
    const { portfolioId, symbol, type, quantity, price, date } = body

    // Validate required fields
    if (!portfolioId || !symbol || !type || !quantity || !price || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate transaction type
    if (type !== 'BUY' && type !== 'SELL') {
      return NextResponse.json(
        { error: 'Transaction type must be BUY or SELL' },
        { status: 400 }
      )
    }

    // Convert to Decimal
    const quantityDecimal = new Decimal(quantity)
    const priceDecimal = new Decimal(price)
    const dateObj = new Date(date)

    // Create transaction
    const transactionService = new TransactionService()
    const transaction = await transactionService.createTransaction({
      portfolioId,
      symbol,
      type,
      quantity: quantityDecimal,
      price: priceDecimal,
      date: dateObj,
    })

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating transaction:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle validation errors
    if (
      error.message.includes('quantity') ||
      error.message.includes('price') ||
      error.message.includes('type') ||
      error.message.includes('symbol') ||
      error.message.includes('portfolioId')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Handle business logic errors
    if (
      error.message.includes('Cannot sell') ||
      error.message.includes('no holding exists')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 422 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
