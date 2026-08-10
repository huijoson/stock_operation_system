import 'dotenv/config'
import { createPrismaClient } from '../backend/src/lib/prisma-factory'
import { Decimal } from 'decimal.js'

const prisma = createPrismaClient()

async function validateInsights() {
  console.log('開始驗證資料完整性...\n')
  
  let errors = 0
  const warnings = 0
  
  // 1. Validate all BUY transactions have TaxLots
  console.log('1. 檢查 BUY 交易的 TaxLot...')
  const buyTransactions = await prisma.transaction.findMany({
    where: { type: 'BUY' },
    include: { taxLot: true }
  })
  
  const buyWithoutTaxLot = buyTransactions.filter(tx => !tx.taxLot)
  if (buyWithoutTaxLot.length > 0) {
    console.error(`   ✗ 錯誤：${buyWithoutTaxLot.length} 筆 BUY 交易沒有對應的 TaxLot`)
    errors++
  } else {
    console.log(`   ✓ 通過：所有 ${buyTransactions.length} 筆 BUY 交易都有 TaxLot`)
  }
  
  // 2. Validate all SELL transactions have RealizedPL
  console.log('\n2. 檢查 SELL 交易的 RealizedPL...')
  const sellTransactions = await prisma.transaction.findMany({
    where: { type: 'SELL' },
    include: { realizedPLs: true }
  })
  
  const sellWithoutPL = sellTransactions.filter(tx => tx.realizedPLs.length === 0)
  if (sellWithoutPL.length > 0) {
    console.error(`   ✗ 錯誤：${sellWithoutPL.length} 筆 SELL 交易沒有對應的 RealizedPL`)
    errors++
  } else {
    console.log(`   ✓ 通過：所有 ${sellTransactions.length} 筆 SELL 交易都有 RealizedPL`)
  }
  
  // 3. Validate TaxLot remainingShares
  console.log('\n3. 檢查 TaxLot 的 remainingShares...')
  const taxLots = await prisma.taxLot.findMany()
  
  const invalidTaxLots = taxLots.filter(lot => {
    const remaining = new Decimal(lot.remainingShares.toString())
    const original = new Decimal(lot.originalShares.toString())
    return remaining.lt(0) || remaining.gt(original)
  })
  
  if (invalidTaxLots.length > 0) {
    console.error(`   ✗ 錯誤：${invalidTaxLots.length} 筆 TaxLot 的 remainingShares 不合理`)
    errors++
  } else {
    console.log(`   ✓ 通過：所有 ${taxLots.length} 筆 TaxLot 的 remainingShares 都正確`)
  }
  
  // 4. Check for TaxLots with zero remaining shares
  const zeroSharesLots = taxLots.filter(lot => 
    new Decimal(lot.remainingShares.toString()).eq(0)
  )
  console.log(`   ℹ 資訊：${zeroSharesLots.length} 筆 TaxLot 已完全消耗（remainingShares = 0）`)
  
  // 5. Validate RealizedPL calculations
  console.log('\n4. 檢查 RealizedPL 計算...')
  const realizedPLs = await prisma.realizedPL.findMany()
  
  const invalidPLs = realizedPLs.filter(pl => {
    const proceeds = new Decimal(pl.saleProceeds.toString())
    const costBasis = new Decimal(pl.costBasis.toString())
    const realizedPL = new Decimal(pl.realizedPL.toString())
    const expected = proceeds.minus(costBasis)
    
    return !realizedPL.eq(expected)
  })
  
  if (invalidPLs.length > 0) {
    console.error(`   ✗ 錯誤：${invalidPLs.length} 筆 RealizedPL 的計算不正確`)
    errors++
  } else {
    console.log(`   ✓ 通過：所有 ${realizedPLs.length} 筆 RealizedPL 的計算都正確`)
  }
  
  // 6. Check holding period logic
  console.log('\n5. 檢查 holdingPeriod 邏輯...')
  const plWithTaxLots = await prisma.realizedPL.findMany({
    include: { taxLot: true }
  })
  
  const invalidHoldingPeriods = plWithTaxLots.filter(pl => {
    const holdingDays = Math.floor(
      (pl.saleDate.getTime() - pl.taxLot.acquisitionDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const expectedPeriod = holdingDays > 365 ? 'LONG' : 'SHORT'
    return pl.holdingPeriod !== expectedPeriod
  })
  
  if (invalidHoldingPeriods.length > 0) {
    console.error(`   ✗ 錯誤：${invalidHoldingPeriods.length} 筆 RealizedPL 的 holdingPeriod 不正確`)
    errors++
  } else {
    console.log(`   ✓ 通過：所有 ${realizedPLs.length} 筆 RealizedPL 的 holdingPeriod 都正確`)
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('驗證摘要:')
  console.log(`   錯誤: ${errors}`)
  console.log(`   警告: ${warnings}`)
  
  if (errors === 0 && warnings === 0) {
    console.log('\n✓ 所有驗證通過！資料完整性良好。')
    return 0
  } else if (errors === 0) {
    console.log('\n⚠ 有警告但無錯誤，資料基本正確。')
    return 0
  } else {
    console.log('\n✗ 驗證失敗！請修正錯誤。')
    return 1
  }
}

async function main() {
  try {
    const exitCode = await validateInsights()
    process.exit(exitCode)
  } catch (error) {
    console.error('驗證過程發生錯誤:', error)
    process.exit(1)
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
