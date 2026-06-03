#!/usr/bin/env node
/**
 * Cross-platform wrapper for `prisma migrate dev` that handles
 * TLS certificate issues (e.g. corporate proxies / self-signed certs).
 *
 * NOTE: `prisma migrate dev` is INTERACTIVE and will fail in non-interactive
 * shells (CI, Claude Code `!`, piped runs) with
 * "environment is non-interactive". This project gitignores prisma/migrations,
 * so for everyday dev schema sync prefer `npm run db:push` (see scripts/db-push.mjs).
 *
 * Environment variables:
 *   PRISMA_CA_CERT_PATH       – path to a PEM CA bundle.
 *   PRISMA_ALLOW_INSECURE_TLS – set to "1" to disable TLS verification.
 *
 * Any extra CLI arguments are forwarded to `prisma migrate dev`.
 *
 * Usage:
 *   node scripts/db-migrate.mjs                       # plain run (interactive)
 *   node scripts/db-migrate.mjs --name add_column     # with migration name
 */

import { runPrisma } from './prisma-run.mjs'

runPrisma(['migrate', 'dev', ...process.argv.slice(2)])
