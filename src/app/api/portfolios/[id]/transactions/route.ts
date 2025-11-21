import { NextRequest, NextResponse } from 'next/server'
import { TransactionService } from '@/services/transaction.service'
import { requireAuth } from '@/lib/auth/middleware'

/**
 * GET /api/portfolios/:id/transactions
 * Get all transactions for a portfolio
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

    // Get transactions
    const transactionService = new TransactionService()
    const transactions = await transactionService.getTransactions(id)

    return NextResponse.json({ transactions })
  } catch (error: any) {
    console.error('Error fetching transactions:', error)
    
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
