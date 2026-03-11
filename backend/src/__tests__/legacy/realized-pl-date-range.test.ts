import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { realizedPLService } from '@/services/realized-pl.service'
import { PrismaClient } from '../../lib/prisma-client'
import Decimal from 'decimal.js'

const prisma = new PrismaClient()

// Test data setup
async function setupTestData() {
  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'test-date-range@example.com',
      name: 'Test User'
    }
  })

  // Create portfolio
  const portfolio = await prisma.portfolio.create({
    data: {
      name: '測試投資組合',
      userId: user.id
    }
  })

  // Create BUY transaction and tax lot
  const buyDate = new Date('2024-01-15')
  const buyTx = await prisma.transaction.create({
    data: {
      portfolioId: portfolio.id,
      symbol: 'AAPL',
      type: 'BUY',
      quantity: new Decimal(10),
      price: new Decimal(100),
      date: buyDate
    }
  })

  const taxLot = await prisma.taxLot.create({
    data: {
      portfolioId: portfolio.id,
      symbol: 'AAPL',
      acquisitionDate: buyDate,
      originalShares: new Decimal(10),
      remainingShares: new Decimal(10),
      costBasisPerShare: new Decimal(100),
      totalCostBasis: new Decimal(1000),
      transactionId: buyTx.id
    }
  })

  // Create SELL transaction (short-term holding)
  const sellDate1 = new Date('2024-06-15')
  const sellTx1 = await prisma.transaction.create({
    data: {
      portfolioId: portfolio.id,
      symbol: 'AAPL',
      type: 'SELL',
      quantity: new Decimal(5),
      price: new Decimal(150),
      date: sellDate1
    }
  })

  await prisma.realizedPL.create({
    data: {
      portfolioId: portfolio.id,
      transactionId: sellTx1.id,
      symbol: 'AAPL',
      taxLotId: taxLot.id,
      sharesSold: new Decimal(5),
      costBasis: new Decimal(500),
      saleProceeds: new Decimal(750),
      realizedPL: new Decimal(250),
      saleDate: sellDate1,
      holdingPeriod: 'SHORT'
    }
  })

  // Create another SELL transaction (long-term holding)
  const buyDate2 = new Date('2022-01-15')
  const buyTx2 = await prisma.transaction.create({
    data: {
      portfolioId: portfolio.id,
      symbol: 'GOOGL',
      type: 'BUY',
      quantity: new Decimal(5),
      price: new Decimal(200),
      date: buyDate2
    }
  })

  const taxLot2 = await prisma.taxLot.create({
    data: {
      portfolioId: portfolio.id,
      symbol: 'GOOGL',
      acquisitionDate: buyDate2,
      originalShares: new Decimal(5),
      remainingShares: new Decimal(5),
      costBasisPerShare: new Decimal(200),
      totalCostBasis: new Decimal(1000),
      transactionId: buyTx2.id
    }
  })

  const sellDate2 = new Date('2024-07-20')
  const sellTx2 = await prisma.transaction.create({
    data: {
      portfolioId: portfolio.id,
      symbol: 'GOOGL',
      type: 'SELL',
      quantity: new Decimal(5),
      price: new Decimal(250),
      date: sellDate2
    }
  })

  await prisma.realizedPL.create({
    data: {
      portfolioId: portfolio.id,
      transactionId: sellTx2.id,
      symbol: 'GOOGL',
      taxLotId: taxLot2.id,
      sharesSold: new Decimal(5),
      costBasis: new Decimal(1000),
      saleProceeds: new Decimal(1250),
      realizedPL: new Decimal(250),
      saleDate: sellDate2,
      holdingPeriod: 'LONG'
    }
  })

  return { user, portfolio }
}

async function cleanupTestData() {
  await prisma.realizedPL.deleteMany({
    where: {
      portfolio: {
        user: {
          email: 'test-date-range@example.com'
        }
      }
    }
  })

  await prisma.taxLot.deleteMany({
    where: {
      portfolio: {
        user: {
          email: 'test-date-range@example.com'
        }
      }
    }
  })

  await prisma.transaction.deleteMany({
    where: {
      portfolio: {
        user: {
          email: 'test-date-range@example.com'
        }
      }
    }
  })

  await prisma.portfolio.deleteMany({
    where: {
      user: {
        email: 'test-date-range@example.com'
      }
    }
  })

  await prisma.user.deleteMany({
    where: {
      email: 'test-date-range@example.com'
    }
  })
}

