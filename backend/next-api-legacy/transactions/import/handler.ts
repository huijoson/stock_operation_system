import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { TransactionService } from '@/services/transaction.service'

const prisma = new PrismaClient()

/**
 * POST /api/transactions/import
 * Import transactions from CSV file
 */
export async function POST(request: NextRequest) {
  try {
    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const portfolioId = formData.get('portfolioId') as string
    const format = formData.get('format') as 'schwab' | 'firstrade'

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      )
    }

    if (!format || (format !== 'schwab' && format !== 'firstrade')) {
      return NextResponse.json(
        { error: 'Invalid format. Must be "schwab" or "firstrade"' },
        { status: 400 }
      )
    }

    // Read file content
    const csvContent = await file.text()

    // Import transactions
    const transactionService = new TransactionService(prisma)
    const result = await transactionService.importFromCSV(portfolioId, csvContent, format)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import CSV' },
      { status: 500 }
    )
  }
}
