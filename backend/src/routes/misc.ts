import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { DashboardNewsQueryService } from '../services/dashboard-news.service'
import { DashboardNewsSyncService } from '../services/dashboard-news-sync.service'
import { TransactionService } from '../services/transaction.service'
import { NEWS_CATEGORIES, type NewsCategory } from '../types/news.types'

const router = Router()

interface ErrorResponseBody {
  success: false
  error: string
  code: 'UNAUTHORIZED' | 'QUOTA_EXCEEDED' | 'UPSTREAM_UNAVAILABLE' | 'INVALID_INPUT' | 'INTERNAL_SERVER_ERROR'
  retryAfter?: number
}

const DEFAULT_LIMIT = 5
const CACHE_CONTROL_VALUE = 'public, max-age=300, stale-while-revalidate=3600'
const STALE_THRESHOLD_SECS = 15 * 60
const ON_DEMAND_SYNC_COOLDOWN_MS = 5 * 60 * 1000
const ENABLE_ON_DEMAND_SYNC =
  process.env.NODE_ENV !== 'test' && process.env.DASHBOARD_NEWS_ON_DEMAND_SYNC !== 'false'
let lastOnDemandSyncAttemptAt = 0

function verifyCronAuth(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return false
  }

  const authHeader = req.headers.authorization ?? ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)

  if (!match) {
    return false
  }

  const token = match[1]

  if (token.length !== cronSecret.length) {
    return false
  }

  let mismatch = 0
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ cronSecret.charCodeAt(i)
  }

  return mismatch === 0
}

function errorResponse(
  res: Response,
  status: 401 | 429 | 503,
  error: string,
  code: ErrorResponseBody['code'],
  retryAfter?: number
) {
  const body: ErrorResponseBody = {
    success: false,
    error,
    code,
    ...(retryAfter !== undefined ? { retryAfter } : {}),
  }

  if (retryAfter !== undefined) {
    res.setHeader('Retry-After', String(retryAfter))
  }

  return res.status(status).json(body)
}

function unauthorizedResponse(res: Response) {
  return errorResponse(res, 401, '未授權的請求', 'UNAUTHORIZED')
}

function secondsUntilNextUtcMidnight(now: Date = new Date()): number {
  const nextUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0
  )
  return Math.max(1, Math.ceil((nextUtcMidnight - now.getTime()) / 1000))
}

function isNewsCategory(value: string): value is NewsCategory {
  return NEWS_CATEGORIES.includes(value as NewsCategory)
}

function shouldAttemptOnDemandSync(stalenessSecs: number | null): boolean {
  if (!ENABLE_ON_DEMAND_SYNC) {
    return false
  }

  if (stalenessSecs !== null && stalenessSecs <= STALE_THRESHOLD_SECS) {
    return false
  }

  const now = Date.now()
  if (now - lastOnDemandSyncAttemptAt < ON_DEMAND_SYNC_COOLDOWN_MS) {
    return false
  }

  lastOnDemandSyncAttemptAt = now
  return true
}

router.post('/sync/dashboard-news', authMiddleware, async (req: Request, res: Response) => {
  if (!verifyCronAuth(req)) {
    return unauthorizedResponse(res)
  }

  const syncService = new DashboardNewsSyncService()
  let result: Awaited<ReturnType<DashboardNewsSyncService['run']>>
  try {
    result = await syncService.run()
  } catch {
    return errorResponse(res, 503, '無法連接至 Alpha Vantage API，將使用前次同步資料', 'UPSTREAM_UNAVAILABLE')
  }

  if (result.status === 'SUCCESS') {
    return res.status(200).json({
      success: true,
      data: {
        upserted: result.upserted,
        skipped: result.skipped,
        quotaUsedToday: result.quotaUsedToday,
        quotaRemainingToday: result.quotaRemainingToday,
        syncedAt: result.syncedAt,
      },
    })
  }

  if (result.status === 'QUOTA_EXCEEDED') {
    const retryAfter = secondsUntilNextUtcMidnight()
    return errorResponse(
      res,
      429,
      '今日 Alpha Vantage API 配額已達上限（20/25），跳過本次同步',
      'QUOTA_EXCEEDED',
      retryAfter
    )
  }

  return errorResponse(res, 503, '無法連接至 Alpha Vantage API，將使用前次同步資料', 'UPSTREAM_UNAVAILABLE')
})

