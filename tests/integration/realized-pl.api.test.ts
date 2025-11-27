import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import Decimal from 'decimal.js'

const prisma = new PrismaClient()

// Test data setup
async function setupTestData() {
  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'test-realized-pl@example.com',
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

  // Create BUY transactions and tax lots
  const buyDate1 = new Date('2024-01-15')
  const buyTx1 = await prisma.transaction.create({
    data: {
      portfolioId: portfolio.id,
      symbol: 'AAPL',
      type: 'BUY',
      quantity: new Decimal(10),
      price: new Decimal(100),
      date: buyDate1
    }
  })

  await prisma.taxLot.create({
    data: {
      portfolioId: portfolio.id,
      symbol: 'AAPL',
      acquisitionDate: buyDate1,
      originalShares: new Decimal(10),
      remainingShares: new Decimal(10),
      costBasisPerShare: new Decimal(100),
      totalCostBasis: new Decimal(1000),
      transactionId: buyTx1.id
    }
  })

  const buyDate2 = new Date('2024-02-20')
  const buyTx2 = await prisma.transaction.create({
    data: {
      portfolioId: portfolio.id,
      symbol: 'AAPL',
      type: 'BUY',
      quantity: new Decimal(5),
      price: new Decimal(110),
      date: buyDate2
    }
  })

  const taxLot2 = await prisma.taxLot.create({
    data: {
      portfolioId: portfolio.id,
      symbol: 'AAPL',
      acquisitionDate: buyDate2,
      originalShares: new Decimal(5),
      remainingShares: new Decimal(5),
      costBasisPerShare: new Decimal(110),
      totalCostBasis: new Decimal(550),
      transactionId: buyTx2.id
    }
  })

  // Create SELL transaction and realized P/L
  const sellDate = new Date('2024-06-15')
  const sellTx = await prisma.transaction.create({
    data: {
      portfolioId: portfolio.id,
      symbol: 'AAPL',
      type: 'SELL',
      quantity: new Decimal(8),
      price: new Decimal(150),
      date: sellDate
    }
  })

  // Update tax lot 1 (consumed 8 shares)
  await prisma.taxLot.update({
    where: { id: buyTx1.id },
    data: { remainingShares: new Decimal(2) }
  })

  // Create realized P/L record
  await prisma.realizedPL.create({
    data: {
      portfolioId: portfolio.id,
      transactionId: sellTx.id,
      symbol: 'AAPL',
      taxLotId: buyTx1.id,
      sharesSold: new Decimal(8),
      costBasis: new Decimal(800),
      saleProceeds: new Decimal(1200),
      realizedPL: new Decimal(400),
      saleDate: sellDate,
      holdingPeriod: 'SHORT'
    }
  })

  return { user, portfolio }
}

async function cleanupTestData() {
  await prisma.realizedPL.deleteMany({
    where: {
      portfolio: {
        user: {
          email: 'test-realized-pl@example.com'
        }
      }
    }
  })

  await prisma.taxLot.deleteMany({
    where: {
      portfolio: {
        user: {
          email: 'test-realized-pl@example.com'
        }
      }
    }
  })

  await prisma.transaction.deleteMany({
    where: {
      portfolio: {
        user: {
          email: 'test-realized-pl@example.com'
        }
      }
    }
  })

  await prisma.portfolio.deleteMany({
    where: {
      user: {
        email: 'test-realized-pl@example.com'
      }
    }
  })

  await prisma.user.deleteMany({
    where: {
      email: 'test-realized-pl@example.com'
    }
  })
}

