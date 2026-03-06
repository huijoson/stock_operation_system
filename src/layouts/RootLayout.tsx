import { Outlet } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ChunkErrorRecovery } from '@/components/ui/ChunkErrorRecovery'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { ThemeProvider } from '@/components/ui/ThemeProvider'

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ChunkErrorRecovery />
        <Outlet />
        <ToastProvider />
      </ErrorBoundary>
    </ThemeProvider>
  )
}
