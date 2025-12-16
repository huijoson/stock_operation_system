import { PrismaClient } from '@prisma/client'
import { Decimal } from 'decimal.js'

const prisma = new PrismaClient()

async function backfillTaxLots(portfolioId?: string) {
  console.log('開始回填 TaxLot 資料...')
  
  const where = portfolioId ? { portfolioId, type: 'BUY' } : { type: 'BUY' }
  
  // Get all BUY transactions ordered by date
  const buyTransactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'asc' }
  })
  
  console.log(`找到 ${buyTransactions.length} 筆 BUY 交易`)
  
  let created = 0
  let skipped = 0
  
  for (const tx of buyTransactions) {
    // Check if TaxLot already exists for this transaction
    const existing = await prisma.taxLot.findFirst({
      where: { transactionId: tx.id }
    })
    
    if (existing) {
      skipped++
      continue
    }
    
    // Create TaxLot
    await prisma.taxLot.create({
      data: {
        portfolioId: tx.portfolioId,
        symbol: tx.symbol,
        acquisitionDate: tx.date,
        originalShares: tx.quantity,
        remainingShares: tx.quantity, // Initial value, will be reduced by SELL transactions
        costBasisPerShare: tx.price,
        totalCostBasis: new Decimal(tx.quantity.toString()).mul(new Decimal(tx.price.toString())),
        transactionId: tx.id
      }
    })
    created++
  }
  
  console.log(`回填完成：新增 ${created} 筆，跳過 ${skipped} 筆`)
}

async function main() {
  const portfolioId = process.argv[2]
  
  try {
    await backfillTaxLots(portfolioId)
    console.log('TaxLot 回填成功！')
  } catch (error) {
    console.error('回填失敗:', error)
    process.exit(1)
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
