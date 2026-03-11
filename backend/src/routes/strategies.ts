import { Request, Response, Router } from 'express'
import { StrategyInput, StrategyService } from '../services/strategy.service'
import { getPathParam, getQueryParam } from './request-utils'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user
    if (!user) {
      throw new Error('Unauthorized')
    }

    const strategyService = new StrategyService()
    const strategies = await strategyService.getUserStrategies(user.id)

    return res.json(strategies)
  } catch (error: any) {
    console.error('Error fetching strategies:', error)

    if (error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const user = req.user
    if (!user) {
      throw new Error('Unauthorized')
    }

    const body = req.body
    const { name, description, conditions, logic } = body

    if (!name) {
      return res.status(400).json({ error: 'Strategy name is required' })
    }

    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return res.status(400).json({ error: 'Strategy must have at least one condition' })
    }

    if (!logic || !['AND', 'OR'].includes(logic)) {
      return res.status(400).json({ error: 'Strategy logic must be either AND or OR' })
    }

    const strategyInput: StrategyInput = {
      userId: user.id,
      name,
      description,
      conditions,
      logic,
    }

    const strategyService = new StrategyService()
    const strategy = await strategyService.createStrategy(strategyInput)

    return res.status(201).json(strategy)
  } catch (error: any) {
    console.error('Error creating strategy:', error)

    if (error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (
      error.message?.includes('name cannot be empty') ||
      error.message?.includes('must have at least one condition') ||
      error.message?.includes('logic must be') ||
      error.message?.includes('Invalid condition') ||
      error.message?.includes('requires a value') ||
      error.message?.includes('requires high and low')
    ) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user
    if (!user) {
      throw new Error('Unauthorized')
    }

    const strategyId = getPathParam(req, 'id')

    if (!strategyId) {
      return res.status(400).json({ error: 'Strategy ID is required' })
    }

    const strategyService = new StrategyService()
    const strategy = await strategyService.getStrategy(strategyId)

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' })
    }

    if (strategy.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden - You do not have access to this strategy' })
    }

    return res.json(strategy)
  } catch (error: any) {
    console.error('Error fetching strategy:', error)

    if (error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user
    if (!user) {
      throw new Error('Unauthorized')
    }

    const strategyId = getPathParam(req, 'id')

    if (!strategyId) {
      return res.status(400).json({ error: 'Strategy ID is required' })
    }
    const strategyService = new StrategyService()
    const existingStrategy = await strategyService.getStrategy(strategyId)

    if (!existingStrategy) {
      return res.status(404).json({ error: 'Strategy not found' })
    }

    if (existingStrategy.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden - You do not have access to this strategy' })
    }

    const body = req.body
    const { name, description, conditions, logic } = body

    if (logic && !['AND', 'OR'].includes(logic)) {
      return res.status(400).json({ error: 'Strategy logic must be either AND or OR' })
    }

    if (conditions !== undefined) {
      if (!Array.isArray(conditions) || conditions.length === 0) {
        return res.status(400).json({ error: 'Strategy must have at least one condition' })
      }
    }

    const updates: Partial<StrategyInput> = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (conditions !== undefined) updates.conditions = conditions
    if (logic !== undefined) updates.logic = logic

    const strategy = await strategyService.updateStrategy(strategyId, updates)

    return res.json(strategy)
  } catch (error: any) {
    console.error('Error updating strategy:', error)

    if (error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (
      error.message?.includes('logic must be') ||
      error.message?.includes('Invalid condition') ||
      error.message?.includes('requires a value') ||
      error.message?.includes('requires high and low')
    ) {
      return res.status(400).json({ error: error.message })
    }

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Strategy not found' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.user
    if (!user) {
      throw new Error('Unauthorized')
    }

    const strategyId = getPathParam(req, 'id')

    if (!strategyId) {
      return res.status(400).json({ error: 'Strategy ID is required' })
    }
    const strategyService = new StrategyService()
    const existingStrategy = await strategyService.getStrategy(strategyId)

    if (!existingStrategy) {
      return res.status(404).json({ error: 'Strategy not found' })
    }

    if (existingStrategy.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden - You do not have access to this strategy' })
    }

    await strategyService.deleteStrategy(strategyId)

    return res.json({ message: 'Strategy deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting strategy:', error)

    if (error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Strategy not found' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/backtest', async (req: Request, res: Response) => {
  try {
    const user = req.user
    if (!user) {
      throw new Error('Unauthorized')
    }

    const strategyId = getPathParam(req, 'id')
    const symbol = getQueryParam(req, 'symbol')
    const startDateStr = getQueryParam(req, 'startDate')
    const endDateStr = getQueryParam(req, 'endDate')

    if (!strategyId) {
      return res.status(400).json({ error: 'Strategy ID is required' })
    }

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' })
    }

    if (!startDateStr || !endDateStr) {
      return res.status(400).json({ error: 'Start date and end date are required' })
    }

    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' })
    }

    if (startDate >= endDate) {
      return res.status(400).json({ error: 'Start date must be before end date' })
    }

    const strategyService = new StrategyService()
    const strategy = await strategyService.getStrategy(strategyId)

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' })
    }

    if (strategy.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden - You do not have access to this strategy' })
    }

    const result = await strategyService.backtest(strategyId, symbol, startDate, endDate)

    let totalReturn = 0
    const equityCurve: Array<{ date: string; equity: number }> = []
    let currentEquity = 100000

    const sellTrades = result.trades.filter((t: any) => t.type === 'SELL')
    for (const trade of sellTrades) {
      if (trade.return) {
        totalReturn += trade.return
        currentEquity = currentEquity * (1 + trade.return / 100)
        equityCurve.push({
          date: trade.date.toISOString().split('T')[0],
          equity: currentEquity,
        })
      }
    }

    const serializedResult = {
      id: strategyId,
      strategyId,
      strategyName: strategy.name,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalTrades: result.totalTrades,
      winRate: result.winRate,
      avgReturn: parseFloat(result.averageReturn.toString()),
      maxDrawdown: parseFloat(result.maxDrawdown.toString()),
      totalReturn,
      trades: result.trades.map((trade: any) => ({
        date: trade.date.toISOString().split('T')[0],
        type: trade.type,
        price: parseFloat(trade.price.toString()),
        quantity: trade.quantity,
        profit: trade.profit ? parseFloat(trade.profit.toString()) : undefined,
        profitPercent: trade.return,
      })),
      equityCurve,
      createdAt: new Date().toISOString(),
    }

    return res.json(serializedResult)
  } catch (error: any) {
    console.error('Error executing backtest:', error)

    if (error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (
      error.message?.includes('Strategy not found') ||
      error.message?.includes('Insufficient historical data') ||
      error.message?.includes('Stock not found')
    ) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

export { router }
