import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/services/auth.service'
import { withErrorHandler } from '@/lib/api/error-handler'
import { ErrorFactory } from '@/types/errors'

/**
 * POST /api/auth/register
 * Register a new user
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const { email, password } = body

  // Validate input
  if (!email || !password) {
    throw ErrorFactory.invalidInput('電子郵件和密碼為必填欄位')
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw ErrorFactory.invalidInput('電子郵件格式不正確')
  }

  // Validate password length
  if (password.length < 6) {
    throw ErrorFactory.invalidInput('密碼長度至少需要 6 個字元')
  }

  // Register user
  const authService = new AuthService()
  const user = await authService.register(email, password)

  // Return user without password
  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    },
    { status: 201 }
  )
})
