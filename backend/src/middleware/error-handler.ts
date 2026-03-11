import { Prisma } from '../lib/prisma-client'
import { Request, Response, NextFunction } from 'express'

/**
 * Error codes for the application
 */
enum ErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_INPUT = 'INVALID_INPUT',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  INVALID_PORTFOLIO_NAME = 'INVALID_PORTFOLIO_NAME',
  INSUFFICIENT_HOLDINGS = 'INSUFFICIENT_HOLDINGS',
  INVALID_TRANSACTION = 'INVALID_TRANSACTION',
  PORTFOLIO_NOT_FOUND = 'PORTFOLIO_NOT_FOUND',
  STOCK_API_ERROR = 'STOCK_API_ERROR',
  STOCK_NOT_FOUND = 'STOCK_NOT_FOUND',
  CSV_PARSE_ERROR = 'CSV_PARSE_ERROR',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
  }
}

/**
 * Custom application error class
 */
class ApplicationError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: any

  constructor(code: string, message: string, statusCode: number = 500, details?: any) {
    super(message)
    this.name = 'ApplicationError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * Type guard to check if error is a Prisma error
 */
function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError, res: Response): void {
  switch (error.code) {
    case 'P2002':
      res.status(409).json({
        error: {
          code: ErrorCode.DUPLICATE_EMAIL,
          message: '此資料已存在',
          details: error.meta,
        },
      })
      return

    case 'P2025':
      res.status(404).json({
        error: {
          code: ErrorCode.PORTFOLIO_NOT_FOUND,
          message: '找不到指定的資料',
          details: error.meta,
        },
      })
      return

    case 'P2003':
      res.status(400).json({
        error: {
          code: ErrorCode.INVALID_INPUT,
          message: '資料關聯錯誤',
          details: error.meta,
        },
      })
      return

    default:
      res.status(500).json({
        error: {
          code: ErrorCode.DATABASE_ERROR,
          message: '資料庫操作失敗',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      })
  }
}

/**
 * Express error handling middleware
 * Must be registered AFTER all routes
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error('API Error:', err)

  // Handle ApplicationError
  if (err instanceof ApplicationError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    })
    return
  }

  // Handle Prisma errors
  if (isPrismaError(err)) {
    handlePrismaError(err, res)
    return
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: err.message,
      },
    })
    return
  }

  // Handle generic errors
  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: '系統內部錯誤',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
  })
}

export { ApplicationError, ErrorCode }
export type { ErrorResponse }
