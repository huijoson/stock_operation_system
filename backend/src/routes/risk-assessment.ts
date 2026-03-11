import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { RiskAssessmentService } from '../services/risk-assessment.service'
import { SentimentAnalysisService } from '../services/sentiment-analysis.service'
import { getPathParam } from './request-utils'

const router = Router()

router.get('/:symbol', async (req: Request, res: Response) => {
  try {
    const symbol = getPathParam(req, 'symbol')

    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' })
    }

    const sentimentService = new SentimentAnalysisService(prisma)
    const riskService = new RiskAssessmentService(prisma, sentimentService)

    const assessment = await riskService.getRiskAssessment(symbol)

    const riskLevelLabels = {
      low: '低風險',
      medium: '中風險',
      high: '高風險',
    }

    const response = {
      symbol: assessment.symbol,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      riskLevelLabel: riskLevelLabels[assessment.riskLevel],
      technicalAnalysis: {
        score: assessment.technicalScore,
        components: {
          rsi: {
            score: assessment.rsiScore,
            weight: 0.25,
            signal: getRSISignal(assessment.rsiScore),
          },
          macd: {
            score: assessment.macdScore,
            weight: 0.25,
            signal: getMACDSignal(assessment.macdScore),
          },
          bollinger: {
            score: assessment.bollingerScore,
            weight: 0.25,
            signal: getBollingerSignal(assessment.bollingerScore),
          },
          fibonacci: {
            score: assessment.fibonacciScore,
            weight: 0.25,
            signal: getFibonacciSignal(assessment.fibonacciScore),
          },
        },
      },
      newsSentiment: assessment.newsScore
        ? {
            score: assessment.newsScore,
            sentiment: assessment.newsSentiment,
            sentimentLabel: getSentimentLabel(assessment.newsSentiment!),
            articleCount: assessment.newsArticleCount,
            confidence: 'medium',
          }
        : null,
      weights: {
        technical: assessment.technicalWeight,
        news: assessment.newsWeight,
      },
      calculatedAt: assessment.calculatedAt.toISOString(),
      expiresAt: assessment.expiresAt.toISOString(),
    }

    return res.json(response)
  } catch (error: any) {
    console.error('Error fetching risk assessment:', error)

    if (error.message?.includes('不足') || error.message?.includes('No price data')) {
      return res.status(404).json({
        error: 'INSUFFICIENT_DATA',
        message: '資料不足，無法評估',
        minDataDays: 50,
      })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { symbols } = req.body

    let symbolList: string[]
    if (symbols && Array.isArray(symbols) && symbols.length > 0) {
      symbolList = symbols
    } else {
      const allSymbols = await prisma.holding.findMany({
        distinct: ['symbol'],
        select: { symbol: true },
      })
      symbolList = allSymbols.map((h) => h.symbol)
    }

    const sentimentService = new SentimentAnalysisService(prisma)
    const riskService = new RiskAssessmentService(prisma, sentimentService)

    void riskService.batchCalculate(symbolList)

    return res.status(202).json({
      message: '批次計算已開始',
      symbolCount: symbolList.length,
    })
  } catch (error: any) {
    console.error('Error starting batch risk calculation:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/portfolio/:portfolioId', async (req: Request, res: Response) => {
  try {
    const portfolioId = getPathParam(req, 'portfolioId')
    const user = req.user

    if (!portfolioId) {
      return res.status(400).json({ error: 'Portfolio ID is required' })
    }

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
    })

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    if (portfolio.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const sentimentService = new SentimentAnalysisService(prisma)
    const riskService = new RiskAssessmentService(prisma, sentimentService)

    const summary = await riskService.getPortfolioRiskAssessments(portfolioId)

    const riskLevelLabels = {
      low: '低風險',
      medium: '中風險',
      high: '高風險',
    }

    const response = {
      portfolioId: summary.portfolioId,
      portfolioName: summary.portfolioName,
      overallRisk: summary.overallRisk,
      overallRiskLabel: riskLevelLabels[summary.overallRisk],
      holdings: summary.holdings.map((h) => ({
        symbol: h.symbol,
        riskScore: h.riskScore,
        riskLevel: h.riskLevel,
        riskLevelLabel: riskLevelLabels[h.riskLevel],
        marketValue: h.marketValue,
      })),
      highRiskCount: summary.highRiskCount,
      mediumRiskCount: summary.mediumRiskCount,
      lowRiskCount: summary.lowRiskCount,
    }

    return res.json(response)
  } catch (error: any) {
    console.error('Error fetching portfolio risk assessment:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

function getRSISignal(score: number): string {
  if (score <= 30) return 'RSI 超賣區域，可能反彈'
  if (score >= 70) return 'RSI 超買區域，可能回調'
  return 'RSI 中性區域'
}

function getMACDSignal(score: number): string {
  if (score <= 30) return 'MACD 賣出訊號'
  if (score >= 70) return 'MACD 買入訊號'
  return 'MACD 中性'
}

function getBollingerSignal(score: number): string {
  if (score <= 30) return '價格接近下軌，可能反彈'
  if (score >= 70) return '價格接近上軌，可能回調'
  return '價格於布林通道中段'
}

function getFibonacciSignal(score: number): string {
  if (score <= 30) return '價格接近支撐位'
  if (score >= 70) return '價格接近壓力位'
  return '價格於斐波那契中段'
}

function getSentimentLabel(sentiment: string): string {
  const labels: Record<string, string> = {
    positive: '正面',
    neutral: '中性',
    negative: '負面',
  }
  return labels[sentiment] || '未知'
}

export { router }
