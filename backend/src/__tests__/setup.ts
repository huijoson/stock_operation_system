// The prisma singleton (../lib/prisma) calls createPrismaClient() at module load,
// which throws without DATABASE_URL. When no DATABASE_URL is set (e.g. local runs
// without a DB), mock the client so tests that don't need the real client don't
// fail on import. When DATABASE_URL IS set (e.g. CI with a Postgres service), the
// factories fall through to the real modules so DB-backed property/integration
// tests can run.
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL)

jest.mock('../lib/prisma-client', () => {
  if (hasDatabaseUrl) {
    return jest.requireActual('../lib/prisma-client')
  }

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

jest.mock('../lib/prisma', () => {
  if (hasDatabaseUrl) {
    return jest.requireActual('../lib/prisma')
  }

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

  const prisma = {
    session: createDelegate(),
    user: createDelegate(),
    portfolio: createDelegate(),
    transaction: createDelegate(),
    holding: createDelegate(),
    taxLot: createDelegate(),
    realizedPL: createDelegate(),
    strategy: createDelegate(),
    stockPrice: createDelegate(),
    indicatorCache: createDelegate(),
    stockNews: createDelegate(),
    newsSourceRating: createDelegate(),
    riskAssessment: createDelegate(),
    holdingAdvice: createDelegate(),
    dashboardNewsItem: createDelegate(),
    syncQuotaLog: createDelegate(),
    sourceCredibility: createDelegate(),
    $disconnect: jest.fn(),
    $connect: jest.fn(),
  }

  return { prisma, default: prisma }
})
