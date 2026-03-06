import { useState } from 'react'

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

      // Determine the API endpoint
      const endpoint = type === 'transactions' 
        ? `/api/transactions/export?portfolioId=${portfolioId}`
        : `/api/holdings/export?portfolioId=${portfolioId}`

      // Fetch the CSV file
      const response = await fetch(endpoint)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // Get the CSV content
      const csvContent = await response.text()

      // Create a blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
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
    } catch (err) {
      console.error('Export error:', err)
      setError(err instanceof Error ? err.message : 'Export failed')
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
