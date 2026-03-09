import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

/**
 * Authentication middleware for Express
 * Validates session cookie and attaches user to req.user
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionToken = req.cookies?.session_token

  if (!sessionToken) {
    res.status(401).json({ error: 'Unauthorized - No session token' })
    return
  }

  try {
    // Validate session token via database lookup
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    })

    if (!session || session.expiresAt < new Date()) {
      res.status(401).json({ error: 'Unauthorized - Invalid or expired session' })
      return
    }

    // Attach user to request
    req.user = {
      id: session.user.id,
      email: session.user.email,
    }

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({ error: 'Internal server error during authentication' })
  }
}

/**
 * Helper to get current user from request
 */
export function getCurrentUser(req: Request) {
  return req.user || null
}

/**
 * Helper to require authentication - throws if not authenticated
 */
export function requireAuth(req: Request): { id: string; email: string } {
  if (!req.user) {
    throw new Error('Unauthorized')
  }
  return req.user
}
