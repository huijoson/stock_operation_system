import prisma from '../lib/prisma'
import { Decimal } from 'decimal.js'
import { RealizedPL, HoldingPeriod, RealizedPLSummary } from '../types/insights'
import { taxLotService, TaxLotService } from './tax-lot.service'
import { Transaction } from '../lib/prisma-client'

export class RealizedPLService {
  private taxLotService: TaxLotService
  private prisma: typeof prisma

  constructor(
    prismaClient: typeof prisma = prisma,
    taxLotSvc: TaxLotService = taxLotService
  ) {
    this.prisma = prismaClient
    this.taxLotService = taxLotSvc
  }

  /**
   * Calculate realized P&L for a SELL transaction using FIFO (supports testing)
   */
  async calculateRealizedPL(sellTransaction: Transaction): Promise<RealizedPL[]> {
    if (sellTransaction.type !== 'SELL') {
      throw new Error('Transaction must be of type SELL')
    }

    const sharesSold = new Decimal(sellTransaction.quantity.toString())
    const salePrice = new Decimal(sellTransaction.price.toString())

    return this.processSellTransaction(
      sellTransaction.portfolioId,
      sellTransaction.id,
      sellTransaction.symbol,
      sharesSold,
      salePrice,
      sellTransaction.date
    )
  }

