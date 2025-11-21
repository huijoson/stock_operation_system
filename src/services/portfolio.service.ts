import { PrismaClient, Portfolio, Holding } from '@prisma/client'

/**
 * PortfolioService handles portfolio management operations
 * including creation, retrieval, update, deletion, and holdings management.
 */
export class PortfolioService {
  private prisma: PrismaClient

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient()
  }

  /**
   * Create a new portfolio for a user
   * 
   * @param userId - User ID who owns the portfolio
   * @param name - Portfolio name
   * @returns Created portfolio object
   * @throws Error if name is empty or whitespace only
   */
  async createPortfolio(userId: string, name: string): Promise<Portfolio> {
    // Validate portfolio name
    if (!name || name.trim().length === 0) {
      throw new Error('Portfolio name cannot be empty or whitespace only')
    }

    // Trim the name
    const trimmedName = name.trim()

    // Create portfolio
    const portfolio = await this.prisma.portfolio.create({
      data: {
        name: trimmedName,
        userId: userId,
      },
    })

    return portfolio
  }

  /**
   * Get all portfolios for a user
   * 
   * @param userId - User ID
   * @returns Array of portfolios
   */
  async getPortfolios(userId: string): Promise<Portfolio[]> {
    const portfolios = await this.prisma.portfolio.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return portfolios
  }

  /**
   * Update portfolio name
   * 
   * @param portfolioId - Portfolio ID to update
   * @param name - New portfolio name
   * @returns Updated portfolio object
   * @throws Error if name is empty or whitespace only
   */
  async updatePortfolio(portfolioId: string, name: string): Promise<Portfolio> {
    // Validate portfolio name
    if (!name || name.trim().length === 0) {
      throw new Error('Portfolio name cannot be empty or whitespace only')
    }

    // Trim the name
    const trimmedName = name.trim()

    // Update portfolio
    const portfolio = await this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: { name: trimmedName },
    })

    return portfolio
  }

  /**
   * Delete portfolio and all related data (cascade)
   * 
   * @param portfolioId - Portfolio ID to delete
   * @throws Error if portfolio not found
   */
  async deletePortfolio(portfolioId: string): Promise<void> {
    // Delete portfolio (cascade will handle holdings and transactions)
    await this.prisma.portfolio.delete({
      where: { id: portfolioId },
    })
  }

  /**
   * Get all holdings for a portfolio
   * 
   * @param portfolioId - Portfolio ID
   * @returns Array of holdings with quantity > 0
   */
  async getHoldings(portfolioId: string): Promise<Holding[]> {
    const holdings = await this.prisma.holding.findMany({
      where: {
        portfolioId,
        quantity: { gt: 0 },
      },
      orderBy: { symbol: 'asc' },
    })

    return holdings
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}
