import { Router, Request, Response } from 'express'
import { realizedPLService } from '../services/realized-pl.service'

const router = Router()

function isValidTimePeriod(period: string): boolean {
  return ['month', 'quarter', 'year', 'all'].includes(period)
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const periodParam = (req.query.period as string) || 'all'

    if (!isValidTimePeriod(periodParam)) {
      return res
        .status(400)
        .json({ error: 'Invalid period parameter. Must be one of: month, quarter, year, all' })
    }

    const summary = await realizedPLService.getSummary(user.id, periodParam)

    return res.json({
      totalRealizedPL: summary.totalRealizedPL.toString(),
      periodStart: summary.periodStart.toISOString().split('T')[0],
      periodEnd: summary.periodEnd.toISOString().split('T')[0],
      shortTermPL: summary.shortTermPL.toString(),
      longTermPL: summary.longTermPL.toString(),
      portfolioBreakdown: summary.portfolioBreakdown.map((item) => ({
        portfolioId: item.portfolioId,
        portfolioName: item.portfolioName,
        realizedPL: item.realizedPL.toString(),
      })),
    })
  } catch (error: any) {
    console.error('Error fetching realized P&L summary:', error)

    if (error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/portfolio/:portfolioId', async (req: Request, res: Response) => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { portfolioId } = req.params
    const periodParam = (req.query.period as string) || 'all'
    const symbol = (req.query.symbol as string) || undefined

    if (!isValidTimePeriod(periodParam)) {
      return res
        .status(400)
        .json({ error: 'Invalid period parameter. Must be one of: month, quarter, year, all' })
    }

    const result = await realizedPLService.getByPortfolio(portfolioId, user.id, periodParam, symbol)

    return res.json({
      portfolioId: result.portfolioId,
      portfolioName: result.portfolioName,
      totalRealizedPL: result.totalRealizedPL.toString(),
      periodStart: result.periodStart.toISOString().split('T')[0],
      periodEnd: result.periodEnd.toISOString().split('T')[0],
      shortTermPL: result.shortTermPL.toString(),
      longTermPL: result.longTermPL.toString(),
      records: result.records.map((record) => ({
        id: record.id,
        symbol: record.symbol,
        saleDate: record.saleDate.toISOString(),
        sharesSold: record.sharesSold.toString(),
        costBasis: record.costBasis.toString(),
        saleProceeds: record.saleProceeds.toString(),
        realizedPL: record.realizedPL.toString(),
        holdingPeriod: record.holdingPeriod,
      })),
      symbolBreakdown: result.symbolBreakdown.map((item) => ({
        symbol: item.symbol,
        totalPL: item.totalPL.toString(),
        tradeCount: item.tradeCount,
      })),
    })
  } catch (error: any) {
    console.error('Error fetching portfolio realized P&L:', error)

    if (error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (error.message === 'Portfolio not found') {
      return res.status(404).json({ error: 'Portfolio not found' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

export { router }
