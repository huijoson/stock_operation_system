import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { getPathParam } from './request-utils'
import { HoldingAdviceService } from '../services/holding-advice.service'

const router = Router()

router.get('/:symbol', async (req: Request, res: Response) => {
  try {
    const symbol = getPathParam(req, 'symbol')?.toUpperCase()

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: '股票代號為必填欄位',
      })
    }

    const service = new HoldingAdviceService(prisma)
    const advice = await service.generateAdvice(symbol)

    return res.json({
      success: true,
      data: advice,
    })
  } catch (error) {
    if (error instanceof Error && error.message === '風險評估不存在') {
      return res.status(404).json({
        success: false,
        error: '風險評估不存在，請先進行風險評估',
        code: 'RISK_ASSESSMENT_NOT_FOUND',
      })
    }

    console.error('取得持股建議失敗:', error)
    return res.status(500).json({
      success: false,
      error: '取得持股建議失敗',
    })
  }
})

router.get('/portfolio/:portfolioId', async (req: Request, res: Response) => {
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

    const symbols = portfolio.holdings.map((h) => h.symbol)

    const service = new HoldingAdviceService(prisma)
    const advices = await service.getAdviceForPortfolio(symbols)

    return res.json({
      success: true,
      data: {
        portfolioId,
        advices,
      },
    })
  } catch (error) {
    console.error('取得投資組合持股建議失敗:', error)
    return res.status(500).json({
      success: false,
      error: '取得投資組合持股建議失敗',
    })
  }
})

export { router }
