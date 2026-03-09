import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
import prisma from '../lib/prisma'
import { ErrorFactory } from '../types/errors'

// Infer types from Prisma client
type User = Awaited<ReturnType<PrismaClient['user']['create']>>
type Session = Awaited<ReturnType<PrismaClient['session']['create']>>

/**
 * AuthService handles user authentication operations
 * including registration, login, logout, and session validation.
 */
export class AuthService {
  private prisma: PrismaClient
  private readonly SALT_ROUNDS = 10
  private readonly SESSION_EXPIRY_DAYS = 30

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma
  }

  /**
   * Register a new user with email and password
   * 
   * @param email - User's email address
   * @param password - User's password (will be hashed)
   * @returns Created user object
   * @throws ApplicationError if email already exists
   */
  async register(email: string, password: string): Promise<User> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw ErrorFactory.duplicateEmail()
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS)

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    })

    return user
  }

  /**
   * Login user with email and password
   * 
   * @param email - User's email address
   * @param password - User's password
   * @returns Created session object
   * @throws ApplicationError if credentials are invalid
   */
  async login(email: string, password: string): Promise<Session> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw ErrorFactory.invalidCredentials()
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      throw ErrorFactory.invalidCredentials()
    }

    // Generate session token
    const token = this.generateToken()

    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.SESSION_EXPIRY_DAYS)

    // Create session
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    return session
  }

  /**
   * Logout user by invalidating session
   * 
   * @param token - Session token to invalidate
   */
  async logout(token: string): Promise<void> {
    // Delete session if it exists
    await this.prisma.session.deleteMany({
      where: { token },
    })
  }

  /**
   * Validate session and return user if valid
   * 
   * @param token - Session token to validate
   * @returns User object if session is valid, null otherwise
   */
  async validateSession(token: string): Promise<User | null> {
    // Find session by token
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session) {
      return null
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      // Delete expired session
      await this.prisma.session.delete({
        where: { id: session.id },
      })
      return null
    }

    return session.user
  }

  /**
   * Generate a random session token
   * 
   * @returns Random token string
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex')
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}
