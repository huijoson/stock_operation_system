/**
 * Shared helper for Prisma CLI wrappers (db-migrate.mjs, db-push.mjs).
 *
 * Handles TLS certificate issues (e.g. corporate proxies / self-signed certs):
 *   PRISMA_CA_CERT_PATH       – path to a PEM CA bundle; when set the file is
 *                                validated and NODE_EXTRA_CA_CERTS is set.
 *   PRISMA_ALLOW_INSECURE_TLS – set to "1" to disable TLS verification
 *                                (NODE_TLS_REJECT_UNAUTHORIZED=0). Use only when
 *                                no CA cert is available.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

/** Build extra env vars for prisma commands, applying TLS configuration. */
export function buildPrismaEnv() {
  const caCertPath = process.env.PRISMA_CA_CERT_PATH
  const allowInsecure = process.env.PRISMA_ALLOW_INSECURE_TLS === '1'

  const extraEnv = {}

  if (caCertPath) {
    const resolved = resolve(caCertPath)
    if (!existsSync(resolved)) {
      console.error(
        `\x1b[31m✖ PRISMA_CA_CERT_PATH is set but file not found: ${resolved}\x1b[0m`
      )
      process.exit(1)
    }
    console.log(`\x1b[36mℹ Using custom CA certificate: ${resolved}\x1b[0m`)
    extraEnv.NODE_EXTRA_CA_CERTS = resolved
  } else if (allowInsecure) {
    console.warn(
      '\x1b[33m' +
        '⚠ ──────────────────────────────────────────────────────────────\n' +
        '⚠  PRISMA_ALLOW_INSECURE_TLS=1 detected.\n' +
        '⚠  TLS certificate verification is DISABLED for this run.\n' +
        '⚠  This is insecure — use PRISMA_CA_CERT_PATH in production.\n' +
        '⚠ ──────────────────────────────────────────────────────────────' +
        '\x1b[0m'
    )
    extraEnv.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }

  return extraEnv
}

/**
 * Spawn `npx prisma <...args>` with the TLS env applied, inheriting stdio,
 * and exit the process with the child's exit code.
 *
 * @param {string[]} args - prisma subcommand + flags (e.g. ['db', 'push'])
 */
export function runPrisma(args) {
  const extraEnv = buildPrismaEnv()

  const child = spawn('npx', ['prisma', ...args], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...extraEnv },
  })

  child.on('close', (code) => {
    process.exit(code ?? 1)
  })
}
