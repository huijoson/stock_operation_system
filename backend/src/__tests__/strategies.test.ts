import Decimal from 'decimal.js'
import request from 'supertest'

const mockGetUserStrategies = jest.fn()
const mockCreateStrategy = jest.fn()
const mockGetStrategy = jest.fn()
const mockUpdateStrategy = jest.fn()
const mockDeleteStrategy = jest.fn()
const mockBacktest = jest.fn()

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' }
    next()
  },
  getCurrentUser: jest.fn(),
  requireAuth: jest.fn(),
}))

jest.mock('../services/strategy.service', () => ({
  StrategyService: jest.fn().mockImplementation(() => ({
    getUserStrategies: mockGetUserStrategies,
    createStrategy: mockCreateStrategy,
    getStrategy: mockGetStrategy,
    updateStrategy: mockUpdateStrategy,
    deleteStrategy: mockDeleteStrategy,
    backtest: mockBacktest,
  })),
}))

jest.mock('../routes', () => {
  const { router: strategiesRouter } = require('../routes/strategies')
  const { authMiddleware } = require('../middleware/auth')
  return {
    registerRoutes: (app: any) => {
      app.use('/api/strategies', authMiddleware, strategiesRouter)
    },
  }
})

import app from '../app'

describe('Strategies API (supertest migration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockGetUserStrategies.mockResolvedValue([
      {
        id: 'strategy-1',
        userId: 'test-user-id',
        name: 'Test Strategy',
        description: 'A test strategy',
        conditions: [{ type: 'RSI_ABOVE', value: 70 }],
        logic: 'AND',
        isActive: true,
      },
    ])

    mockCreateStrategy.mockResolvedValue({
      id: 'new-strategy-id',
      userId: 'test-user-id',
      name: 'New Strategy',
      description: 'A new strategy',
      conditions: [{ type: 'RSI_BELOW', value: 30 }],
      logic: 'OR',
      isActive: true,
    })

    mockGetStrategy.mockImplementation(async (id: string) => {
      if (id === 'not-found') return null
      if (id === 'other-user') {
        return {
          id: 'other-user',
          userId: 'other-user-id',
          name: 'Other User Strategy',
          description: null,
          conditions: [{ type: 'RSI_ABOVE', value: 70 }],
          logic: 'AND',
          isActive: true,
        }
      }
      return {
        id,
        userId: 'test-user-id',
        name: 'Test Strategy',
        description: 'A test strategy',
        conditions: [{ type: 'RSI_ABOVE', value: 70 }],
        logic: 'AND',
        isActive: true,
      }
    })

    mockUpdateStrategy.mockResolvedValue({
      id: 'strategy-1',
      userId: 'test-user-id',
      name: 'Updated Strategy',
      description: 'Updated description',
      conditions: [{ type: 'RSI_BELOW', value: 30 }],
      logic: 'OR',
      isActive: true,
    })

    mockDeleteStrategy.mockResolvedValue(undefined)

    mockBacktest.mockResolvedValue({
      totalTrades: 10,
      winRate: 60,
      averageReturn: new Decimal('5.5'),
      maxDrawdown: new Decimal('12.3'),
      trades: [
        {
          date: new Date('2024-01-01'),
          type: 'BUY',
          price: new Decimal('100'),
          quantity: 1,
        },
        {
          date: new Date('2024-01-05'),
          type: 'SELL',
          price: new Decimal('105'),
          quantity: 1,
          profit: new Decimal('5'),
          return: 5,
        },
      ],
    })
  })

  it('returns strategy list for authenticated user', async () => {
    const response = await request(app).get('/api/strategies')
    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body[0].id).toBe('strategy-1')
  })

  it('returns 400 when strategy name is missing', async () => {
    const response = await request(app).post('/api/strategies').send({
      conditions: [{ type: 'RSI_ABOVE', value: 70 }],
      logic: 'AND',
    })
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('name is required')
  })

  it('returns 400 when strategy conditions are missing', async () => {
    const response = await request(app).post('/api/strategies').send({
      name: 'Test Strategy',
      logic: 'AND',
    })
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('at least one condition')
  })

  it('returns 400 when strategy logic is invalid', async () => {
    const response = await request(app).post('/api/strategies').send({
      name: 'Test Strategy',
      conditions: [{ type: 'RSI_ABOVE', value: 70 }],
      logic: 'INVALID',
    })
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('logic must be either AND or OR')
  })

  it('creates strategy with valid payload', async () => {
    const response = await request(app).post('/api/strategies').send({
      name: 'Test Strategy',
      description: 'A test strategy',
      conditions: [{ type: 'RSI_BELOW', value: 30 }],
      logic: 'OR',
    })
    expect(response.status).toBe(201)
    expect(response.body.id).toBe('new-strategy-id')
    expect(mockCreateStrategy).toHaveBeenCalled()
  })

  it('returns 404 for missing strategy by id', async () => {
    const response = await request(app).get('/api/strategies/not-found')
    expect(response.status).toBe(404)
    expect(response.body.error).toContain('not found')
  })

  it('returns 403 for other user strategy by id', async () => {
    const response = await request(app).get('/api/strategies/other-user')
    expect(response.status).toBe(403)
    expect(response.body.error).toContain('Forbidden')
  })

  it('updates strategy with valid payload', async () => {
    const response = await request(app).put('/api/strategies/strategy-1').send({
      name: 'Updated Strategy',
    })
    expect(response.status).toBe(200)
    expect(response.body.id).toBe('strategy-1')
  })

  it('returns 400 when updating strategy with invalid logic', async () => {
    const response = await request(app).put('/api/strategies/strategy-1').send({
      logic: 'INVALID',
    })
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('logic must be either AND or OR')
  })

  it('deletes strategy with valid id', async () => {
    const response = await request(app).delete('/api/strategies/strategy-1')
    expect(response.status).toBe(200)
    expect(response.body.message).toContain('deleted successfully')
    expect(mockDeleteStrategy).toHaveBeenCalledWith('strategy-1')
  })

  it('returns 400 when backtest symbol is missing', async () => {
    const response = await request(app).get(
      '/api/strategies/strategy-1/backtest?startDate=2024-01-01&endDate=2024-12-31',
    )
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Symbol is required')
  })

  it('returns 404 when backtest strategy is missing', async () => {
    const response = await request(app).get(
      '/api/strategies/not-found/backtest?symbol=AAPL&startDate=2024-01-01&endDate=2024-12-31',
    )
    expect(response.status).toBe(404)
    expect(response.body.error).toContain('not found')
  })

  it('returns 403 when backtesting other user strategy', async () => {
    const response = await request(app).get(
      '/api/strategies/other-user/backtest?symbol=AAPL&startDate=2024-01-01&endDate=2024-12-31',
    )
    expect(response.status).toBe(403)
    expect(response.body.error).toContain('Forbidden')
  })

  it('executes backtest and serializes Decimal values', async () => {
    const response = await request(app).get(
      '/api/strategies/strategy-1/backtest?symbol=AAPL&startDate=2024-01-01&endDate=2024-12-31',
    )
    expect(response.status).toBe(200)
    expect(response.body.totalTrades).toBe(10)
    expect(typeof response.body.avgReturn).toBe('number')
    expect(typeof response.body.maxDrawdown).toBe('number')
    expect(Array.isArray(response.body.trades)).toBe(true)
  })
})
