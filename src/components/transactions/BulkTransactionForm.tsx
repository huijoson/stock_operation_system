import { useState } from 'react'
import { getYesterdayDateString } from '@/lib/utils/date-filters'
import { TransactionApi } from '@/services/transaction.api'

interface TransactionRow {
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: string
  price: string
  date: string
  error?: string
}

interface BulkTransactionFormProps {
  portfolioId: string
  onSuccess: () => void
  onCancel: () => void
}

function emptyRow(): TransactionRow {
  return { symbol: '', type: 'BUY', quantity: '', price: '', date: getYesterdayDateString() }
}

export default function BulkTransactionForm({ portfolioId, onSuccess, onCancel }: BulkTransactionFormProps) {
  const [rows, setRows] = useState<TransactionRow[]>([emptyRow()])
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const updateRow = (index: number, field: keyof TransactionRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value, error: undefined } : r)))
    setSuccessMessage(null)
    setGlobalError(null)
  }

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow()])
    setSuccessMessage(null)
  }

  const removeRow = (index: number) => {
    if (rows.length <= 1) return
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const validate = (): boolean => {
    let valid = true
    const updated = rows.map((row) => {
      if (!row.symbol.trim()) {
        valid = false
        return { ...row, error: '請輸入股票代號' }
      }
      const qty = parseFloat(row.quantity)
      if (isNaN(qty) || qty <= 0) {
        valid = false
        return { ...row, error: '數量必須大於 0' }
      }
      const prc = parseFloat(row.price)
      if (isNaN(prc) || prc <= 0) {
        valid = false
        return { ...row, error: '價格必須大於 0' }
      }
      if (!row.date) {
        valid = false
        return { ...row, error: '請選擇日期' }
      }
      return row
    })
    setRows(updated)
    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    setGlobalError(null)

    if (!validate()) return

    try {
      setLoading(true)
      const payload = {
        portfolioId,
        transactions: rows.map((r) => ({
          symbol: r.symbol.trim().toUpperCase(),
          type: r.type,
          quantity: parseFloat(r.quantity),
          price: parseFloat(r.price),
          date: r.date,
        })),
      }
      await TransactionApi.createBulk(payload)
      setRows([emptyRow()])
      setSuccessMessage(`成功新增 ${payload.transactions.length} 筆交易`)
      onSuccess()
    } catch (err: any) {
      setGlobalError(err.response?.data?.error || err.message || '新增失敗')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
  const selectCls = inputCls

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">批次新增交易記錄</h3>

      {globalError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4 text-sm">
          {globalError}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-4 text-sm">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 pr-2 font-medium">股票代號 *</th>
                <th className="pb-2 pr-2 font-medium">類型 *</th>
                <th className="pb-2 pr-2 font-medium">數量 *</th>
                <th className="pb-2 pr-2 font-medium">價格 *</th>
                <th className="pb-2 pr-2 font-medium">日期 *</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={`align-top ${row.error ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                  <td className="pr-2 py-1.5">
                    <input
                      type="text"
                      value={row.symbol}
                      onChange={(e) => updateRow(i, 'symbol', e.target.value)}
                      className={inputCls}
                      placeholder="例：2330"
                    />
                    {row.error && <p className="text-red-500 dark:text-red-400 text-xs mt-0.5">{row.error}</p>}
                  </td>
                  <td className="pr-2 py-1.5">
                    <select
                      value={row.type}
                      onChange={(e) => updateRow(i, 'type', e.target.value)}
                      className={selectCls}
                    >
                      <option value="BUY">買入</option>
                      <option value="SELL">賣出</option>
                    </select>
                  </td>
                  <td className="pr-2 py-1.5">
                    <input
                      type="number"
                      value={row.quantity}
                      onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                      className={inputCls}
                      placeholder="0"
                      step="0.000001"
                      min="0"
                    />
                  </td>
                  <td className="pr-2 py-1.5">
                    <input
                      type="number"
                      value={row.price}
                      onChange={(e) => updateRow(i, 'price', e.target.value)}
                      className={inputCls}
                      placeholder="0.00"
                      step="0.000001"
                      min="0"
                    />
                  </td>
                  <td className="pr-2 py-1.5">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(i, 'date', e.target.value)}
                      className={inputCls}
                    />
                  </td>
                  <td className="py-1.5">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={rows.length <= 1}
                      className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed px-1"
                      title="移除此列"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={addRow}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            + 新增一列
          </button>
        </div>

        <div className="flex justify-end space-x-3 pt-5 mt-2 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
            disabled={loading}
          >
            取消
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 text-sm"
            disabled={loading}
          >
            {loading ? '處理中...' : `一次新增 ${rows.length} 筆`}
          </button>
        </div>
      </form>
    </div>
  )
}
