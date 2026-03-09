import './globals.css'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ChunkErrorRecovery } from '@/components/ui/ChunkErrorRecovery'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { ThemeProvider } from '@/components/ui/ThemeProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ChunkErrorRecovery />
        {children}
        <ToastProvider />
      </ErrorBoundary>
    </ThemeProvider>
  )
}
