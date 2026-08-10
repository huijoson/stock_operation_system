import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Fall back to a placeholder so `prisma generate` (run in `npm ci` postinstall)
// can load this config without a real database. Real DB operations (migrate /
// push / seed) still require DATABASE_URL to be set.
const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
})
