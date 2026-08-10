import * as fc from 'fast-check'
import { PrismaClient, User, Session } from '../../lib/prisma-client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

/**
 * Property-based tests for AuthService
 * 
 * These tests verify the correctness properties of user authentication
 * as defined in the design document.
 */

// ============================================================================
// Test Setup
// ============================================================================

// Mock Prisma Client
jest.mock('../../lib/prisma-client', () => ({
  ...jest.requireActual('../../lib/prisma-client'),
  PrismaClient: jest.fn(),
}))

let prismaMock: DeepMockProxy<PrismaClient>

beforeEach(() => {
  prismaMock = mockDeep<PrismaClient>()
  ;(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => prismaMock as any)
})

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate a valid email address
 */
const arbitraryEmail = () =>
  fc
    .tuple(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
        minLength: 3,
        maxLength: 20,
      }),
      fc.constantFrom('gmail.com', 'yahoo.com', 'outlook.com', 'example.com')
    )
    .map(([local, domain]) => `${local}@${domain}`)

/**
 * Generate a valid password (at least 6 characters)
 */
const arbitraryPassword = () =>
  fc.string({ minLength: 6, maxLength: 50 })

/**
 * Generate user credentials
 */
const arbitraryCredentials = () =>
  fc.record({
    email: arbitraryEmail(),
    password: arbitraryPassword(),
  })

// ============================================================================
// Property 1: 帳號建立成功性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 1: 帳號建立成功性
 * 
 * 對於任何有效的電子郵件和密碼組合，呼叫註冊功能應該成功建立新帳號，
 * 且該帳號可以在資料庫中查詢到。
 * 
 * Validates: Requirements 1.1
 */
describe('Property 1: 帳號建立成功性', () => {
  it('should successfully create account for any valid email and password', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryCredentials(), async (credentials) => {
        // Mock database responses
        prismaMock.user.findUnique.mockResolvedValue(null) // No existing user
        prismaMock.user.create.mockResolvedValue({
          id: 'test-user-id',
          email: credentials.email,
          password: 'hashed-password',
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        const { AuthService } = await import('@/services/auth.service')
        const authService = new AuthService(prismaMock as any)

        // Register user
        const user = await authService.register(credentials.email, credentials.password)

        // Verify user was created
        expect(user).toBeDefined()
        expect(user.id).toBeDefined()
        expect(user.email).toBe(credentials.email)
        expect(user.password).not.toBe(credentials.password) // Password should be hashed

        // Verify Prisma was called correctly
        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
          where: { email: credentials.email },
        })
        expect(prismaMock.user.create).toHaveBeenCalled()
      }),
      { numRuns: 20 }
    )
  })

  it('should reject duplicate email registration', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryCredentials(), async (credentials) => {
        // Mock existing user
        prismaMock.user.findUnique.mockResolvedValue({
          id: 'existing-user-id',
          email: credentials.email,
          password: 'existing-hashed-password',
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        const { AuthService } = await import('@/services/auth.service')
        const authService = new AuthService(prismaMock as any)

        // Try to register with existing email
        await expect(
          authService.register(credentials.email, credentials.password)
        ).rejects.toThrow('此電子郵件已被註冊')
      }),
      { numRuns: 20 }
    )
  })

  it('should hash passwords before storing', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryCredentials(), async (credentials) => {
        let capturedPassword: string | undefined

        prismaMock.user.findUnique.mockResolvedValue(null)
        prismaMock.user.create.mockImplementation((args: any) => {
          capturedPassword = args.data.password
          return Promise.resolve({
            id: 'test-user-id',
            email: credentials.email,
            password: capturedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        })

        const { AuthService } = await import('@/services/auth.service')
        const authService = new AuthService(prismaMock as any)

        // Register user
        await authService.register(credentials.email, credentials.password)

        // Verify password was hashed
        expect(capturedPassword).toBeDefined()
        expect(capturedPassword).not.toBe(credentials.password)
        expect(capturedPassword!.length).toBeGreaterThan(20) // Bcrypt hashes are long
      }),
      { numRuns: 20 }
    )
  })
})


// ============================================================================
// Property 2: 登入往返一致性
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 2: 登入往返一致性
 * 
 * 對於任何已註冊的使用者，使用正確的憑證登入後，系統應該返回有效的 session，
 * 且該 session 可以用來驗證使用者身份。
 * 
 * Validates: Requirements 1.2
 */
describe('Property 2: 登入往返一致性', () => {
  it('should return valid session for registered user with correct credentials', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryCredentials(), async (credentials) => {
        const bcrypt = require('bcrypt')
        const hashedPassword = await bcrypt.hash(credentials.password, 10)

        // Mock user exists with hashed password
        prismaMock.user.findUnique.mockResolvedValue({
          id: 'test-user-id',
          email: credentials.email,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        // Mock session creation
        const mockSession = {
          id: 'test-session-id',
          userId: 'test-user-id',
          token: 'test-token',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        }
        prismaMock.session.create.mockResolvedValue(mockSession)

        // Mock session validation
        prismaMock.session.findUnique.mockResolvedValue({
          ...mockSession,
          user: {
            id: 'test-user-id',
            email: credentials.email,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        } as any)

        const { AuthService } = await import('@/services/auth.service')
        const authService = new AuthService(prismaMock as any)

        // Login with correct credentials
        const session = await authService.login(credentials.email, credentials.password)

        // Verify session is valid
        expect(session).toBeDefined()
        expect(session.id).toBeDefined()
        expect(session.token).toBeDefined()
        expect(session.userId).toBe('test-user-id')
        expect(session.expiresAt).toBeInstanceOf(Date)
        expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now())

        // Verify session can be used to validate user identity
        const validatedUser = await authService.validateSession(session.token)
        expect(validatedUser).toBeDefined()
        expect(validatedUser?.id).toBe('test-user-id')
        expect(validatedUser?.email).toBe(credentials.email)
      }),
      { numRuns: 20 }
    )
  })

  it('should create session in database', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryCredentials(), async (credentials) => {
        const bcrypt = require('bcrypt')
        const hashedPassword = await bcrypt.hash(credentials.password, 10)

        prismaMock.user.findUnique.mockResolvedValue({
          id: 'test-user-id',
          email: credentials.email,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        const mockSession = {
          id: 'test-session-id',
          userId: 'test-user-id',
          token: 'test-token',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        }
        prismaMock.session.create.mockResolvedValue(mockSession)

        const { AuthService } = await import('@/services/auth.service')
        const authService = new AuthService(prismaMock as any)

        // Login
        const session = await authService.login(credentials.email, credentials.password)

        // Verify session.create was called
        expect(prismaMock.session.create).toHaveBeenCalled()
        expect(session.userId).toBe('test-user-id')
        expect(session.token).toBeDefined()
      }),
      { numRuns: 20 }
    )
  })
})

