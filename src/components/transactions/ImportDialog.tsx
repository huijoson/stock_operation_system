import { useState } from 'react'
import { TransactionApi } from '@/services/transaction.api'

interface ImportDialogProps {
  portfolioId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ImportDialog({ portfolioId, onClose, onSuccess }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<'schwab' | 'firstrade'>('schwab')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    successCount: number
    errorCount: number
    skippedCount: number
    errors: Array<{ row: number; message: string }>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
      setError(null)
    }
  }

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await TransactionApi.importCsv<{
        successCount: number
        errorCount: number
        skippedCount: number
        errors: Array<{ row: number; message: string }>
      }>(file, format, portfolioId)

      setResult(data)
      
      // If successful, call onSuccess after a short delay
      if (data.successCount > 0) {
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">匯入交易記錄</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CSV 格式
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'schwab' | 'firstrade')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="schwab">Schwab</option>
              <option value="firstrade">Firstrade</option>
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              選擇 CSV 檔案
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="w-full bg-blue-500 dark:bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? '匯入中...' : '開始匯入'}
          </button>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Import Result */}
          {result && (
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded">
                <p className="font-semibold">匯入完成</p>
                <p>成功: {result.successCount} 筆</p>
                <p>跳過: {result.skippedCount} 筆</p>
                <p>錯誤: {result.errorCount} 筆</p>
              </div>

              {/* Error Details */}
              {result.errors.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded">
                  <p className="font-semibold mb-2">錯誤詳情:</p>
                  <ul className="list-disc list-inside space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((err, index) => (
                      <li key={index} className="text-sm">
                        第 {err.row} 行: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
