import { Express } from 'express'
import { authMiddleware } from '../middleware/auth'
import healthRouter from './health'

// Domain routers - will be added as handlers are converted
import { router as authRouter } from './auth'
import { router as portfoliosRouter } from './portfolios'
import { router as transactionsRouter } from './transactions'
import { router as stocksRouter } from './stocks'
import { router as indicatorsRouter } from './indicators'
import { router as strategiesRouter } from './strategies'
import { router as newsRouter } from './news'
import { router as riskAssessmentRouter } from './risk-assessment'
import { router as realizedPlRouter } from './realized-pl'
import { router as holdingAdviceRouter } from './holding-advice'
import { router as miscRouter } from './misc'

/**
 * Register all routes on the Express application
 */
export function registerRoutes(app: Express): void {
  // Health check (no auth)
  app.use(healthRouter)

  // Auth routes (mixed auth - login/register don't need auth, me/logout do)
  app.use('/api/auth', authRouter)

  // Protected domain routes
  app.use('/api/portfolios', authMiddleware, portfoliosRouter)
  app.use('/api/transactions', authMiddleware, transactionsRouter)
  app.use('/api/stocks', authMiddleware, stocksRouter)
  app.use('/api/indicators', authMiddleware, indicatorsRouter)
  app.use('/api/strategies', authMiddleware, strategiesRouter)
  app.use('/api/news', newsRouter) // Mixed auth - sources is public
  app.use('/api/risk-assessment', authMiddleware, riskAssessmentRouter)
  app.use('/api/realized-pl', authMiddleware, realizedPlRouter)
  app.use('/api/holding-advice', authMiddleware, holdingAdviceRouter)
  
  // Misc routes (dashboard news, sync, query-tsm, holdings export)
  app.use('/api', miscRouter)
}
