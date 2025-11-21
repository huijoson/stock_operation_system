import { NextRequest, NextResponse } from 'next/server'
import { TransactionService } from '@/services/transaction.service'
import prisma from '@/lib/db/prisma'

/**
 * GET /api/transactions/export
 * Export transactions to CSV
 */
export async function GET(request: NextRequest) {
  try {
    // Get portfolioId from query params
    const { searchParams } = new URL(request.url)
    const portfolioId = searchParams.get('portfolioId')

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      )
    }

    // Verify portfolio exists
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    // Export transactions to CSV
    const transactionService = new TransactionService(prisma)
    const csvContent = await transactionService.exportToCSV(portfolioId)

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="transactions-${portfolioId}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting transactions:', error)
    return NextResponse.json(
      { error: 'Failed to export transactions' },
      { status: 500 }
    )
  }
}
