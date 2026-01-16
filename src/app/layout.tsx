import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { ThemeProvider } from '@/components/ui/ThemeProvider'

export const metadata: Metadata = {
  title: '股市投資組合管理系統',
  description: '追蹤、管理和分析股票投資組合',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>
        <ThemeProvider>
          <ErrorBoundary>
            {children}
            <ToastProvider />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
