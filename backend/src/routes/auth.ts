import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { Router, Request, Response, NextFunction } from 'express'
import { authMiddleware } from '../middleware/auth'
import { AuthService } from '../services/auth.service'

type ApplicationErrorShape = {
  code: string
  message: string
  statusCode: number
  details?: unknown
}

const router = Router()

const ErrorCode = {
  INVALID_INPUT: 'INVALID_INPUT',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  PORTFOLIO_NOT_FOUND: 'PORTFOLIO_NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

function isPrismaError(error: unknown): error is PrismaClientKnownRequestError {
  return error instanceof PrismaClientKnownRequestError
}

function isApplicationError(error: unknown): error is ApplicationErrorShape {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'statusCode' in error &&
    typeof (error as ApplicationErrorShape).message === 'string' &&
    typeof (error as ApplicationErrorShape).statusCode === 'number'
  )
}

function invalidInputError(message: string): ApplicationErrorShape {
  return {
    code: ErrorCode.INVALID_INPUT,
    message,
    statusCode: 400,
  }
}

function handleRegisterError(error: unknown, res: Response): Response {
  if (isApplicationError(error)) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code || ErrorCode.INTERNAL_ERROR,
        message: error.message,
        details: error.details,
      },
    })
  }

  if (isPrismaError(error)) {
    switch (error.code) {
      case 'P2002':
        return res.status(409).json({
          error: {
            code: ErrorCode.DUPLICATE_EMAIL,
            message: '此資料已存在',
            details: error.meta,
          },
        })
      case 'P2025':
        return res.status(404).json({
          error: {
            code: ErrorCode.PORTFOLIO_NOT_FOUND,
            message: '找不到指定的資料',
            details: error.meta,
          },
        })
      case 'P2003':
        return res.status(400).json({
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: '資料關聯錯誤',
            details: error.meta,
          },
        })
      default:
        return res.status(500).json({
          error: {
            code: ErrorCode.DATABASE_ERROR,
            message: '資料庫操作失敗',
          },
        })
    }
  }

  if (error instanceof Error && error.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: error.message,
      },
    })
  }

  if (error instanceof Error) {
    return res.status(500).json({
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: '系統內部錯誤',
      },
    })
  }

  return res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: '未知錯誤',
    },
  })
}

/**
 * POST /api/auth/login
 * Login user and create session
 */
router.post('/login', async (req: Request, res: Response, _next: NextFunction): Promise<Response> => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const authService = new AuthService()
    const session = await authService.login(email, password)
    const isHttpsRequest = false

    res.cookie('session_token', session.token, {
      httpOnly: true,
      secure: isHttpsRequest,
      sameSite: 'lax',
      expires: session.expiresAt,
      path: '/',
    })

    res.set('x-auth-cookie-secure', String(isHttpsRequest))
    res.set('x-auth-request-protocol', req.protocol)

    return res.status(200).json({
      session: {
        token: session.token,
        expiresAt: session.expiresAt,
      },
    })
  } catch (error: unknown) {
    if (isApplicationError(error)) {
      return res.status(error.statusCode).json({ error: error.message })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/auth/logout
 * Logout user and invalidate session
 */
router.post('/logout', authMiddleware, async (req: Request, res: Response, _next: NextFunction): Promise<Response> => {
  try {
    const sessionToken = req.cookies?.session_token

    if (!sessionToken) {
      return res.status(401).json({ error: 'No active session' })
    }

    const authService = new AuthService()
    await authService.logout(sessionToken)

    res.clearCookie('session_token', { path: '/' })

    return res.status(200).json({ message: 'Logged out successfully' })
  } catch (error: unknown) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response, _next: NextFunction): Promise<Response> => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      throw invalidInputError('電子郵件和密碼為必填欄位')
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw invalidInputError('電子郵件格式不正確')
    }

    if (password.length < 6) {
      throw invalidInputError('密碼長度至少需要 6 個字元')
    }

    const authService = new AuthService()
    const user = await authService.register(email, password)

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    })
  } catch (error: unknown) {
    return handleRegisterError(error, res)
  }
})

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware, async (req: Request, res: Response, _next: NextFunction): Promise<Response> => {
  try {
    const sessionToken = req.cookies?.session_token
    if (!sessionToken) {
      throw new Error('Unauthorized')
    }

    const authService = new AuthService()
    const user = await authService.validateSession(sessionToken)

    if (!user) {
      throw new Error('Unauthorized')
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
})

export { router }
