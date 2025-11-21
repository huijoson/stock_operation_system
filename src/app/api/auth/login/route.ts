import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/services/auth.service'

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

    // Set session cookie
    response.cookies.set('session_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: session.expiresAt,
      path: '/',
    })

    return response
  } catch (error: any) {
    if (error.message === 'Invalid credentials') {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
