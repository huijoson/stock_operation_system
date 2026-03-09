import { Router, Request, Response } from 'express'

const router = Router()

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

export default router
