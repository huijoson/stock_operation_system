import React, { Component, ErrorInfo, ReactNode } from 'react'

const CHUNK_RELOAD_KEY = 'chunk-reload-attempted'
const CHUNK_RELOAD_MAX_AGE_MS = 10_000 // 10 seconds guard window

/**
 * Detect webpack / Next.js chunk load failures
 */
function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    /loading chunk [\w-]+ failed/i.test(error.message) ||
    /failed to fetch dynamically imported module/i.test(error.message)
  )
}

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * Error Boundary component to catch and handle React errors.
 * Includes automatic single-reload recovery for ChunkLoadError
 * with a sessionStorage guard to prevent infinite reload loops.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console or error reporting service
    console.error('Error Boundary caught an error:', error, errorInfo)

    // Auto-reload once for chunk load failures (e.g. after a new deployment)
    if (isChunkLoadError(error) && typeof window !== 'undefined') {
      try {
        const prev = sessionStorage.getItem(CHUNK_RELOAD_KEY)
        const now = Date.now()

        if (!prev || now - Number(prev) > CHUNK_RELOAD_MAX_AGE_MS) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
          window.location.reload()
          return
        }
        // Already reloaded recently — fall through to show error UI
      } catch {
        // sessionStorage unavailable (e.g. private browsing) — fall through
      }
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">
              發生錯誤
            </h2>
            <p className="mt-2 text-sm text-center text-gray-600">
              很抱歉，應用程式發生了一些問題。請重新整理頁面或稍後再試。
            </p>
            {import.meta.env.DEV && this.state.error && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-auto">
                <p className="font-semibold">錯誤訊息：</p>
                <p className="mt-1">{this.state.error.message}</p>
                {this.state.error.stack && (
                  <>
                    <p className="font-semibold mt-2">堆疊追蹤：</p>
                    <pre className="mt-1 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </>
                )}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                重新整理頁面
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                重試
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
