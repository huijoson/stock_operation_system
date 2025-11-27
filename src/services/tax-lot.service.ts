import prisma from '@/lib/db/prisma'
import { Decimal } from 'decimal.js'
import { TaxLot } from '@/types/insights'

export class TaxLotService {
  /**
   * Create a new TaxLot from a BUY transaction
   */
  async createFromTransaction(
    portfolioId: string,
    transactionId: string,
    symbol: string,
    quantity: Decimal,
    price: Decimal,
    date: Date
  ): Promise<TaxLot> {
    const totalCostBasis = quantity.mul(price)
    
    const taxLot = await prisma.taxLot.create({
      data: {
        portfolioId,
        symbol,
        acquisitionDate: date,
        originalShares: quantity,
        costBasisPerShare: price,
        totalCostBasis,
        remainingShares: quantity,
        transactionId
      }
    })
    
    return {
      id: taxLot.id,
      portfolioId: taxLot.portfolioId,
      symbol: taxLot.symbol,
      acquisitionDate: taxLot.acquisitionDate,
      originalShares: new Decimal(taxLot.originalShares.toString()),
      costBasisPerShare: new Decimal(taxLot.costBasisPerShare.toString()),
      totalCostBasis: new Decimal(taxLot.totalCostBasis.toString()),
      remainingShares: new Decimal(taxLot.remainingShares.toString()),
      transactionId: taxLot.transactionId,
      createdAt: taxLot.createdAt,
      updatedAt: taxLot.updatedAt
    }
  }
  
  /**
   * Get available TaxLots for FIFO calculation
   */
  async getAvailableLots(
    portfolioId: string,
    symbol: string,
    beforeDate?: Date
  ): Promise<TaxLot[]> {
    const where: any = {
      portfolioId,
      symbol,
      remainingShares: { gt: 0 }
    }
    
    if (beforeDate) {
      where.acquisitionDate = { lte: beforeDate }
    }
    
    const lots = await prisma.taxLot.findMany({
      where,
      orderBy: { acquisitionDate: 'asc' }
    })
    
    return lots.map(lot => ({
      id: lot.id,
      portfolioId: lot.portfolioId,
      symbol: lot.symbol,
      acquisitionDate: lot.acquisitionDate,
      originalShares: new Decimal(lot.originalShares.toString()),
      costBasisPerShare: new Decimal(lot.costBasisPerShare.toString()),
      totalCostBasis: new Decimal(lot.totalCostBasis.toString()),
      remainingShares: new Decimal(lot.remainingShares.toString()),
      transactionId: lot.transactionId,
      createdAt: lot.createdAt,
      updatedAt: lot.updatedAt
    }))
  }
  
  /**
   * Reduce shares from a TaxLot when selling
   */
  async reduceShares(lotId: string, sharesReduced: Decimal): Promise<void> {
    const lot = await prisma.taxLot.findUnique({
      where: { id: lotId }
    })
    
    if (!lot) {
      throw new Error(`TaxLot ${lotId} not found`)
    }
    
    const remainingShares = new Decimal(lot.remainingShares.toString())
    const newRemaining = remainingShares.minus(sharesReduced)
    
    if (newRemaining.lt(0)) {
      throw new Error(`Cannot reduce ${sharesReduced.toString()} shares from lot with ${remainingShares.toString()} remaining`)
    }
    
    await prisma.taxLot.update({
      where: { id: lotId },
      data: { remainingShares: newRemaining }
    })
  }
  
  /**
   * Get total cost basis for a portfolio's holdings
   */
  async getTotalCostBasis(portfolioId: string, symbol?: string): Promise<Decimal> {
    const where: any = {
      portfolioId,
      remainingShares: { gt: 0 }
    }
    
    if (symbol) {
      where.symbol = symbol
    }
    
    const lots = await prisma.taxLot.findMany({ where })
    
    return lots.reduce((total, lot) => {
      const remaining = new Decimal(lot.remainingShares.toString())
      const costBasis = new Decimal(lot.costBasisPerShare.toString())
      return total.plus(remaining.mul(costBasis))
    }, new Decimal(0))
  }
}

export const taxLotService = new TaxLotService()
