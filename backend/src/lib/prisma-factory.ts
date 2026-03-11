import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './prisma-client'

export function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required for Prisma client initialization')
  }

  const adapter = new PrismaPg({ connectionString })

  return new PrismaClient({ adapter })
}
