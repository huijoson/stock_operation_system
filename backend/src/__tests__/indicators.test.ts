import request from 'supertest'

const mockCacheGet = jest.fn()
const mockCacheSet = jest.fn()
const mockCacheInvalidate = jest.fn()
const mockCacheClear = jest.fn()
const mockCacheGetStats = jest.fn()

const mockCalculateRetracement = jest.fn()
const mockCalculateExtension = jest.fn()

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' }
    next()
  },
  getCurrentUser: jest.fn(),
  requireAuth: jest.fn(),
}))

jest.mock('../services/indicator-cache.service', () => ({
  IndicatorCacheService: jest.fn().mockImplementation(() => ({
    get: mockCacheGet,
    set: mockCacheSet,
    invalidate: mockCacheInvalidate,
    clear: mockCacheClear,
    getStats: mockCacheGetStats,
  })),
}))

jest.mock('../services/stock.service', () => ({
  StockService: jest.fn().mockImplementation(() => ({
    getHistoricalOHLC: jest.fn().mockResolvedValue([]),
  })),
}))

jest.mock('@/services/atr.service', () => ({
  ATRService: jest.fn().mockImplementation(() => ({
    calculateATR: jest.fn(),
    suggestStopLoss: jest.fn(),
  })),
}))

jest.mock('@/services/bollinger-bands.service', () => ({
  BollingerBandsService: jest.fn().mockImplementation(() => ({
    calculateBands: jest.fn(),
    detectSqueeze: jest.fn(),
  })),
}))

jest.mock('@/services/candlestick-pattern.service', () => ({
  CandlestickPatternService: jest.fn().mockImplementation(() => ({
    identifyPatterns: jest.fn(),
  })),
}))

jest.mock('@/services/macd.service', () => ({
  MACDService: jest.fn().mockImplementation(() => ({
    calculateMACD: jest.fn(),
  })),
}))

jest.mock('@/services/rsi.service', () => ({
  RSIService: jest.fn().mockImplementation(() => ({
    calculateRSI: jest.fn(),
  })),
}))

jest.mock('@/services/support-resistance.service', () => ({
  SupportResistanceService: jest.fn().mockImplementation(() => ({
    calculateLevels: jest.fn(),
    findGoldenRatioLevels: jest.fn(),
  })),
}))

jest.mock('@/services/technical-score.service', () => ({
  TechnicalScoreService: jest.fn().mockImplementation(() => ({
    calculateScore: jest.fn(),
    getComponentScores: jest.fn(),
  })),
}))

jest.mock('@/services/fibonacci.service', () => ({
  FibonacciService: jest.fn().mockImplementation(() => ({
    calculateRetracement: mockCalculateRetracement,
    calculateExtension: mockCalculateExtension,
  })),
}))

jest.mock('../routes', () => {
  const { router: indicatorsRouter } = require('../routes/indicators')
  const { authMiddleware } = require('../middleware/auth')
  return {
    registerRoutes: (app: any) => {
      app.use('/api/indicators', authMiddleware, indicatorsRouter)
    },
  }
})

import app from '../app'

describe('Indicators API (supertest migration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCacheGet.mockResolvedValue(null)
    mockCacheSet.mockResolvedValue(undefined)
    mockCacheInvalidate.mockResolvedValue(undefined)
    mockCacheClear.mockResolvedValue(42)
    mockCacheGetStats.mockResolvedValue({
      totalEntries: 100,
      expiredEntries: 10,
      byIndicatorType: {
        RSI: 30,
      },
    })

    mockCalculateRetracement.mockReturnValue({
      levels: [
        { ratio: 0.236, price: 88.2, label: '23.6%' },
        { ratio: 0.382, price: 80.9, label: '38.2%' },
        { ratio: 0.5, price: 75, label: '50%' },
        { ratio: 0.618, price: 69.1, label: '61.8%' },
        { ratio: 0.786, price: 60.7, label: '78.6%' },
      ],
      high: 100,
      low: 50,
      direction: 'uptrend',
    })

    mockCalculateExtension.mockReturnValue({
      targets: [
        { ratio: 1.0, price: 100, label: '100%' },
        { ratio: 1.618, price: 112.36, label: '161.8%' },
        { ratio: 2.618, price: 132.36, label: '261.8%' },
      ],
      start: 100,
      retracement: 80,
      breakout: 90,
    })
  })

  it('returns 400 when RSI symbol is missing', async () => {
    const response = await request(app).get('/api/indicators/rsi')
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('symbol parameter is required')
  })

  it('returns 400 for invalid MACD fastPeriod', async () => {
    const response = await request(app).get('/api/indicators/macd?symbol=AAPL&fastPeriod=0')
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('fastPeriod must be a positive number')
  })

  it('returns 400 for invalid Bollinger stdDev', async () => {
    const response = await request(app).get('/api/indicators/bollinger?symbol=AAPL&stdDev=0')
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('stdDev must be a positive number')
  })

  it('returns 400 for invalid ATR period', async () => {
    const response = await request(app).get('/api/indicators/atr?symbol=AAPL&period=0')
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('period must be a positive number')
  })

  it('returns 400 for invalid support-resistance tolerance', async () => {
    const response = await request(app).get('/api/indicators/support-resistance?symbol=AAPL&tolerance=1.5')
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('tolerance must be a number between 0 and 1')
  })

  it('returns 400 when technical-score symbol is missing', async () => {
    const response = await request(app).get('/api/indicators/technical-score')
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('symbol parameter is required')
  })

  it('returns 400 for invalid candlestick days', async () => {
    const response = await request(app).get('/api/indicators/candlestick-patterns?symbol=AAPL&days=0')
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('days must be a positive number')
  })

  it('returns Fibonacci retracement response for valid request', async () => {
    const response = await request(app).get('/api/indicators/fibonacci/retracement?high=100&low=50&isUptrend=true')
    expect(response.status).toBe(200)
    expect(response.body.high).toBe('100')
    expect(response.body.low).toBe('50')
    expect(response.body.direction).toBe('uptrend')
    expect(response.body.levels).toHaveLength(5)
  })

  it('returns 400 when Fibonacci extension start is missing', async () => {
    const response = await request(app).get('/api/indicators/fibonacci/extension?retracement=80&breakout=90')
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('start parameter is required')
  })

  it('clears cache for specific symbol', async () => {
    const response = await request(app).post('/api/indicators/cache/clear?symbol=AAPL')
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.symbol).toBe('AAPL')
    expect(mockCacheInvalidate).toHaveBeenCalledWith('AAPL')
  })

  it('returns cache stats', async () => {
    const response = await request(app).get('/api/indicators/cache/clear')
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.stats.totalEntries).toBe(100)
    expect(mockCacheGetStats).toHaveBeenCalled()
  })
})
