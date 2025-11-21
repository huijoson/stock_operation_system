'use client'

import { useState, useEffect } from 'react'

interface Transaction {
  id: string
  portfolioId: string
  symbol: string
  type: string
  quantity: string
  price: string
  date: string
}

interface EditTransactionDialogProps {
  transaction: Transaction | null
  onClose: () => void
  onSave: (id: string, data: {
    type: 'BUY' | 'SELL'
    quantity: number
    price: number
    date: string
  }) => Promise<void>
}

export default function EditTransactionDialog({ transaction, onClose, onSave }: EditTransactionDialogProps) {
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (transaction) {
      setType(transaction.type as 'BUY' | 'SELL')
      setQuantity(transaction.quantity)
      setPrice(transaction.price)
      setDate(transaction.date.split('T')[0])
    }
  }, [transaction])

  if (!transaction) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const quantityNum = parseFloat(quantity)
    const priceNum = parseFloat(price)

    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError('數量必須大於 0')
      return
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setError('價格必須大於 0')
      return
    }

    try {
      setLoading(true)
      await onSave(transaction.id, {
        type,
        quantity: quantityNum,
        price: priceNum,
        date,
      })
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">編輯交易記錄</h3>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              股票代號
            </label>
            <input
              type="text"
              value={transaction.symbol}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              交易類型 *
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as 'BUY' | 'SELL')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="BUY">買入</option>
              <option value="SELL">賣出</option>
            </select>
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              數量 *
            </label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
              step="0.000001"
              min="0"
              required
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              價格 *
            </label>
            <input
              type="number"
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              step="0.000001"
              min="0"
              required
            />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              交易日期 *
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
