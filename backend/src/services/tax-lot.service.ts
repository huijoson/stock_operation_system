import defaultPrisma from '../lib/prisma'
import { Decimal } from 'decimal.js'
import { TaxLot } from '../types/insights'

interface TransactionInput {
  id: string
  portfolioId: string
  symbol: string
  quantity: string | number | Decimal | { toString(): string }
  price: string | number | Decimal | { toString(): string }
  date: Date
}

export class TaxLotService {
  private prisma: typeof defaultPrisma

  constructor(prismaClient: typeof defaultPrisma = defaultPrisma) {
    this.prisma = prismaClient
  }

  /**
   * Create a new TaxLot from a BUY transaction
   */
  async createFromTransaction(transaction: TransactionInput): Promise<TaxLot> {
    const quantity = new Decimal(transaction.quantity.toString())
    const price = new Decimal(transaction.price.toString())
    const totalCostBasis = quantity.mul(price)

    const taxLot = await this.prisma.taxLot.create({
      data: {
        portfolioId: transaction.portfolioId,
        symbol: transaction.symbol,
        acquisitionDate: transaction.date,
        originalShares: quantity,
        costBasisPerShare: price,
        totalCostBasis,
        remainingShares: quantity,
        transactionId: transaction.id
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
    
    const lots = await this.prisma.taxLot.findMany({
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
    const lot = await this.prisma.taxLot.findUnique({
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

    await this.prisma.taxLot.update({
      where: { id: lotId },
      data: { remainingShares: newRemaining }
    })
  }
  
  /**
   * Backfill TaxLots for BUY transactions that predate the TaxLot feature.
   * Only creates lots for the actual gap between Holdings quantity and existing TaxLot remaining shares.
   */
  async backfillForSymbol(portfolioId: string, symbol: string): Promise<void> {
    const existingLots = await this.prisma.taxLot.findMany({
      where: { portfolioId, symbol },
      select: { transactionId: true, remainingShares: true }
    })

    const existingTxIds = new Set(
      existingLots.map(l => l.transactionId).filter((id): id is string => id !== null)
    )
    const totalExistingRemaining = existingLots.reduce(
      (sum, l) => sum.plus(new Decimal(l.remainingShares.toString())),
      new Decimal(0)
    )

    const holding = await this.prisma.holding.findUnique({
      where: { portfolioId_symbol: { portfolioId, symbol } }
    })
    if (!holding) return

    const gap = new Decimal(holding.quantity.toString()).minus(totalExistingRemaining)
    if (gap.lte(0)) return

    const buyTxs = await this.prisma.transaction.findMany({
      where: { portfolioId, symbol, type: 'BUY' },
      orderBy: { date: 'asc' }
    })

    let remaining = gap
    for (const tx of buyTxs) {
      if (remaining.lte(0)) break
      if (existingTxIds.has(tx.id)) continue

      const buyQty = new Decimal(tx.quantity.toString())
      const price = new Decimal(tx.price.toString())
      const lotRemaining = Decimal.min(buyQty, remaining)

      await this.prisma.taxLot.create({
        data: {
          portfolioId,
          symbol,
          acquisitionDate: tx.date,
          originalShares: buyQty,
          costBasisPerShare: price,
          totalCostBasis: buyQty.mul(price),
          remainingShares: lotRemaining,
          transactionId: tx.id
        }
      })

      remaining = remaining.minus(lotRemaining)
    }
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
    
    const lots = await this.prisma.taxLot.findMany({ where })
    
    return lots.reduce((total, lot) => {
      const remaining = new Decimal(lot.remainingShares.toString())
      const costBasis = new Decimal(lot.costBasisPerShare.toString())
      return total.plus(remaining.mul(costBasis))
    }, new Decimal(0))
  }
}

export const taxLotService = new TaxLotService()

