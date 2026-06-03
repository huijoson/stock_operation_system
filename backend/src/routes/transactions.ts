import { Router, Request, Response } from 'express'
import Decimal from 'decimal.js'
import prisma from '../lib/prisma'
import { getPathParam } from './request-utils'
import { TransactionService } from '../services/transaction.service'
import { detectCSVFormat, CSVFormat } from '../lib/csv/csv-parser'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  try {
    const { portfolioId, symbol, type, quantity, price, date } = req.body

    if (!portfolioId || !symbol || !type || !quantity || !price || !date) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (type !== 'BUY' && type !== 'SELL') {
      return res.status(400).json({ error: 'Transaction type must be BUY or SELL' })
    }

    const quantityDecimal = new Decimal(quantity)
    const priceDecimal = new Decimal(price)
    const dateObj = new Date(date)

    const transactionService = new TransactionService()
    const transaction = await transactionService.createTransaction({
      portfolioId,
      symbol,
      type,
      quantity: quantityDecimal,
      price: priceDecimal,
      date: dateObj,
    })

    return res.status(201).json({ transaction })
  } catch (error: unknown) {
    console.error('Error creating transaction:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (
      error instanceof Error &&
      (error.message.includes('quantity') ||
        error.message.includes('price') ||
        error.message.includes('type') ||
        error.message.includes('symbol') ||
        error.message.includes('portfolioId'))
    ) {
      return res.status(400).json({ error: error.message })
    }

    if (
      error instanceof Error &&
      (error.message.includes('Cannot sell') || error.message.includes('no holding exists'))
    ) {
      return res.status(422).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { portfolioId, transactions } = req.body

    if (!portfolioId) {
      return res.status(400).json({ error: 'portfolioId is required' })
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'transactions must be a non-empty array' })
    }

    const inputs = transactions.map((t: any, i: number) => {
      const { symbol, type, quantity, price, date } = t
      if (!symbol || !type || !quantity || !price || !date) {
        throw Object.assign(new Error(`Missing required fields in transaction at index ${i}`), { status: 400 })
      }
      if (type !== 'BUY' && type !== 'SELL') {
        throw Object.assign(new Error(`Invalid type at index ${i}`), { status: 400 })
      }
      return {
        symbol,
        type,
        quantity: new Decimal(quantity),
        price: new Decimal(price),
        date: new Date(date),
      }
    })

    const transactionService = new TransactionService()
    const created = await transactionService.createTransactionsBulk(portfolioId, inputs)

    return res.status(201).json({ transactions: created })
  } catch (error: unknown) {
    console.error('Error bulk creating transactions:', error)

    if (error instanceof Error && (error as any).status === 400) {
      return res.status(400).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('must not be empty')) {
      return res.status(400).json({ error: error.message })
    }

    if (
      error instanceof Error &&
      (error.message.includes('Cannot sell') || error.message.includes('no holding exists'))
    ) {
      return res.status(422).json({ error: error.message })
    }

    if (
      error instanceof Error &&
      (error.message.includes('quantity') ||
        error.message.includes('price') ||
        error.message.includes('type') ||
        error.message.includes('symbol') ||
        error.message.includes('portfolioId'))
    ) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = getPathParam(req, 'id')
    const { type, quantity, price, date } = req.body

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' })
    }

    if (!type || !quantity || !price || !date) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (type !== 'BUY' && type !== 'SELL') {
      return res.status(400).json({ error: 'Invalid transaction type' })
    }

    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' })
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' })
    }

    const transactionService = new TransactionService()
    const transaction = await transactionService.updateTransaction(id, {
      type,
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      date: new Date(date),
    })

    return res.json({ transaction })
  } catch (error: unknown) {
    console.error('Error updating transaction:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (error instanceof Error && error.message === 'Transaction not found') {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = getPathParam(req, 'id')

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' })
    }

    const transactionService = new TransactionService()
    await transactionService.deleteTransaction(id)

    return res.json({ message: 'Transaction deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting transaction:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (error instanceof Error && error.message === 'Transaction not found') {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/export', async (req: Request, res: Response) => {
  try {
    const portfolioId = req.query.portfolioId as string

    if (!portfolioId) {
      return res.status(400).json({ error: 'Portfolio ID is required' })
    }

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
    })

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    const transactionService = new TransactionService(prisma)
    const csvContent = await transactionService.exportToCSV(portfolioId)

    res.set('Content-Type', 'text/csv; charset=utf-8')
    res.set('Content-Disposition', `attachment; filename="transactions-${portfolioId}.csv"`)
    return res.send(csvContent)
  } catch (error: unknown) {
    console.error('Error exporting transactions:', error)
    return res.status(500).json({ error: 'Failed to export transactions' })
  }
})

router.post('/import', async (req: Request, res: Response) => {
  try {
    const file = req.body?.file as { text: () => Promise<string> } | string | undefined
    const portfolioId = req.body?.portfolioId as string
    const requestedFormat = (req.body?.format as string) || 'auto'

    if (!file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    if (!portfolioId) {
      return res.status(400).json({ error: 'Portfolio ID is required' })
    }

    const csvContent = typeof file === 'string' ? file : await file.text()

    const validFormats: CSVFormat[] = ['schwab', 'firstrade', 'schwab-zh', 'firstrade-zh']
    let format: CSVFormat
    if (requestedFormat === 'auto') {
      const detected = detectCSVFormat(csvContent)
      if (!detected) {
        return res.status(400).json({ error: 'Unable to auto-detect CSV format' })
      }
      format = detected
    } else if (validFormats.includes(requestedFormat as CSVFormat)) {
      format = requestedFormat as CSVFormat
    } else {
      return res.status(400).json({ error: 'Invalid format' })
    }

    const transactionService = new TransactionService(prisma)
    const result = await transactionService.importFromCSV(portfolioId, csvContent, format)

    return res.status(200).json({ ...result, format })
  } catch (error: unknown) {
    console.error('CSV import error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to import CSV',
    })
  }
})

export { router }
