import { PrismaClient } from '@prisma/client'
import { Request, Response, Router } from 'express'
import prisma from '../lib/prisma'
import { StockService } from '../services/stock.service'

const router = Router()
const searchPrisma = new PrismaClient()
const priceStockService = new StockService(prisma)
const historyPrisma = new PrismaClient()
const historyStockService = new StockService(historyPrisma)

router.get('/search', async (req: Request, res: Response) => {
  try {
    const keyword = req.query.q as string | undefined

    if (!keyword) {
      return res.status(400).json({ error: 'Search keyword is required' })
    }

    if (keyword.trim().length < 2) {
      return res.status(400).json({ error: 'Search keyword must be at least 2 characters' })
    }

    const stockService = new StockService(searchPrisma)
    const stocks = await stockService.searchStocks(keyword)

    return res.json({
      stocks,
      count: stocks.length,
    })
  } catch (error) {
    console.error('Error searching stocks:', error)
    return res.status(500).json({
      error: 'Failed to search stocks',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

router.get('/:symbol/price', async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol

    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' })
    }

    const price = await priceStockService.getCurrentPrice(symbol)

    return res.json({
      symbol,
      price: price.toString(),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching stock price:', error)

    if (error instanceof Error) {
      if (error.message.includes('Stock not found')) {
        return res.status(404).json({ error: `Stock not found: ${req.params.symbol}` })
      }

      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Failed to fetch stock price' })
  }
})

router.get('/:symbol/history', async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol
    const startDateParam = req.query.startDate as string | undefined
    const endDateParam = req.query.endDate as string | undefined

    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' })
    }

    if (!startDateParam || !endDateParam) {
      return res.status(400).json({ error: 'startDate and endDate are required' })
    }

    const startDate = new Date(startDateParam)
    const endDate = new Date(endDateParam)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO format (YYYY-MM-DD)' })
    }

    if (startDate > endDate) {
      return res.status(400).json({ error: 'startDate must be before endDate' })
    }

    const prices = await historyStockService.getHistoricalPrices(symbol, startDate, endDate)

    return res.json({
      symbol,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      prices: prices.map((p: any) => ({
        date: p.date.toISOString(),
        price: p.price.toString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching historical prices:', error)

    if (error instanceof Error) {
      if (error.message.includes('Stock not found')) {
        return res.status(404).json({ error: `Stock not found: ${req.params.symbol}` })
      }

      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Failed to fetch historical prices' })
  } finally {
    await historyPrisma.$disconnect()
  }
})

export { router }
