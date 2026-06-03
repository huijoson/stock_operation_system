#!/usr/bin/env node
/**
 * Cross-platform, NON-INTERACTIVE wrapper for `prisma db push` that handles
 * TLS certificate issues (e.g. corporate proxies / self-signed certs).
 *
 * This is the preferred way to sync schema changes to the database in this
 * project, because `prisma/migrations` is gitignored (schema-first workflow)
 * and `prisma migrate dev` fails in non-interactive shells.
 *
 * When a change adds a column/constraint that Prisma flags as potential data
 * loss, append --accept-data-loss (safe for additive nullable columns):
 *
 *   npm run db:push                       # plain sync
 *   npm run db:push -- --accept-data-loss # when adding columns/constraints
 *   npm run db:push:accept                # same as above (convenience)
 *
 * Environment variables:
 *   PRISMA_CA_CERT_PATH       – path to a PEM CA bundle.
 *   PRISMA_ALLOW_INSECURE_TLS – set to "1" to disable TLS verification.
 */

import { runPrisma } from './prisma-run.mjs'

runPrisma(['db', 'push', ...process.argv.slice(2)])
