import Decimal from 'decimal.js'

jest.mock('../lib/prisma', () => ({}))

import { TransactionService } from '../services/transaction.service'
import { PrismaClient } from '../lib/prisma-client'

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

const FIRSTRADE_ZH = `代號,策略名稱,證券名稱,狀態,行動,數量|面值,價格,時間限制,成交價格,成交價是平均值,時間和日期（美東時間）,最新活動(美東時間),資本利得再投資,訂單號碼
TSLA,,TESLA INC,已成交,買入,20 股數,市價,當天,$422.55,否,1:00 PM 06/02/2026,1:00 PM 06/02/2026,,1006575884073`

function makePrisma(existing: any[]) {
  const prisma = new PrismaClient() as any
  prisma.holding = {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  }
  prisma.transaction = {
    findMany: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockResolvedValue({ id: 'tx-new', symbol: 'TSLA', type: 'BUY' }),
  }
  return prisma
}

describe('importFromCSV externalId 防重', () => {
  beforeEach(() => jest.clearAllMocks())

  it('externalId 已存在 → 跳過、不建立', async () => {
    const existing = [{
      id: 'x', symbol: 'TSLA', type: 'BUY',
      quantity: '20.00000000', price: '422.55000000',
      date: new Date('2026-06-02T00:00:00.000Z'), externalId: '1006575884073',
    }]
    const prisma = makePrisma(existing)
    const result = await new TransactionService(prisma).importFromCSV('p-1', FIRSTRADE_ZH, 'firstrade-zh')
    expect(result.successCount).toBe(0)
    expect(result.skippedCount).toBe(1)
    expect(prisma.transaction.create).not.toHaveBeenCalled()
  })

  it('externalId 為新 → 建立並寫入 externalId', async () => {
    const prisma = makePrisma([])
    const result = await new TransactionService(prisma).importFromCSV('p-1', FIRSTRADE_ZH, 'firstrade-zh')
    expect(result.successCount).toBe(1)
    expect(prisma.transaction.create).toHaveBeenCalledTimes(1)
    const createArg = prisma.transaction.create.mock.calls[0][0]
    expect(createArg.data.externalId).toBe('1006575884073')
  })
})
