import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/services/auth.service'
import { ApplicationError } from '@/types/errors'

/**
 * POST /api/auth/login
 * Login user and create session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Login user
    const authService = new AuthService()
    const session = await authService.login(email, password)

    // Create response with session cookie
    const response = NextResponse.json(
      {
        session: {
          token: session.token,
          expiresAt: session.expiresAt,
        },
      },
      { status: 200 }
    )

    const isHttpsRequest = false

    // Set session cookie
    response.cookies.set('session_token', session.token, {
      httpOnly: true,
      // Temporary fix: force non-Secure to support HTTP LAN access.
      // Revisit and make this environment-driven when HTTPS is enabled.
      secure: isHttpsRequest,
      sameSite: 'lax',
      expires: session.expiresAt,
      path: '/',
    })

    response.headers.set('x-auth-cookie-secure', String(isHttpsRequest))
    response.headers.set('x-auth-request-protocol', request.nextUrl.protocol)

    return response
  } catch (error: unknown) {
    if (error instanceof ApplicationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
