import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import Decimal from 'decimal.js'
import { RealizedPLService } from '@/services/realized-pl.service'
import { TaxLotService } from '@/services/tax-lot.service'

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn()
}))

describe('RealizedPLService', () => {
  let service: RealizedPLService
  let mockPrisma: jest.Mocked<PrismaClient>
  let mockTaxLotService: jest.Mocked<TaxLotService>

  beforeEach(() => {
    mockPrisma = {
      realizedPL: {
        findMany: jest.fn(),
        create: jest.fn(),
        aggregate: jest.fn()
      },
      portfolio: {
        findUnique: jest.fn(),
        findMany: jest.fn()
      },
      transaction: {
        findUnique: jest.fn()
      }
    } as any

    mockTaxLotService = {
      getAvailableLots: jest.fn(),
      consumeLots: jest.fn(),
      createLotFromTransaction: jest.fn()
    } as any

    service = new RealizedPLService(mockPrisma, mockTaxLotService)
  })

  describe('calculateRealizedPL', () => {
    it('應使用 FIFO 方法計算已實現損益', async () => {
      const portfolioId = 'portfolio-1'
      const symbol = 'AAPL'
      const sellTransaction = {
        id: 'tx-sell-1',
        portfolioId,
        symbol,
        type: 'SELL',
        quantity: new Decimal(10),
        price: new Decimal(150),
        date: new Date('2024-06-15')
      }

      // Mock available tax lots (FIFO order)
      mockTaxLotService.getAvailableLots.mockResolvedValue([
        {
          id: 'lot-1',
          symbol,
          portfolioId,
          acquisitionDate: new Date('2024-01-15'),
          remainingShares: new Decimal(15),
          costBasisPerShare: new Decimal(100),
          originalShares: new Decimal(15),
          totalCostBasis: new Decimal(1500),
          transactionId: 'tx-buy-1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])

      mockTaxLotService.consumeLots.mockResolvedValue([
        {
          lotId: 'lot-1',
          sharesConsumed: new Decimal(10),
          costBasis: new Decimal(1000)
        }
      ])

      mockPrisma.realizedPL.create.mockResolvedValue({
        id: 'realized-1',
        portfolioId,
        transactionId: sellTransaction.id,
        symbol,
        taxLotId: 'lot-1',
        sharesSold: new Decimal(10),
        costBasis: new Decimal(1000),
        saleProceeds: new Decimal(1500),
        realizedPL: new Decimal(500),
        saleDate: sellTransaction.date,
        holdingPeriod: 'SHORT',
        createdAt: new Date()
      } as any)

      const result = await service.calculateRealizedPL(sellTransaction as any)

      expect(result).toHaveLength(1)
      expect(result[0].realizedPL.toString()).toBe('500')
      expect(result[0].holdingPeriod).toBe('SHORT')
      expect(mockTaxLotService.getAvailableLots).toHaveBeenCalledWith(portfolioId, symbol)
      expect(mockTaxLotService.consumeLots).toHaveBeenCalled()
    })

    it('應正確判斷持有期間（SHORT vs LONG）', async () => {
      const portfolioId = 'portfolio-1'
      const symbol = 'AAPL'
      const sellTransaction = {
        id: 'tx-sell-1',
        portfolioId,
        symbol,
        type: 'SELL',
        quantity: new Decimal(10),
        price: new Decimal(150),
        date: new Date('2025-01-20') // 超過 1 年
      }

      mockTaxLotService.getAvailableLots.mockResolvedValue([
        {
          id: 'lot-1',
          symbol,
          portfolioId,
          acquisitionDate: new Date('2024-01-15'), // 持有超過 1 年
          remainingShares: new Decimal(15),
          costBasisPerShare: new Decimal(100),
          originalShares: new Decimal(15),
          totalCostBasis: new Decimal(1500),
          transactionId: 'tx-buy-1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])

      mockTaxLotService.consumeLots.mockResolvedValue([
        {
          lotId: 'lot-1',
          sharesConsumed: new Decimal(10),
          costBasis: new Decimal(1000)
        }
      ])

      mockPrisma.realizedPL.create.mockResolvedValue({
        id: 'realized-1',
        portfolioId,
        transactionId: sellTransaction.id,
        symbol,
        taxLotId: 'lot-1',
        sharesSold: new Decimal(10),
        costBasis: new Decimal(1000),
        saleProceeds: new Decimal(1500),
        realizedPL: new Decimal(500),
        saleDate: sellTransaction.date,
        holdingPeriod: 'LONG',
        createdAt: new Date()
      } as any)

      const result = await service.calculateRealizedPL(sellTransaction as any)

      expect(result[0].holdingPeriod).toBe('LONG')
    })

    it('應處理多批次消耗的情況', async () => {
      const portfolioId = 'portfolio-1'
      const symbol = 'AAPL'
      const sellTransaction = {
        id: 'tx-sell-1',
        portfolioId,
        symbol,
        type: 'SELL',
        quantity: new Decimal(25),
        price: new Decimal(150),
        date: new Date('2024-06-15')
      }

      mockTaxLotService.getAvailableLots.mockResolvedValue([
        {
          id: 'lot-1',
          symbol,
          portfolioId,
          acquisitionDate: new Date('2024-01-15'),
          remainingShares: new Decimal(10),
          costBasisPerShare: new Decimal(100),
          originalShares: new Decimal(10),
          totalCostBasis: new Decimal(1000),
          transactionId: 'tx-buy-1',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'lot-2',
          symbol,
          portfolioId,
          acquisitionDate: new Date('2024-02-20'),
          remainingShares: new Decimal(15),
          costBasisPerShare: new Decimal(110),
          originalShares: new Decimal(15),
          totalCostBasis: new Decimal(1650),
          transactionId: 'tx-buy-2',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])

      mockTaxLotService.consumeLots.mockResolvedValue([
        {
          lotId: 'lot-1',
          sharesConsumed: new Decimal(10),
          costBasis: new Decimal(1000)
        },
        {
          lotId: 'lot-2',
          sharesConsumed: new Decimal(15),
          costBasis: new Decimal(1650)
        }
      ])

      mockPrisma.realizedPL.create.mockResolvedValueOnce({
        id: 'realized-1',
        portfolioId,
        transactionId: sellTransaction.id,
        symbol,
        taxLotId: 'lot-1',
        sharesSold: new Decimal(10),
        costBasis: new Decimal(1000),
        saleProceeds: new Decimal(1500),
        realizedPL: new Decimal(500),
        saleDate: sellTransaction.date,
        holdingPeriod: 'SHORT',
        createdAt: new Date()
      } as any)

      mockPrisma.realizedPL.create.mockResolvedValueOnce({
        id: 'realized-2',
        portfolioId,
        transactionId: sellTransaction.id,
        symbol,
        taxLotId: 'lot-2',
        sharesSold: new Decimal(15),
        costBasis: new Decimal(1650),
        saleProceeds: new Decimal(2250),
        realizedPL: new Decimal(600),
        saleDate: sellTransaction.date,
        holdingPeriod: 'SHORT',
        createdAt: new Date()
      } as any)

      const result = await service.calculateRealizedPL(sellTransaction as any)

      expect(result).toHaveLength(2)
      expect(result[0].taxLotId).toBe('lot-1')
      expect(result[1].taxLotId).toBe('lot-2')
    })

    it('應拒絕賣出超過持有量的交易', async () => {
      const portfolioId = 'portfolio-1'
      const symbol = 'AAPL'
      const sellTransaction = {
        id: 'tx-sell-1',
        portfolioId,
        symbol,
        type: 'SELL',
        quantity: new Decimal(100),
        price: new Decimal(150),
        date: new Date('2024-06-15')
      }

      mockTaxLotService.getAvailableLots.mockResolvedValue([
        {
          id: 'lot-1',
          symbol,
          portfolioId,
          acquisitionDate: new Date('2024-01-15'),
          remainingShares: new Decimal(10),
          costBasisPerShare: new Decimal(100),
          originalShares: new Decimal(10),
          totalCostBasis: new Decimal(1000),
          transactionId: 'tx-buy-1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])

      await expect(
        service.calculateRealizedPL(sellTransaction as any)
      ).rejects.toThrow('Insufficient shares')
    })
  })

  describe('getSummary', () => {
    it('應回傳使用者所有投資組合的已實現損益總和', async () => {
      const userId = 'user-1'
      const period = 'all'

      mockPrisma.portfolio.findMany.mockResolvedValue([
        { id: 'portfolio-1', name: '美股投資組合', userId } as any,
        { id: 'portfolio-2', name: '科技股組合', userId } as any
      ])

      mockPrisma.realizedPL.findMany.mockResolvedValue([
        {
          id: 'rpl-1',
          portfolioId: 'portfolio-1',
          realizedPL: new Decimal(500),
          holdingPeriod: 'SHORT',
          saleDate: new Date('2024-06-15')
        } as any,
        {
          id: 'rpl-2',
          portfolioId: 'portfolio-2',
          realizedPL: new Decimal(750),
          holdingPeriod: 'LONG',
          saleDate: new Date('2024-07-20')
        } as any
      ])

      const result = await service.getSummary(userId, period)

      expect(result.totalRealizedPL.toString()).toBe('1250')
      expect(result.shortTermPL.toString()).toBe('500')
      expect(result.longTermPL.toString()).toBe('750')
      expect(result.portfolioBreakdown).toHaveLength(2)
    })

    it('應根據時間篩選器過濾結果（本月）', async () => {
      const userId = 'user-1'
      const period = 'month'

      mockPrisma.portfolio.findMany.mockResolvedValue([
        { id: 'portfolio-1', name: '美股投資組合', userId } as any
      ])

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      mockPrisma.realizedPL.findMany.mockResolvedValue([
        {
          id: 'rpl-1',
          portfolioId: 'portfolio-1',
          realizedPL: new Decimal(300),
          holdingPeriod: 'SHORT',
          saleDate: new Date(now.getFullYear(), now.getMonth(), 15)
        } as any
      ])

      const result = await service.getSummary(userId, period)

      expect(result.periodStart.getTime()).toBeGreaterThanOrEqual(monthStart.getTime())
      expect(result.totalRealizedPL.toString()).toBe('300')
    })
  })

  describe('getByPortfolio', () => {
    it('應回傳指定投資組合的已實現損益明細', async () => {
      const portfolioId = 'portfolio-1'
      const userId = 'user-1'

      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        name: '美股投資組合',
        userId
      } as any)

      mockPrisma.realizedPL.findMany.mockResolvedValue([
        {
          id: 'rpl-1',
          portfolioId,
          symbol: 'AAPL',
          realizedPL: new Decimal(500),
          sharesSold: new Decimal(10),
          costBasis: new Decimal(1000),
          saleProceeds: new Decimal(1500),
          holdingPeriod: 'SHORT',
          saleDate: new Date('2024-06-15')
        } as any,
        {
          id: 'rpl-2',
          portfolioId,
          symbol: 'GOOGL',
          realizedPL: new Decimal(300),
          sharesSold: new Decimal(5),
          costBasis: new Decimal(700),
          saleProceeds: new Decimal(1000),
          holdingPeriod: 'LONG',
          saleDate: new Date('2024-07-20')
        } as any
      ])

      const result = await service.getByPortfolio(portfolioId, userId, 'all')

      expect(result.portfolioId).toBe(portfolioId)
      expect(result.totalRealizedPL.toString()).toBe('800')
      expect(result.records).toHaveLength(2)
      expect(result.symbolBreakdown).toHaveLength(2)
      expect(result.symbolBreakdown[0].symbol).toBe('AAPL')
      expect(result.symbolBreakdown[0].totalPL.toString()).toBe('500')
    })

    it('應支援按股票篩選', async () => {
      const portfolioId = 'portfolio-1'
      const userId = 'user-1'
      const symbol = 'AAPL'

      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        name: '美股投資組合',
        userId
      } as any)

      mockPrisma.realizedPL.findMany.mockResolvedValue([
        {
          id: 'rpl-1',
          portfolioId,
          symbol: 'AAPL',
          realizedPL: new Decimal(500),
          sharesSold: new Decimal(10),
          costBasis: new Decimal(1000),
          saleProceeds: new Decimal(1500),
          holdingPeriod: 'SHORT',
          saleDate: new Date('2024-06-15')
        } as any
      ])

      const result = await service.getByPortfolio(portfolioId, userId, 'all', symbol)

      expect(result.records).toHaveLength(1)
      expect(result.records[0].symbol).toBe('AAPL')
      expect(mockPrisma.realizedPL.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            symbol: 'AAPL'
          })
        })
      )
    })

    it('應拒絕未授權使用者存取', async () => {
      const portfolioId = 'portfolio-1'
      const userId = 'user-1'

      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        name: '美股投資組合',
        userId: 'other-user'
      } as any)

      await expect(
        service.getByPortfolio(portfolioId, userId, 'all')
      ).rejects.toThrow('Unauthorized')
    })
  })
})
