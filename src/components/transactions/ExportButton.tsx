import { useState } from 'react'
import { TransactionApi } from '@/services/transaction.api'
import { PortfolioApi } from '@/services/portfolio.api'

interface ExportButtonProps {
  portfolioId: string
  type: 'transactions' | 'holdings'
  label?: string
  className?: string
}

/**
 * ExportButton component for exporting transactions or holdings to CSV
 */
export default function ExportButton({
  portfolioId,
  type,
  label,
  className = '',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setError(null)

      // Fetch the CSV blob via API wrapper
      const blob = type === 'transactions'
        ? await TransactionApi.exportCsv(portfolioId)
        : await PortfolioApi.exportHoldingsCsv(portfolioId)

      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Set filename
      const filename = type === 'transactions'
        ? `transactions-${portfolioId}-${new Date().toISOString().split('T')[0]}.csv`
        : `holdings-${portfolioId}-${new Date().toISOString().split('T')[0]}.csv`
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Export error:', err)
      setError(err.response?.data?.error || err.message || 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const defaultLabel = type === 'transactions' ? '匯出交易記錄' : '匯出持股資料'

  return (
    <div className="inline-block">
      <button
        onClick={handleExport}
        disabled={isExporting}
        className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {isExporting ? '匯出中...' : label || defaultLabel}
      </button>
      
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  )
}