  /**
   * Calculate and create RealizedPL records for a SELL transaction using FIFO
   */
  async processSellTransaction(
    portfolioId: string,
    transactionId: string,
    symbol: string,
    sharesSold: Decimal,
    salePrice: Decimal,
    saleDate: Date
  ): Promise<RealizedPL[]> {
    const results: RealizedPL[] = []

    // Get available TaxLots (FIFO order)
    const availableLots = await this.taxLotService.getAvailableLots(
      portfolioId,
      symbol,
      saleDate
    )
    
    if (availableLots.length === 0) {
      throw new Error(
        `無法賣出 ${symbol}：投資組合中沒有該股票的買入記錄。請先買入股票後再進行賣出操作。`
      )
    }
    
    // Calculate total available shares
    const totalAvailable = availableLots.reduce(
      (sum, lot) => sum.plus(lot.remainingShares),
      new Decimal(0)
    )

    if (sharesSold.gt(totalAvailable)) {
      throw new Error(
        `無法賣出 ${sharesSold.toString()} 股 ${symbol}：目前可賣出數量僅有 ${totalAvailable.toString()} 股`
      )
    }
    
    let remainingToSell = sharesSold
    
    for (const lot of availableLots) {
      if (remainingToSell.lte(0)) break
      
      const sharesFromThisLot = Decimal.min(lot.remainingShares, remainingToSell)
      const costBasis = sharesFromThisLot.mul(lot.costBasisPerShare)
      const saleProceeds = sharesFromThisLot.mul(salePrice)
      const realizedPL = saleProceeds.minus(costBasis)
      
      // Calculate holding period
      const holdingDays = Math.floor(
        (saleDate.getTime() - lot.acquisitionDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const holdingPeriod: HoldingPeriod = holdingDays > 365 ? 'LONG' : 'SHORT'
      
      // Create RealizedPL record
      const plRecord = await this.prisma.realizedPL.create({
        data: {
          portfolioId,
          transactionId,
          symbol,
          taxLotId: lot.id,
          sharesSold: sharesFromThisLot,
          costBasis,
          saleProceeds,
          realizedPL,
          saleDate,
          holdingPeriod
        }
      })
      
      // Reduce shares from TaxLot
      await this.taxLotService.reduceShares(lot.id, sharesFromThisLot)
      
      results.push({
        id: plRecord.id,
        portfolioId: plRecord.portfolioId,
        transactionId: plRecord.transactionId,
        symbol: plRecord.symbol,
        taxLotId: plRecord.taxLotId,
        sharesSold: new Decimal(plRecord.sharesSold.toString()),
        costBasis: new Decimal(plRecord.costBasis.toString()),
        saleProceeds: new Decimal(plRecord.saleProceeds.toString()),
        realizedPL: new Decimal(plRecord.realizedPL.toString()),
        saleDate: plRecord.saleDate,
        holdingPeriod: plRecord.holdingPeriod as HoldingPeriod,
        createdAt: plRecord.createdAt
      })
      
      remainingToSell = remainingToSell.minus(sharesFromThisLot)
    }
    
    if (remainingToSell.gt(0)) {
      throw new Error(
        `Insufficient shares to sell: tried to sell ${sharesSold.toString()}, ` +
        `but only ${sharesSold.minus(remainingToSell).toString()} available`
      )
    }
    
    return results
  }

  /**
   * Get realized P&L summary for a user (all portfolios)
   */
  async getSummary(
    userId: string,
    period: 'month' | 'quarter' | 'year' | 'all' = 'all'
  ): Promise<{
    totalRealizedPL: Decimal
    shortTermPL: Decimal
    longTermPL: Decimal
    portfolioBreakdown: Array<{ portfolioId: string; portfolioName: string; realizedPL: Decimal }>
    periodStart: Date
    periodEnd: Date
  }> {
    // Get user's portfolios
    const portfolios = await this.prisma.portfolio.findMany({
      where: { userId }
    })

    const portfolioIds = portfolios.map(p => p.id)

    // Calculate date range
    const { startDate, endDate } = this.getDateRange(period)

    // Get realized P&L records
    const records = await this.prisma.realizedPL.findMany({
      where: {
        portfolioId: { in: portfolioIds },
        saleDate: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Calculate totals
    let totalRealizedPL = new Decimal(0)
    let shortTermPL = new Decimal(0)
    let longTermPL = new Decimal(0)

    const portfolioTotals: Record<string, Decimal> = {}

    for (const record of records) {
      const pl = new Decimal(record.realizedPL.toString())
      totalRealizedPL = totalRealizedPL.plus(pl)

      if (record.holdingPeriod === 'SHORT') {
        shortTermPL = shortTermPL.plus(pl)
      } else {
        longTermPL = longTermPL.plus(pl)
      }

      if (!portfolioTotals[record.portfolioId]) {
        portfolioTotals[record.portfolioId] = new Decimal(0)
      }
      portfolioTotals[record.portfolioId] = portfolioTotals[record.portfolioId].plus(pl)
    }

    // Build portfolio breakdown
    const portfolioBreakdown = portfolios.map(portfolio => ({
      portfolioId: portfolio.id,
      portfolioName: portfolio.name,
      realizedPL: portfolioTotals[portfolio.id] || new Decimal(0)
    }))

    return {
      totalRealizedPL,
      shortTermPL,
      longTermPL,
      portfolioBreakdown,
      periodStart: startDate,
      periodEnd: endDate
    }
  }

  /**
   * Get realized P&L for a specific portfolio
   */
  async getByPortfolio(
    portfolioId: string,
    userId: string,
    period: 'month' | 'quarter' | 'year' | 'all' = 'all',
    symbol?: string
  ): Promise<{
    portfolioId: string
    portfolioName: string
    totalRealizedPL: Decimal
    shortTermPL: Decimal
    longTermPL: Decimal
    periodStart: Date
    periodEnd: Date
    records: RealizedPL[]
    symbolBreakdown: Array<{ symbol: string; totalPL: Decimal; tradeCount: number }>
  }> {
    // Verify portfolio ownership
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId }
    })

    if (!portfolio) {
      throw new Error('Portfolio not found')
    }

    if (portfolio.userId !== userId) {
      throw new Error('Unauthorized')
    }

    // Calculate date range
    const { startDate, endDate } = this.getDateRange(period)

    // Build where clause
    const where: any = {
      portfolioId,
      saleDate: {
        gte: startDate,
        lte: endDate
      }
    }

    if (symbol) {
      where.symbol = symbol
    }

    // Get realized P&L records
    const records = await this.prisma.realizedPL.findMany({
      where,
      orderBy: { saleDate: 'desc' }
    })

    // Calculate totals
    let totalRealizedPL = new Decimal(0)
    let shortTermPL = new Decimal(0)
    let longTermPL = new Decimal(0)
    const symbolTotals: Record<string, { pl: Decimal; count: number }> = {}

    const realizedPLRecords: RealizedPL[] = records.map(record => {
      const pl = new Decimal(record.realizedPL.toString())
      totalRealizedPL = totalRealizedPL.plus(pl)

      if (record.holdingPeriod === 'SHORT') {
        shortTermPL = shortTermPL.plus(pl)
      } else {
        longTermPL = longTermPL.plus(pl)
      }

      if (!symbolTotals[record.symbol]) {
        symbolTotals[record.symbol] = { pl: new Decimal(0), count: 0 }
      }
      symbolTotals[record.symbol].pl = symbolTotals[record.symbol].pl.plus(pl)
      symbolTotals[record.symbol].count++

      return {
        id: record.id,
        portfolioId: record.portfolioId,
        transactionId: record.transactionId,
        symbol: record.symbol,
        taxLotId: record.taxLotId,
        sharesSold: new Decimal(record.sharesSold.toString()),
        costBasis: new Decimal(record.costBasis.toString()),
        saleProceeds: new Decimal(record.saleProceeds.toString()),
        realizedPL: new Decimal(record.realizedPL.toString()),
        saleDate: record.saleDate,
        holdingPeriod: record.holdingPeriod as HoldingPeriod,
        createdAt: record.createdAt
      }
    })

    // Build symbol breakdown
    const symbolBreakdown = Object.entries(symbolTotals).map(([symbol, data]) => ({
      symbol,
      totalPL: data.pl,
      tradeCount: data.count
    }))

    return {
      portfolioId,
      portfolioName: portfolio.name,
      totalRealizedPL,
      shortTermPL,
      longTermPL,
      periodStart: startDate,
      periodEnd: endDate,
      records: realizedPLRecords,
      symbolBreakdown
    }
  }

  /**
   * Calculate date range based on period
   * Uses UTC dates to avoid timezone issues
   */
  private getDateRange(period: 'month' | 'quarter' | 'year' | 'all'): { startDate: Date; endDate: Date } {
    const now = new Date()
    const endDate = now

    let startDate: Date

    switch (period) {
      case 'month':
        // Start of current month in UTC
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
        break
      case 'quarter':
        // Start of current quarter in UTC
        {
          const currentQuarter = Math.floor(now.getUTCMonth() / 3)
          startDate = new Date(Date.UTC(now.getUTCFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0))
        }
        break
      case 'year':
        // Start of current year in UTC
        startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0))
        break
      case 'all':
      default:
        // A date far in the past
        startDate = new Date(Date.UTC(2000, 0, 1, 0, 0, 0, 0))
        break
    }

    return { startDate, endDate }
  }
  
