import prisma from '@/lib/db/prisma'
import { Decimal } from 'decimal.js'
import { RealizedPL, HoldingPeriod, RealizedPLSummary } from '@/types/insights'
import { taxLotService } from './tax-lot.service'

export class RealizedPLService {
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
    const availableLots = await taxLotService.getAvailableLots(
      portfolioId,
      symbol,
      saleDate
    )
    
    if (availableLots.length === 0) {
      throw new Error(`No available TaxLots for ${symbol} in portfolio ${portfolioId}`)
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
      const plRecord = await prisma.realizedPL.create({
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
      await taxLotService.reduceShares(lot.id, sharesFromThisLot)
      
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
   * Get realized P&L summary for a portfolio
   */
  async getSummary(
    portfolioId: string,
    period: 'month' | 'quarter' | 'year' | 'all',
    symbol?: string
  ): Promise<RealizedPLSummary> {
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'all':
        startDate = new Date(0) // Beginning of time
        break
    }
    
    const where: any = {
      portfolioId,
      saleDate: { gte: startDate }
    }
    
    if (symbol) {
      where.symbol = symbol
    }
    
    const records = await prisma.realizedPL.findMany({
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
    const summary = await this.getSummary(portfolioId, period)
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