// ============================================================================
// Property 3: 錯誤憑證拒絕
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 3: 錯誤憑證拒絕
 * 
 * 對於任何錯誤的登入憑證（不存在的電子郵件或錯誤的密碼），
 * 系統應該拒絕登入請求並返回錯誤。
 * 
 * Validates: Requirements 1.3
 */
describe('Property 3: 錯誤憑證拒絕', () => {
  it('should reject login with non-existent email', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryEmail(), arbitraryPassword(), async (email, password) => {
        // Mock no user found
        prismaMock.user.findUnique.mockResolvedValue(null)

        const { AuthService } = await import('@/services/auth.service')
        const authService = new AuthService(prismaMock as any)

        // Try to login with non-existent email
        await expect(authService.login(email, password)).rejects.toThrow('電子郵件或密碼錯誤')
      }),
      { numRuns: 20 }
    )
  })

  it('should reject login with wrong password', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCredentials(),
        arbitraryPassword(),
        async (credentials, wrongPassword) => {
          // Ensure wrong password is different from correct password
          fc.pre(wrongPassword !== credentials.password)

          const bcrypt = require('bcrypt')
          const hashedPassword = await bcrypt.hash(credentials.password, 10)

          // Mock user exists
          prismaMock.user.findUnique.mockResolvedValue({
            id: 'test-user-id',
            email: credentials.email,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          const { AuthService } = await import('@/services/auth.service')
          const authService = new AuthService(prismaMock as any)

          // Try to login with wrong password
          await expect(authService.login(credentials.email, wrongPassword)).rejects.toThrow('電子郵件或密碼錯誤')
        }
      ),
      { numRuns: 20 }
    )
  })

  it('should not create session for failed login attempts', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryEmail(), arbitraryPassword(), async (email, password) => {
        // Mock no user found
        prismaMock.user.findUnique.mockResolvedValue(null)

        const { AuthService } = await import('@/services/auth.service')
        const authService = new AuthService(prismaMock as any)

        // Try to login with non-existent email (should fail)
        try {
          await authService.login(email, password)
        } catch (error) {
          // Expected to fail
        }

        // Verify session.create was never called
        expect(prismaMock.session.create).not.toHaveBeenCalled()
      }),
      { numRuns: 20 }
    )
  })
})

// ============================================================================
// Property 4: 登出清除狀態
// ============================================================================

/**
 * Feature: stock-portfolio-system, Property 4: 登出清除狀態
 * 
 * 對於任何有效的 session，呼叫登出功能後，該 session 應該被清除
 * 且無法再用於驗證使用者身份。
 * 
 * Validates: Requirements 1.5
 */
describe('Property 4: 登出清除狀態', () => {
  it('should clear session after logout', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 10, maxLength: 64 }), async (token) => {
        const mockSession = {
          id: 'test-session-id',
          userId: 'test-user-id',
          token: token,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            password: 'hashed',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }

        // Mock session exists before logout
        prismaMock.session.findUnique.mockResolvedValueOnce(mockSession as any)

        // Mock session deletion
        prismaMock.session.deleteMany.mockResolvedValue({ count: 1 })

        // Mock session not found after logout
        prismaMock.session.findUnique.mockResolvedValueOnce(null)

        const { AuthService } = await import('@/services/auth.service')
        const authService = new AuthService(prismaMock as any)

        // Verify session is valid before logout
        const userBeforeLogout = await authService.validateSession(token)
        expect(userBeforeLogout).toBeDefined()

        // Logout
        await authService.logout(token)

        // Verify session is no longer valid
        const userAfterLogout = await authService.validateSession(token)
        expect(userAfterLogout).toBeNull()

        // Verify deleteMany was called
        expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
          where: { token },
        })
      }),
      { numRuns: 20 }
    )
  })

  it('should remove session from database after logout', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 10, maxLength: 64 }), async (token) => {
        // Mock session deletion
        prismaMock.session.deleteMany.mockResolvedValue({ count: 1 })

        const { AuthService } = await import('@/services/auth.service')
        const authService = new AuthService(prismaMock as any)

        // Logout
        await authService.logout(token)

        // Verify deleteMany was called with correct token
        expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
          where: { token },
        })
      }),
      { numRuns: 20 }
    )
  })

  it('should handle logout of non-existent session gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (fakeToken) => {
        // Mock no sessions deleted
        prismaMock.session.deleteMany.mockResolvedValue({ count: 0 })

        const { AuthService } = await import('@/services/auth.service')
        const authService = new AuthService(prismaMock as any)

        // Logout with non-existent token should not throw
        await expect(authService.logout(fakeToken)).resolves.not.toThrow()
      }),
      { numRuns: 20 }
    )
  })
})
