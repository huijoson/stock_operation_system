import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/services/auth.service'

/**
 * Authentication middleware
 * Validates session and attaches user to request
 */
export async function authMiddleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value

  if (!sessionToken) {
    return NextResponse.json(
      { error: 'Unauthorized - No session token' },
      { status: 401 }
    )
  }

  const authService = new AuthService()
  const user = await authService.validateSession(sessionToken)

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or expired session' },
      { status: 401 }
    )
  }

  // Attach user to request headers for downstream handlers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', user.id)
  requestHeaders.set('x-user-email', user.email)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

/**
 * Helper to get current user from request headers
 */
export function getCurrentUser(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const userEmail = request.headers.get('x-user-email')

  if (!userId || !userEmail) {
    return null
  }

  return {
    id: userId,
    email: userEmail,
  }
}

/**
 * Helper to require authentication in API routes
 */
export async function requireAuth(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value

  if (!sessionToken) {
    throw new Error('Unauthorized')
  }

  const authService = new AuthService()
  const user = await authService.validateSession(sessionToken)

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}
