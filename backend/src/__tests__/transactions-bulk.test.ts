import Decimal from 'decimal.js'

jest.mock('../lib/prisma', () => ({}))

import { TransactionService } from '../services/transaction.service'
import { PrismaClient } from '../lib/prisma-client'

const mockHolding = { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() }
const mockTransaction = { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() }
const mockTaxLot = { create: jest.fn(), findMany: jest.fn(), update: jest.fn() }
const mockRealizedPL = { create: jest.fn() }

jest.mock('../services/tax-lot.service', () => ({
  TaxLotService: jest.fn().mockImplementation(() => ({
    createFromTransaction: jest.fn().mockResolvedValue(undefined),
    backfillForSymbol: jest.fn().mockResolvedValue(undefined),
  })),
}))

jest.mock('../services/realized-pl.service', () => ({
  RealizedPLService: jest.fn().mockImplementation(() => ({
    calculateRealizedPL: jest.fn().mockResolvedValue(undefined),
  })),
}))

function makePrisma() {
  const prisma = new PrismaClient() as any
  prisma.holding = mockHolding
  prisma.transaction = mockTransaction
  prisma.taxLot = mockTaxLot
  prisma.realizedPL = mockRealizedPL
  prisma.$transaction = jest.fn().mockImplementation(async (fn: any) => fn(prisma))
  return prisma
}

describe('TransactionService.createTransactionsBulk', () => {
  let prisma: any
  let service: TransactionService

  const buyInput = {
    symbol: 'AAPL',
    type: 'BUY' as const,
    quantity: new Decimal('10'),
    price: new Decimal('150'),
    date: new Date('2024-01-15'),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    prisma = makePrisma()
    service = new TransactionService(prisma)

    mockHolding.findUnique.mockResolvedValue(null)
    mockHolding.create.mockResolvedValue({})
    mockTransaction.create.mockResolvedValue({
      id: 'tx-1',
      portfolioId: 'p-1',
      symbol: 'AAPL',
      type: 'BUY',
      quantity: '10.00000000',
      price: '150.00000000',
      date: new Date('2024-01-15'),
    })
  })

  it('成功批次建立多筆交易', async () => {
    const results = await service.createTransactionsBulk('p-1', [buyInput, { ...buyInput, symbol: 'TSLA' }])
    expect(results).toHaveLength(2)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockTransaction.create).toHaveBeenCalledTimes(2)
  })

  it('空陣列應拋出錯誤', async () => {
    await expect(service.createTransactionsBulk('p-1', [])).rejects.toThrow('must not be empty')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('任一筆 quantity <= 0 應在驗證階段拋出', async () => {
    const badInput = { ...buyInput, quantity: new Decimal('0') }
    await expect(service.createTransactionsBulk('p-1', [buyInput, badInput])).rejects.toThrow('quantity')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('任一筆 price <= 0 應在驗證階段拋出', async () => {
    const badInput = { ...buyInput, price: new Decimal('-1') }
    await expect(service.createTransactionsBulk('p-1', [badInput])).rejects.toThrow('price')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('SELL 時持倉不足應拋出且不寫入任何交易', async () => {
    prisma.$transaction.mockImplementation(async (fn: any) => {
      await fn(prisma)
    })
    mockHolding.findUnique.mockResolvedValue(null)

    const sellInput = { ...buyInput, type: 'SELL' as const }
    await expect(service.createTransactionsBulk('p-1', [sellInput])).rejects.toThrow(/Cannot sell/)
  })
})
