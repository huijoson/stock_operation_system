import { NextRequest, NextResponse } from 'next/server'
import { TransactionService } from '@/services/transaction.service'
import { requireAuth } from '@/lib/auth/middleware'

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
