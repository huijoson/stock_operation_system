import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { getPathParam } from './request-utils'
import { PortfolioService } from '../services/portfolio.service'
import { TransactionService } from '../services/transaction.service'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const portfolioService = new PortfolioService()
    const portfolios = await portfolioService.getPortfolios(req.user!.id)

    return res.json({ portfolios })
  } catch (error: unknown) {
    console.error('Error fetching portfolios:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Portfolio name is required' })
    }

    const portfolioService = new PortfolioService()
    const portfolio = await portfolioService.createPortfolio(req.user!.id, name)

    return res.status(201).json({ portfolio })
  } catch (error: unknown) {
    console.error('Error creating portfolio:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (error instanceof Error && error.message.includes('empty or whitespace')) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getPathParam(req, 'id')

    if (!id) {
      return res.status(400).json({ error: 'Portfolio ID is required' })
    }

    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
    })

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    if (portfolio.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    return res.json({ portfolio })
  } catch (error: unknown) {
    console.error('Error fetching portfolio:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = getPathParam(req, 'id')
    const { name } = req.body

    if (!id) {
      return res.status(400).json({ error: 'Portfolio ID is required' })
    }

    if (!name) {
      return res.status(400).json({ error: 'Portfolio name is required' })
    }

    const portfolioService = new PortfolioService()
    const portfolio = await portfolioService.updatePortfolio(id, name)

    return res.json({ portfolio })
  } catch (error: unknown) {
    console.error('Error updating portfolio:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (error instanceof Error && error.message.includes('empty or whitespace')) {
      return res.status(400).json({ error: error.message })
    }

    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = getPathParam(req, 'id')

    if (!id) {
      return res.status(400).json({ error: 'Portfolio ID is required' })
    }

    const portfolioService = new PortfolioService()
    await portfolioService.deletePortfolio(id)

    return res.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting portfolio:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/holdings', async (req: Request, res: Response) => {
  try {
    const id = getPathParam(req, 'id')

    if (!id) {
      return res.status(400).json({ error: 'Portfolio ID is required' })
    }

    const portfolioService = new PortfolioService()
    const holdings = await portfolioService.getHoldings(id)

    return res.json({ holdings })
  } catch (error: unknown) {
    console.error('Error fetching holdings:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/transactions', async (req: Request, res: Response) => {
  try {
    const id = getPathParam(req, 'id')

    if (!id) {
      return res.status(400).json({ error: 'Portfolio ID is required' })
    }

    const transactionService = new TransactionService()
    const transactions = await transactionService.getTransactions(id)

    return res.json({ transactions })
  } catch (error: unknown) {
    console.error('Error fetching transactions:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

export { router }
