'use client'

import { useEffect } from 'react'

const CHUNK_RELOAD_KEY = 'chunk-reload-attempted'
const CHUNK_RELOAD_MAX_AGE_MS = 10_000

/**
 * Detect chunk / dynamic-import load failures from error events.
 */
function isChunkError(message: string): boolean {
  return (
    /ChunkLoadError/i.test(message) ||
    /loading chunk [\w-]+ failed/i.test(message) ||
    /failed to fetch dynamically imported module/i.test(message) ||
    /loading css chunk [\w-]+ failed/i.test(message)
  )
}

/**
 * Attempt a single auto-reload, guarded by sessionStorage
 * to prevent infinite reload loops.
 */
function attemptRecoveryReload(): void {
  try {
    const prev = sessionStorage.getItem(CHUNK_RELOAD_KEY)
    const now = Date.now()

    if (!prev || now - Number(prev) > CHUNK_RELOAD_MAX_AGE_MS) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
      window.location.reload()
    }
  } catch {
    // sessionStorage unavailable — no-op
  }
}

/**
 * Global listener for chunk load failures that occur *outside*
 * React's error boundary (e.g. Next.js route navigations, prefetch).
 * Mount once in the root layout alongside <ErrorBoundary>.
 */
export function ChunkErrorRecovery(): null {
  useEffect(() => {
    const onError = (event: ErrorEvent): void => {
      if (isChunkError(event.message ?? '')) {
        attemptRecoveryReload()
      }
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const msg =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason ?? '')
      if (isChunkError(msg)) {
        attemptRecoveryReload()
      }
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  return null
}
