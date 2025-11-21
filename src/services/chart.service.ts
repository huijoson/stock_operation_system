import Decimal from 'decimal.js'
import { PrismaClient } from '@prisma/client'

/**
 * Chart Data Service
 * 
 * Generates data for various chart visualizations
 */

export interface MarketValuePercentage {
  symbol: string
  percentage: number
  marketValue: number
}

export interface PerformanceTrendPoint {
  date: string
  value: number
}

export interface PLDistribution {
  symbol: string
  pl: number
}

export class ChartService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Calculate market value percentages for pie chart
   * 
   * Property 24: 市值佔比總和為 100%
   * For any portfolio's pie chart data, the sum of all holdings' market value
   * percentages should equal 100% (within 0.01% tolerance).
   */
  calculateMarketValuePercentages(
    holdings: Array<{ symbol: string; quantity: Decimal | string; currentPrice: Decimal | string }>
  ): MarketValuePercentage[] {
    // Calculate market value for each holding
    const holdingsWithMarketValue = holdings.map(h => {
      const quantity = new Decimal(h.quantity)
      const currentPrice = new Decimal(h.currentPrice)
      const marketValue = quantity.times(currentPrice)

      return {
        symbol: h.symbol,
        marketValue: marketValue.toNumber(),
      }
    })

    // Calculate total market value
    const totalMarketValue = holdingsWithMarketValue.reduce(
      (sum, h) => sum.plus(h.marketValue),
      new Decimal(0)
    )

    // Avoid division by zero
    if (totalMarketValue.isZero()) {
      return []
    }

    // Calculate percentages
    return holdingsWithMarketValue.map(h => ({
      symbol: h.symbol,
      percentage: new Decimal(h.marketValue)
        .dividedBy(totalMarketValue)
        .times(100)
        .toNumber(),
      marketValue: h.marketValue,
    }))
  }

  /**
   * Generate performance trend data for line chart
   * 
   * Property 25: 績效趨勢時間序列正確性
   * For any portfolio's performance trend data, the time series should be
   * sorted by date, and each time point's total market value should be
   * calculated correctly.
   */
  async generatePerformanceTrend(
    portfolioId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceTrendPoint[]> {
    // Get all transactions for the portfolio within date range
    const transactions = await this.prisma.transaction.findMany({
      where: {
        portfolioId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    if (transactions.length === 0) {
      return []
    }

    // Get unique dates
    const uniqueDates = Array.from(
      new Set(transactions.map((t) => t.date.toISOString().split('T')[0]))
    ).sort()

    // For each date, calculate the portfolio's total market value
    // This is a simplified version - in production, you'd need historical prices
    const trendData: PerformanceTrendPoint[] = []

    for (const dateStr of uniqueDates) {
      const date = new Date(dateStr as string)

      // Get all transactions up to this date
      const transactionsUpToDate = transactions.filter((t) => t.date <= date)

      // Calculate holdings at this date
      const holdingsMap = new Map<string, { quantity: Decimal; totalCost: Decimal }>()

      for (const tx of transactionsUpToDate) {
        const existing = holdingsMap.get(tx.symbol) || {
          quantity: new Decimal(0),
          totalCost: new Decimal(0),
        }

        if (tx.type === 'BUY') {
          const newQuantity = existing.quantity.plus(tx.quantity)
          const newTotalCost = existing.totalCost.plus(
            new Decimal(tx.quantity).times(tx.price)
          )
          holdingsMap.set(tx.symbol, {
            quantity: newQuantity,
            totalCost: newTotalCost,
          })
        } else if (tx.type === 'SELL') {
          const newQuantity = existing.quantity.minus(tx.quantity)
          const avgCost = existing.quantity.isZero()
            ? new Decimal(0)
            : existing.totalCost.dividedBy(existing.quantity)
          const newTotalCost = newQuantity.times(avgCost)
          holdingsMap.set(tx.symbol, {
            quantity: newQuantity,
            totalCost: newTotalCost,
          })
        }
      }

      // Calculate total market value (using cost as proxy for now)
      let totalValue = new Decimal(0)
      for (const holding of holdingsMap.values()) {
        if (holding.quantity.greaterThan(0)) {
          totalValue = totalValue.plus(holding.totalCost)
        }
      }

      trendData.push({
        date: dateStr as string,
        value: totalValue.toNumber(),
      })
    }

    return trendData
  }

  /**
   * Calculate P&L distribution for bar chart
   */
  calculatePLDistribution(
    holdings: Array<{
      symbol: string
      quantity: Decimal | string
      averageCost: Decimal | string
      currentPrice: Decimal | string
    }>
  ): PLDistribution[] {
    return holdings.map(h => {
      const quantity = new Decimal(h.quantity)
      const averageCost = new Decimal(h.averageCost)
      const currentPrice = new Decimal(h.currentPrice)

      // Unrealized P&L = (currentPrice - averageCost) * quantity
      const pl = currentPrice.minus(averageCost).times(quantity)

      return {
        symbol: h.symbol,
        pl: pl.toNumber(),
      }
    })
  }
}
