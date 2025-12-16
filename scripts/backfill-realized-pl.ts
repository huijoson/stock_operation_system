import { PrismaClient } from '@prisma/client'
import { Decimal } from 'decimal.js'

const prisma = new PrismaClient()

async function backfillRealizedPL(portfolioId?: string) {
  console.log('開始回填 RealizedPL 資料...')
  
  const where = portfolioId ? { portfolioId, type: 'SELL' } : { type: 'SELL' }
  
  // Get all SELL transactions ordered by date
  const sellTransactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'asc' }
  })
  
  console.log(`找到 ${sellTransactions.length} 筆 SELL 交易`)
  
  let created = 0
  let skipped = 0
  let errors = 0
  
  for (const tx of sellTransactions) {
    try {
      // Check if RealizedPL already exists for this transaction
      const existing = await prisma.realizedPL.findFirst({
        where: { transactionId: tx.id }
      })
      
      if (existing) {
        skipped++
        continue
      }
      
      // FIFO: Get earliest TaxLots with remaining shares
      const availableLots = await prisma.taxLot.findMany({
        where: {
          portfolioId: tx.portfolioId,
          symbol: tx.symbol,
          remainingShares: { gt: 0 },
          acquisitionDate: { lte: tx.date }
        },
        orderBy: { acquisitionDate: 'asc' }
      })
      
      if (availableLots.length === 0) {
        console.warn(`警告：交易 ${tx.id} 找不到可用的 TaxLot`)
        errors++
        continue
      }
      
      let remainingToSell = new Decimal(tx.quantity.toString())
      const salePrice = new Decimal(tx.price.toString())
      
      for (const lot of availableLots) {
        if (remainingToSell.lte(0)) break
        
        const lotRemaining = new Decimal(lot.remainingShares.toString())
        const sharesFromThisLot = Decimal.min(lotRemaining, remainingToSell)
        const costBasisPerShare = new Decimal(lot.costBasisPerShare.toString())
        const costBasis = sharesFromThisLot.mul(costBasisPerShare)
        const proceeds = sharesFromThisLot.mul(salePrice)
        const pl = proceeds.minus(costBasis)
        
        // Calculate holding period
        const holdingDays = Math.floor(
          (tx.date.getTime() - lot.acquisitionDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        const holdingPeriod = holdingDays > 365 ? 'LONG' : 'SHORT'
        
        // Create RealizedPL
        await prisma.realizedPL.create({
          data: {
            portfolioId: tx.portfolioId,
            transactionId: tx.id,
            symbol: tx.symbol,
            taxLotId: lot.id,
            sharesSold: sharesFromThisLot,
            costBasis,
            saleProceeds: proceeds,
            realizedPL: pl,
            saleDate: tx.date,
            holdingPeriod
          }
        })
        
        // Update TaxLot remaining shares
        await prisma.taxLot.update({
          where: { id: lot.id },
          data: { remainingShares: lotRemaining.minus(sharesFromThisLot) }
        })
        
        remainingToSell = remainingToSell.minus(sharesFromThisLot)
        created++
      }
      
      if (remainingToSell.gt(0)) {
        console.warn(`警告：交易 ${tx.id} 還有 ${remainingToSell.toString()} 股未處理`)
      }
      
    } catch (error) {
      console.error(`處理交易 ${tx.id} 時發生錯誤:`, error)
      errors++
    }
  }
  
  console.log(`回填完成：新增 ${created} 筆，跳過 ${skipped} 筆，錯誤 ${errors} 筆`)
}

async function main() {
  const portfolioId = process.argv[2]
  
  try {
    await backfillRealizedPL(portfolioId)
    console.log('RealizedPL 回填成功！')
  } catch (error) {
    console.error('回填失敗:', error)
    process.exit(1)
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
