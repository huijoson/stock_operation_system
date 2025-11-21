import { NextResponse } from 'next/server'
import { ApplicationError, ErrorCode } from '@/types/errors'
import { Prisma } from '@prisma/client'
import type { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: {
    code: ErrorCode
    message: string
    details?: any
  }
}

/**
 * Handle API errors and return standardized error responses
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  // Log error for debugging
  console.error('API Error:', error)

  // Handle ApplicationError
  if (error instanceof ApplicationError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    )
  }

  // Handle Prisma errors
  if (isPrismaError(error)) {
    return handlePrismaError(error)
  }

  // Handle validation errors
  if (error instanceof Error && error.name === 'ValidationError') {
    return NextResponse.json(
      {
        error: {
          code: ErrorCode.INVALID_INPUT,
          message: error.message,
        },
      },
      { status: 400 }
    )
  }

  // Handle generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: '系統內部錯誤',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      },
      { status: 500 }
    )
  }

  // Unknown error type
  return NextResponse.json(
    {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: '未知錯誤',
      },
    },
    { status: 500 }
  )
}

/**
 * Type guard to check if error is a Prisma error
 */
function isPrismaError(error: unknown): error is PrismaClientKnownRequestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'meta' in error &&
    'clientVersion' in error
  )
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: PrismaClientKnownRequestError): NextResponse<ErrorResponse> {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.DUPLICATE_EMAIL,
            message: '此資料已存在',
            details: error.meta,
          },
        },
        { status: 409 }
      )

    case 'P2025':
      // Record not found
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.PORTFOLIO_NOT_FOUND,
            message: '找不到指定的資料',
            details: error.meta,
          },
        },
        { status: 404 }
      )

    case 'P2003':
      // Foreign key constraint violation
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: '資料關聯錯誤',
            details: error.meta,
          },
        },
        { status: 400 }
      )

    default:
      // Generic database error
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.DATABASE_ERROR,
            message: '資料庫操作失敗',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          },
        },
        { status: 500 }
      )
  }
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>
) {
  return async (...args: T): Promise<NextResponse<R | ErrorResponse>> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