describe('Realized P/L Service - Date Range and Short/Long Term', () => {
  let testUser: any
  let testPortfolio: any

  beforeAll(async () => {
    await cleanupTestData()
    const data = await setupTestData()
    testUser = data.user
    testPortfolio = data.portfolio
  })

  afterAll(async () => {
    await cleanupTestData()
    await prisma.$disconnect()
  })

  describe('getByPortfolio', () => {
    it('should return periodStart and periodEnd fields', async () => {
      const result = await realizedPLService.getByPortfolio(
        testPortfolio.id,
        testUser.id,
        'all'
      )

      expect(result.periodStart).toBeDefined()
      expect(result.periodEnd).toBeDefined()
      expect(result.periodStart).toBeInstanceOf(Date)
      expect(result.periodEnd).toBeInstanceOf(Date)
    })

    it('should return shortTermPL and longTermPL fields', async () => {
      const result = await realizedPLService.getByPortfolio(
        testPortfolio.id,
        testUser.id,
        'all'
      )

      expect(result.shortTermPL).toBeDefined()
      expect(result.longTermPL).toBeDefined()
      expect(result.shortTermPL).toBeInstanceOf(Decimal)
      expect(result.longTermPL).toBeInstanceOf(Decimal)
    })

    it('should calculate shortTermPL and longTermPL correctly', async () => {
      const result = await realizedPLService.getByPortfolio(
        testPortfolio.id,
        testUser.id,
        'all'
      )

      // We have one short-term trade with P&L of 250
      expect(result.shortTermPL.toString()).toBe('250')
      // We have one long-term trade with P&L of 250
      expect(result.longTermPL.toString()).toBe('250')
      // Total should be 500
      expect(result.totalRealizedPL.toString()).toBe('500')
    })

    it('should return correct date range for "month" period', async () => {
      const result = await realizedPLService.getByPortfolio(
        testPortfolio.id,
        testUser.id,
        'month'
      )

      const now = new Date()
      const expectedStart = new Date(now.getFullYear(), now.getMonth(), 1)

      expect(result.periodStart.getFullYear()).toBe(expectedStart.getFullYear())
      expect(result.periodStart.getMonth()).toBe(expectedStart.getMonth())
      expect(result.periodStart.getDate()).toBe(1)
    })

    it('should return correct date range for "quarter" period', async () => {
      const result = await realizedPLService.getByPortfolio(
        testPortfolio.id,
        testUser.id,
        'quarter'
      )

      const now = new Date()
      const currentQuarter = Math.floor(now.getMonth() / 3)
      const expectedStart = new Date(now.getFullYear(), currentQuarter * 3, 1)

      expect(result.periodStart.getFullYear()).toBe(expectedStart.getFullYear())
      expect(result.periodStart.getMonth()).toBe(expectedStart.getMonth())
      expect(result.periodStart.getDate()).toBe(1)
    })

    it('should return correct date range for "year" period', async () => {
      const result = await realizedPLService.getByPortfolio(
        testPortfolio.id,
        testUser.id,
        'year'
      )

      const now = new Date()
      const expectedStart = new Date(now.getFullYear(), 0, 1)

      expect(result.periodStart.getFullYear()).toBe(expectedStart.getFullYear())
      expect(result.periodStart.getMonth()).toBe(0)
      expect(result.periodStart.getDate()).toBe(1)
    })

    it('should return correct date range for "all" period', async () => {
      const result = await realizedPLService.getByPortfolio(
        testPortfolio.id,
        testUser.id,
        'all'
      )

      // For "all", the start date should be 2000-01-01
      expect(result.periodStart.getFullYear()).toBe(2000)
      expect(result.periodStart.getMonth()).toBe(0)
      expect(result.periodStart.getDate()).toBe(1)
    })
  })
})
