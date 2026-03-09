import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { ThemeProvider } from '@/components/ui/ThemeProvider'

/**
 * Root application shell.
 * Route definitions will be added by the routing migration agent.
 */
export function App(): React.ReactElement {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div>
          <h1>股市投資組合管理系統</h1>
          <p>路由遷移進行中…</p>
        </div>
        <ToastProvider />
      </ErrorBoundary>
    </ThemeProvider>
  )
}