  /**
   * Get realized P&L summary for a portfolio (legacy method)
   */
  async getPortfolioSummary(
    portfolioId: string,
    period: 'month' | 'quarter' | 'year' | 'all',
    symbol?: string
  ): Promise<RealizedPLSummary> {
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case 'month':
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
        break
      case 'quarter':
        {
          const currentQuarter = Math.floor(now.getUTCMonth() / 3)
          startDate = new Date(Date.UTC(now.getUTCFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0))
        }
        break
      case 'year':
        startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0))
        break
      case 'all':
        startDate = new Date(Date.UTC(2000, 0, 1, 0, 0, 0, 0))
        break
    }
    
    const where: any = {
      portfolioId,
      saleDate: { gte: startDate }
    }
    
    if (symbol) {
      where.symbol = symbol
    }
    
    const records = await this.prisma.realizedPL.findMany({
      where,
      orderBy: { saleDate: 'desc' }
    })
    
    let totalPL = new Decimal(0)
    let shortTermPL = new Decimal(0)
    let longTermPL = new Decimal(0)
    
    const mappedRecords = records.map(record => {
      const pl = new Decimal(record.realizedPL.toString())
      totalPL = totalPL.plus(pl)
      
      if (record.holdingPeriod === 'SHORT') {
        shortTermPL = shortTermPL.plus(pl)
      } else {
        longTermPL = longTermPL.plus(pl)
      }
      
      return {
        id: record.id,
        portfolioId: record.portfolioId,
        transactionId: record.transactionId,
        symbol: record.symbol,
        taxLotId: record.taxLotId,
        sharesSold: new Decimal(record.sharesSold.toString()),
        costBasis: new Decimal(record.costBasis.toString()),
        saleProceeds: new Decimal(record.saleProceeds.toString()),
        realizedPL: new Decimal(record.realizedPL.toString()),
        saleDate: record.saleDate,
        holdingPeriod: record.holdingPeriod as HoldingPeriod,
        createdAt: record.createdAt
      }
    })
    
    return {
      totalPL,
      shortTermPL,
      longTermPL,
      records: mappedRecords,
      period
    }
  }
  
  /**
   * Get realized P&L breakdown by symbol
   */
  async getBreakdownBySymbol(
    portfolioId: string,
    period: 'month' | 'quarter' | 'year' | 'all'
  ): Promise<Map<string, RealizedPLSummary>> {
    const summary = await this.getPortfolioSummary(portfolioId, period)
    const breakdown = new Map<string, RealizedPLSummary>()
    
    // Group by symbol
    const symbolGroups = new Map<string, RealizedPL[]>()
    for (const record of summary.records) {
      if (!symbolGroups.has(record.symbol)) {
        symbolGroups.set(record.symbol, [])
      }
      symbolGroups.get(record.symbol)!.push(record)
    }
    
    // Calculate summary for each symbol
    for (const [symbol, records] of symbolGroups) {
      let totalPL = new Decimal(0)
      let shortTermPL = new Decimal(0)
      let longTermPL = new Decimal(0)
      
      for (const record of records) {
        totalPL = totalPL.plus(record.realizedPL)
        if (record.holdingPeriod === 'SHORT') {
          shortTermPL = shortTermPL.plus(record.realizedPL)
        } else {
          longTermPL = longTermPL.plus(record.realizedPL)
        }
      }
      
      breakdown.set(symbol, {
        totalPL,
        shortTermPL,
        longTermPL,
        records,
        period
      })
    }
    
    return breakdown
  }
}

export const realizedPLService = new RealizedPLService()