describe('Realized P/L API Integration Tests', () => {
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

  describe('GET /api/realized-pl', () => {
    it('應回傳使用者所有投資組合的已實現損益總覽', async () => {
      const response = await fetch(`http://localhost:3000/api/realized-pl`, {
        headers: {
          'X-User-Id': testUser.id // Mock authentication
        }
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toMatchObject({
        totalRealizedPL: expect.any(String),
        shortTermPL: expect.any(String),
        longTermPL: expect.any(String),
        periodStart: expect.any(String),
        periodEnd: expect.any(String),
        portfolioBreakdown: expect.any(Array)
      })

      expect(new Decimal(data.totalRealizedPL).toString()).toBe('400')
      expect(new Decimal(data.shortTermPL).toString()).toBe('400')
      expect(data.portfolioBreakdown).toHaveLength(1)
      expect(data.portfolioBreakdown[0].portfolioId).toBe(testPortfolio.id)
    })

    it('應支援時間篩選（本月）', async () => {
      const response = await fetch(
        `http://localhost:3000/api/realized-pl?period=month`,
        {
          headers: {
            'X-User-Id': testUser.id
          }
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      expect(new Date(data.periodStart).getTime()).toBeGreaterThanOrEqual(
        monthStart.getTime()
      )
    })

    it('應支援時間篩選（本季）', async () => {
      const response = await fetch(
        `http://localhost:3000/api/realized-pl?period=quarter`,
        {
          headers: {
            'X-User-Id': testUser.id
          }
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.periodStart).toBeDefined()
      expect(data.periodEnd).toBeDefined()
    })

    it('應支援時間篩選（本年）', async () => {
      const response = await fetch(
        `http://localhost:3000/api/realized-pl?period=year`,
        {
          headers: {
            'X-User-Id': testUser.id
          }
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      const now = new Date()
      const yearStart = new Date(now.getFullYear(), 0, 1)

      expect(new Date(data.periodStart).getTime()).toBeGreaterThanOrEqual(
        yearStart.getTime()
      )
    })

    it('應拒絕未授權請求', async () => {
      const response = await fetch(`http://localhost:3000/api/realized-pl`)

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })

  describe('GET /api/realized-pl/portfolio/{portfolioId}', () => {
    it('應回傳指定投資組合的已實現損益明細', async () => {
      const response = await fetch(
        `http://localhost:3000/api/realized-pl/portfolio/${testPortfolio.id}`,
        {
          headers: {
            'X-User-Id': testUser.id
          }
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toMatchObject({
        portfolioId: testPortfolio.id,
        portfolioName: expect.any(String),
        totalRealizedPL: expect.any(String),
        records: expect.any(Array),
        symbolBreakdown: expect.any(Array)
      })

      expect(new Decimal(data.totalRealizedPL).toString()).toBe('400')
      expect(data.records).toHaveLength(1)
      expect(data.records[0]).toMatchObject({
        id: expect.any(String),
        symbol: 'AAPL',
        sharesSold: '8',
        costBasis: '800',
        saleProceeds: '1200',
        realizedPL: '400',
        holdingPeriod: 'SHORT'
      })

      expect(data.symbolBreakdown).toHaveLength(1)
      expect(data.symbolBreakdown[0]).toMatchObject({
        symbol: 'AAPL',
        totalPL: '400',
        tradeCount: 1
      })
    })

    it('應支援按股票篩選', async () => {
      const response = await fetch(
        `http://localhost:3000/api/realized-pl/portfolio/${testPortfolio.id}?symbol=AAPL`,
        {
          headers: {
            'X-User-Id': testUser.id
          }
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.records.every((r: any) => r.symbol === 'AAPL')).toBe(true)
    })

    it('應支援時間篩選', async () => {
      const response = await fetch(
        `http://localhost:3000/api/realized-pl/portfolio/${testPortfolio.id}?period=year`,
        {
          headers: {
            'X-User-Id': testUser.id
          }
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.records).toHaveLength(1)
    })

    it('應回傳 404 當投資組合不存在', async () => {
      const response = await fetch(
        `http://localhost:3000/api/realized-pl/portfolio/non-existent-id`,
        {
          headers: {
            'X-User-Id': testUser.id
          }
        }
      )

      expect(response.status).toBe(404)
    })

    it('應拒絕未授權使用者存取其他人的投資組合', async () => {
      const response = await fetch(
        `http://localhost:3000/api/realized-pl/portfolio/${testPortfolio.id}`,
        {
          headers: {
            'X-User-Id': 'other-user-id'
          }
        }
      )

      expect(response.status).toBe(401)
    })
  })

  describe('資料完整性驗證', () => {
    it('已實現損益應等於賣出收入減去成本基礎', async () => {
      const response = await fetch(
        `http://localhost:3000/api/realized-pl/portfolio/${testPortfolio.id}`,
        {
          headers: {
            'X-User-Id': testUser.id
          }
        }
      )

      const data = await response.json()
      const record = data.records[0]

      const costBasis = new Decimal(record.costBasis)
      const saleProceeds = new Decimal(record.saleProceeds)
      const realizedPL = new Decimal(record.realizedPL)

      expect(realizedPL.equals(saleProceeds.minus(costBasis))).toBe(true)
    })

    it('總已實現損益應等於所有紀錄的總和', async () => {
      const response = await fetch(
        `http://localhost:3000/api/realized-pl/portfolio/${testPortfolio.id}`,
        {
          headers: {
            'X-User-Id': testUser.id
          }
        }
      )

      const data = await response.json()
      const sumOfRecords = data.records.reduce(
        (sum: Decimal, record: any) => sum.plus(new Decimal(record.realizedPL)),
        new Decimal(0)
      )

      expect(new Decimal(data.totalRealizedPL).equals(sumOfRecords)).toBe(true)
    })
  })

  describe('效能要求驗證', () => {
    it('API 回應時間應 < 200ms', async () => {
      const startTime = Date.now()

      const response = await fetch(
        `http://localhost:3000/api/realized-pl/portfolio/${testPortfolio.id}`,
        {
          headers: {
            'X-User-Id': testUser.id
          }
        }
      )

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(200)
    })
  })
})
