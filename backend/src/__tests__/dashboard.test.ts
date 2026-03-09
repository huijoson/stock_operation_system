import request from 'supertest'

const mockDashboardQuery = jest.fn()
const mockDashboardSyncRun = jest.fn()

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' }
    next()
  },
  getCurrentUser: jest.fn(),
  requireAuth: jest.fn(),
}))

jest.mock('../services/dashboard-news.service', () => ({
  DashboardNewsQueryService: jest.fn().mockImplementation(() => ({
    query: mockDashboardQuery,
  })),
}))

jest.mock('../services/dashboard-news-sync.service', () => ({
  DashboardNewsSyncService: jest.fn().mockImplementation(() => ({
    run: mockDashboardSyncRun,
  })),
}))

jest.mock('../services/transaction.service', () => ({
  TransactionService: jest.fn().mockImplementation(() => ({
    exportHoldingsToCSV: jest.fn(),
  })),
}))

jest.mock('../routes', () => {
  const { router: miscRouter } = require('../routes/misc')
  return {
    registerRoutes: (app: any) => {
      app.use('/api', miscRouter)
    },
  }
})

import app from '../app'

describe('Dashboard and sync APIs (supertest migration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'test-cron-secret-abc123'
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('defaults dashboard news query to latest 5 items', async () => {
    mockDashboardQuery.mockResolvedValue({
      success: true,
      data: {
        items: [],
        meta: {
          total: 0,
          hasMore: false,
          nextCursor: null,
          lastSyncedAt: null,
          dataStalenessSecs: null,
        },
      },
    })

    const response = await request(app).get('/api/dashboard/news')
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(mockDashboardQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 5,
      }),
    )
  })

  it('passes category, limit and cursor to dashboard news query', async () => {
    mockDashboardQuery.mockResolvedValue({
      success: true,
      data: {
        items: [],
        meta: {
          total: 0,
          hasMore: true,
          nextCursor: '2024-01-15T09:00:00.000Z',
          lastSyncedAt: '2024-01-15T10:00:00.000Z',
          dataStalenessSecs: 1800,
        },
      },
    })

    const response = await request(app).get(
      '/api/dashboard/news?category=Finance&limit=10&cursor=2024-01-15T09:00:00.000Z',
    )
    expect(response.status).toBe(200)
    expect(mockDashboardQuery).toHaveBeenCalledWith({
      category: 'Finance',
      cursor: '2024-01-15T09:00:00.000Z',
      limit: 10,
    })
  })

  it('returns 400 for invalid dashboard category', async () => {
    const response = await request(app).get('/api/dashboard/news?category=Crypto')
    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      success: false,
      error: 'category 參數不合法',
      code: 'INVALID_INPUT',
    })
    expect(mockDashboardQuery).not.toHaveBeenCalled()
  })

  it('returns 401 for sync endpoint without Authorization header', async () => {
    const response = await request(app).post('/api/sync/dashboard-news')
    expect(response.status).toBe(401)
    expect(response.body.success).toBe(false)
    expect(response.body.code).toBe('UNAUTHORIZED')
    expect(response.body.error).toBe('未授權的請求')
    expect(mockDashboardSyncRun).not.toHaveBeenCalled()
  })

  it('returns 401 for sync endpoint with invalid token', async () => {
    const response = await request(app)
      .post('/api/sync/dashboard-news')
      .set('Authorization', 'Bearer wrong-token')

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('UNAUTHORIZED')
    expect(mockDashboardSyncRun).not.toHaveBeenCalled()
  })

  it('returns 401 when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET

    const response = await request(app)
      .post('/api/sync/dashboard-news')
      .set('Authorization', 'Bearer test-cron-secret-abc123')

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('UNAUTHORIZED')
    expect(mockDashboardSyncRun).not.toHaveBeenCalled()
  })

  it('returns 200 with success payload when sync succeeds', async () => {
    mockDashboardSyncRun.mockResolvedValue({
      status: 'SUCCESS',
      upserted: 48,
      skipped: 2,
      quotaUsedToday: 5,
      quotaRemainingToday: 15,
      syncedAt: '2024-01-15T11:00:00.000Z',
    })

    const response = await request(app)
      .post('/api/sync/dashboard-news')
      .set('Authorization', 'Bearer test-cron-secret-abc123')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        upserted: 48,
        skipped: 2,
        quotaUsedToday: 5,
        quotaRemainingToday: 15,
        syncedAt: '2024-01-15T11:00:00.000Z',
      },
    })
  })

  it('returns 429 with Retry-After on quota exceeded', async () => {
    mockDashboardSyncRun.mockResolvedValue({
      status: 'QUOTA_EXCEEDED',
      upserted: 0,
      skipped: 0,
      quotaUsedToday: 20,
      quotaRemainingToday: 0,
      syncedAt: '2024-01-15T11:00:00.000Z',
    })

    const response = await request(app)
      .post('/api/sync/dashboard-news')
      .set('Authorization', 'Bearer test-cron-secret-abc123')

    expect(response.status).toBe(429)
    expect(response.headers['retry-after']).toMatch(/^\d+$/)
    expect(response.body.success).toBe(false)
    expect(response.body.code).toBe('QUOTA_EXCEEDED')
    expect(response.body.error).toContain('配額已達上限')
    expect(response.body.retryAfter).toBe(Number(response.headers['retry-after']))
  })

  it('returns 503 with upstream unavailable payload', async () => {
    mockDashboardSyncRun.mockResolvedValue({
      status: 'UPSTREAM_UNAVAILABLE',
      upserted: 0,
      skipped: 0,
      quotaUsedToday: 6,
      quotaRemainingToday: 14,
      syncedAt: '2024-01-15T11:00:00.000Z',
    })

    const response = await request(app)
      .post('/api/sync/dashboard-news')
      .set('Authorization', 'Bearer test-cron-secret-abc123')

    expect(response.status).toBe(503)
    expect(response.body).toEqual({
      success: false,
      error: '無法連接至 Alpha Vantage API，將使用前次同步資料',
      code: 'UPSTREAM_UNAVAILABLE',
    })
  })
})
