/**
 * @jest-environment node
 */
import { prisma } from '../prisma'

describe('Prisma Database Connection', () => {
  it('should export a prisma client', () => {
    expect(prisma).toBeDefined()
    expect(typeof prisma.$connect).toBe('function')
    expect(typeof prisma.$disconnect).toBe('function')
  })

  it('should be a singleton instance', async () => {
    const importedModule = await import('../prisma')
    const prisma2 = importedModule.prisma
    expect(prisma).toBe(prisma2)
  })

  it('should have all expected models', () => {
    expect(prisma.user).toBeDefined()
    expect(prisma.session).toBeDefined()
    expect(prisma.portfolio).toBeDefined()
    expect(prisma.holding).toBeDefined()
    expect(prisma.transaction).toBeDefined()
    expect(prisma.stock).toBeDefined()
    expect(prisma.stockPrice).toBeDefined()
  })
})
