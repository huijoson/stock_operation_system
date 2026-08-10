// The prisma singleton (../lib/prisma) calls createPrismaClient() at module load,
// which throws without DATABASE_URL. Mock it globally so tests that don't need the
// real client don't fail on import. Tests that exercise the client mock it themselves.
jest.mock('../lib/prisma', () => ({}))

jest.mock('../lib/prisma-client', () => {
  const createDelegate = () => ({
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  })

  class PrismaClient {
    session = createDelegate()
    user = createDelegate()
    portfolio = createDelegate()
    transaction = createDelegate()
    holding = createDelegate()
    taxLot = createDelegate()
    realizedPL = createDelegate()
    strategy = createDelegate()
    stockPrice = createDelegate()
    indicatorCache = createDelegate()
    stockNews = createDelegate()
    newsSourceRating = createDelegate()
    riskAssessment = createDelegate()
    holdingAdvice = createDelegate()
    dashboardNewsItem = createDelegate()
    syncQuotaLog = createDelegate()
    sourceCredibility = createDelegate()
    $disconnect = jest.fn()
    $connect = jest.fn()
  }

  class PrismaClientKnownRequestError extends Error {
    code: string

    constructor(message: string, code: string) {
      super(message)
      this.code = code
      this.name = 'PrismaClientKnownRequestError'
    }
  }

  return {
    PrismaClient,
    Prisma: {
      PrismaClientKnownRequestError,
    },
  }
})

const createRouterMock = () => {
  const express = require('express')
  return { router: express.Router() }
}

jest.mock('../routes/auth', () => createRouterMock())
jest.mock('../routes/portfolios', () => createRouterMock())
jest.mock('../routes/transactions', () => createRouterMock())
jest.mock('../routes/stocks', () => createRouterMock())
jest.mock('../routes/news', () => createRouterMock())
jest.mock('../routes/risk-assessment', () => createRouterMock())
jest.mock('../routes/realized-pl', () => createRouterMock())
jest.mock('../routes/holding-advice', () => createRouterMock())
