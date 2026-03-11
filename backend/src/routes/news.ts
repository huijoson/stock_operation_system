import { Request, Response, Router } from 'express'
import { FinnhubClient } from '../lib/api/finnhub-client'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { CredibilityService } from '../services/credibility.service'
import { NewsService } from '../services/news.service'
import { SentimentAnalysisService } from '../services/sentiment-analysis.service'
import { getPathParam, getQueryParam } from './request-utils'

const router = Router()
const sentimentService = new SentimentAnalysisService(prisma)

router.get('/sources', async (_req: Request, res: Response) => {
  try {
    const service = new CredibilityService(prisma)
    const ratings = await service.getAllSourceRatings()

    const grouped = {
      official: ratings.filter((r: any) => r.credibilityLevel === 'official'),
      mainstream: ratings.filter((r: any) => r.credibilityLevel === 'mainstream'),
      unverified: ratings.filter((r: any) => r.credibilityLevel === 'unverified'),
    }

    return res.json({
      success: true,
      data: {
        sources: ratings,
        grouped,
      },
    })
  } catch (error) {
    console.error('取得新聞來源評等失敗:', error)
    return res.status(500).json({
      success: false,
      error: '取得新聞來源評等失敗',
    })
  }
})

router.get('/sentiment/:symbol', authMiddleware, async (req: Request, res: Response) => {
  try {
    const symbol = getPathParam(req, 'symbol')

    if (!symbol) {
      return res.status(400).json({ error: '股票代號為必填欄位' })
    }

    const sentimentData = await sentimentService.getSentimentScore(symbol.toUpperCase())

    if (!sentimentData) {
      return res.status(404).json({
        error: 'INSUFFICIENT_DATA',
        message: '近期沒有足夠的新聞資料進行情緒分析',
      })
    }

    return res.json({
      symbol: sentimentData.symbol,
      averageScore: sentimentData.averageScore,
      overallSentiment: sentimentData.overallLabel,
      newsCount: sentimentData.newsCount,
      breakdown: {
        positive: sentimentData.positiveCount,
        neutral: sentimentData.neutralCount,
        negative: sentimentData.negativeCount,
      },
      analysisWindow: '過去 7 天',
    })
  } catch (error) {
    console.error('Error fetching sentiment analysis:', error)
    return res.status(500).json({ error: '無法取得情緒分析資料' })
  }
})

router.get('/portfolio/:portfolioId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const portfolioId = getPathParam(req, 'portfolioId')

    if (!portfolioId) {
      return res.status(400).json({
        success: false,
        error: '投資組合 ID 為必填欄位',
      })
    }

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        holdings: {
          where: {
            quantity: { gt: 0 },
          },
          select: {
            symbol: true,
          },
        },
      },
    })

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: '投資組合不存在',
      })
    }

    const apiKey = process.env.FINNHUB_API_KEY
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Finnhub API Key 未設定',
      })
    }

    const symbols = portfolio.holdings.map((h: any) => h.symbol)
    const finnhubClient = new FinnhubClient(apiKey)
    const service = new NewsService(prisma, finnhubClient)

    const newsMap = await service.getNewsForPortfolio(symbols)

    return res.json({
      success: true,
      data: {
        portfolioId,
        news: newsMap,
      },
    })
  } catch (error) {
    console.error('取得投資組合新聞失敗:', error)
    return res.status(500).json({
      success: false,
      error: '取得投資組合新聞失敗',
    })
  }
})

router.get('/:symbol', authMiddleware, async (req: Request, res: Response) => {
  try {
    const rawSymbol = getPathParam(req, 'symbol')
    const symbol = rawSymbol?.toUpperCase()
    const limit = parseInt(getQueryParam(req, 'limit') || '10', 10)

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: '股票代號為必填欄位',
      })
    }

    const apiKey = process.env.FINNHUB_API_KEY
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Finnhub API Key 未設定',
      })
    }

    const finnhubClient = new FinnhubClient(apiKey)
    const service = new NewsService(prisma, finnhubClient)
    const news = await service.getNews(symbol, limit)

    return res.json({
      success: true,
      data: {
        symbol,
        news,
        count: news.length,
      },
    })
  } catch (error) {
    console.error('取得新聞失敗:', error)

    if (error instanceof Error && error.message.includes('速率限制')) {
      return res.status(503).json({
        success: false,
        error: '新聞服務暫時不可用，請稍後再試',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
      })
    }

    return res.status(500).json({
      success: false,
      error: '取得新聞失敗',
    })
  }
})

export { router }