router.get('/query-tsm', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const tsmTransactions = await prisma.transaction.findMany({
      where: {
        symbol: {
          equals: 'TSM',
          mode: 'insensitive',
        },
      },
      orderBy: { date: 'desc' },
      include: {
        portfolio: {
          select: { name: true, id: true },
        },
      },
    })

    const currentHolding = await prisma.holding.findFirst({
      where: {
        symbol: {
          equals: 'TSM',
          mode: 'insensitive',
        },
      },
      include: {
        portfolio: {
          select: { name: true, id: true },
        },
      },
    })

    const buyTransactions = tsmTransactions.filter((tx) => tx.type === 'BUY')
    const sellTransactions = tsmTransactions.filter((tx) => tx.type === 'SELL')

    return res.json({
      summary: {
        total: tsmTransactions.length,
        buyCount: buyTransactions.length,
        sellCount: sellTransactions.length,
      },
      buyTransactions: buyTransactions.map((tx) => ({
        id: tx.id,
        date: tx.date,
        portfolioName: tx.portfolio.name,
        portfolioId: tx.portfolio.id,
        quantity: tx.quantity.toString(),
        price: tx.price.toString(),
        total: (parseFloat(tx.quantity.toString()) * parseFloat(tx.price.toString())).toFixed(2),
      })),
      sellTransactions: sellTransactions.map((tx) => ({
        id: tx.id,
        date: tx.date,
        portfolioName: tx.portfolio.name,
        portfolioId: tx.portfolio.id,
        quantity: tx.quantity.toString(),
        price: tx.price.toString(),
        total: (parseFloat(tx.quantity.toString()) * parseFloat(tx.price.toString())).toFixed(2),
      })),
      currentHolding: currentHolding
        ? {
            portfolioName: currentHolding.portfolio.name,
            portfolioId: currentHolding.portfolio.id,
            quantity: currentHolding.quantity.toString(),
            averageCost: currentHolding.averageCost.toString(),
            totalCost: (
              parseFloat(currentHolding.quantity.toString()) *
              parseFloat(currentHolding.averageCost.toString())
            ).toFixed(2),
          }
        : null,
    })
  } catch (error: any) {
    console.error('Query error:', error)
    return res.status(500).json({ error: error.message })
  }
})

router.get('/holdings/export', authMiddleware, async (req: Request, res: Response) => {
  try {
    const portfolioId = req.query.portfolioId as string | undefined

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
    const csvContent = await transactionService.exportHoldingsToCSV(portfolioId)

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="holdings-${portfolioId}.csv"`)
    return res.status(200).send(csvContent)
  } catch (error) {
    console.error('Error exporting holdings:', error)
    return res.status(500).json({ error: 'Failed to export holdings' })
  }
})

router.get('/dashboard/news', authMiddleware, async (req: Request, res: Response) => {
  const category = (req.query.category as string) ?? undefined
  const cursor = (req.query.cursor as string) ?? undefined
  const limitParam = req.query.limit as string | undefined
  const parsedLimit = limitParam === undefined ? DEFAULT_LIMIT : Number(limitParam)

  if (category && !isNewsCategory(category)) {
    const body: ErrorResponseBody = {
      success: false,
      error: 'category 參數不合法',
      code: 'INVALID_INPUT',
    }
    return res.status(400).json(body)
  }

  const queryService = new DashboardNewsQueryService()

  try {
    let response = await queryService.query({
      category: category as NewsCategory | undefined,
      cursor,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_LIMIT,
    })

    if (shouldAttemptOnDemandSync(response.data.meta.dataStalenessSecs)) {
      const syncService = new DashboardNewsSyncService()
      try {
        const syncResult = await syncService.run()
        if (syncResult.status === 'SUCCESS') {
          response = await queryService.query({
            category: category as NewsCategory | undefined,
            cursor,
            limit: Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_LIMIT,
          })
        }
      } catch {
        // Keep serving cached data when on-demand sync fails.
      }
    }

    res.setHeader('Cache-Control', CACHE_CONTROL_VALUE)
    res.setHeader('X-Data-Staleness-Seconds', String(response.data.meta.dataStalenessSecs ?? ''))
    return res.status(200).json(response)
  } catch {
    const body: ErrorResponseBody = {
      success: false,
      error: '伺服器暫時無法處理請求，請稍後再試',
      code: 'INTERNAL_SERVER_ERROR',
    }
    return res.status(500).json(body)
  }
})

export { router }
