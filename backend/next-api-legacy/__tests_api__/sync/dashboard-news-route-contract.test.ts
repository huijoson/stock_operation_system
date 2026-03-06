import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockRun = jest.fn()

jest.mock('@/services/dashboard-news-sync.service', () => ({
  DashboardNewsSyncService: jest.fn().mockImplementation(() => ({
    run: mockRun,
  })),
}))

async function loadPostHandler() {
  jest.resetModules()
  const mod = await import('@/app/api/sync/dashboard-news/route')
  return mod.POST as (req: Request) => Promise<Response>
}

describe('POST /api/sync/dashboard-news — contract responses (T008)', () => {
  const VALID_SECRET = 'test-cron-secret-abc123'

  beforeEach(() => {
    process.env.CRON_SECRET = VALID_SECRET
    mockRun.mockReset()
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  function createAuthorizedRequest(): Request {
    return new Request('http://localhost/api/sync/dashboard-news', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VALID_SECRET}`,
      },
    })
  }

  it('returns 200 with SyncSuccessResponse when sync succeeds', async () => {
    mockRun.mockResolvedValue({
      status: 'SUCCESS',
      upserted: 48,
      skipped: 2,
      quotaUsedToday: 5,
      quotaRemainingToday: 15,
      syncedAt: '2024-01-15T11:00:00.000Z',
    })

    const POST = await loadPostHandler()
    const res = await POST(createAuthorizedRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
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

  it('returns 429 with unified ErrorResponse + Retry-After header on quota exceeded', async () => {
    mockRun.mockResolvedValue({
      status: 'QUOTA_EXCEEDED',
      upserted: 0,
      skipped: 0,
      quotaUsedToday: 20,
      quotaRemainingToday: 0,
      syncedAt: '2024-01-15T11:00:00.000Z',
    })

    const POST = await loadPostHandler()
    const res = await POST(createAuthorizedRequest())
    const body = await res.json()

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toMatch(/^\d+$/)
    expect(body.success).toBe(false)
    expect(body.code).toBe('QUOTA_EXCEEDED')
    expect(typeof body.error).toBe('string')
    expect(body.retryAfter).toBe(Number(res.headers.get('Retry-After')))
  })

  it('429 error message should be zh-TW about quota exceeded (T012)', async () => {
    mockRun.mockResolvedValue({
      status: 'QUOTA_EXCEEDED',
      upserted: 0,
      skipped: 0,
      quotaUsedToday: 20,
      quotaRemainingToday: 0,
      syncedAt: '2024-01-15T11:00:00.000Z',
    })

    const POST = await loadPostHandler()
    const res = await POST(createAuthorizedRequest())
    const body = await res.json()

    expect(res.status).toBe(429)
    expect(body.error).toContain('配額已達上限')
    expect(body.error).toContain('Alpha Vantage')
  })

  it('returns 503 with unified ErrorResponse on upstream failure', async () => {
    mockRun.mockResolvedValue({
      status: 'UPSTREAM_UNAVAILABLE',
      upserted: 0,
      skipped: 0,
      quotaUsedToday: 6,
      quotaRemainingToday: 14,
      syncedAt: '2024-01-15T11:00:00.000Z',
    })

    const POST = await loadPostHandler()
    const res = await POST(createAuthorizedRequest())
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body).toEqual({
      success: false,
      error: '無法連接至 Alpha Vantage API，將使用前次同步資料',
      code: 'UPSTREAM_UNAVAILABLE',
    })
    expect(body.retryAfter).toBeUndefined()
  })
})
