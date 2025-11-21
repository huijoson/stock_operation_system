'use client'

import { useState } from 'react'
import StockSearchBar from '@/components/stocks/StockSearchBar'

interface TransactionFormProps {
  portfolioId: string
  onSubmit: (transaction: {
    symbol: string
    type: 'BUY' | 'SELL'
    quantity: number
    price: number
    date: string
  }) => Promise<void>
  onCancel: () => void
}

export default function TransactionForm({ portfolioId, onSubmit, onCancel }: TransactionFormProps) {
  const [symbol, setSymbol] = useState('')
  const [stockName, setStockName] = useState('')
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useSearch, setUseSearch] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!symbol.trim()) {
      setError('請輸入股票代號')
      return
    }

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
      await onSubmit({
        symbol: symbol.trim().toUpperCase(),
        type,
        quantity: quantityNum,
        price: priceNum,
        date,
      })

      // Reset form
      setSymbol('')
      setStockName('')
      setQuantity('')
      setPrice('')
      setDate(new Date().toISOString().split('T')[0])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">新增交易記錄</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                股票代號 *
              </label>
              <button
                type="button"
                onClick={() => setUseSearch(!useSearch)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {useSearch ? '手動輸入' : '使用搜尋'}
              </button>
            </div>
            
            {useSearch ? (
              <div>
                <StockSearchBar
                  onSelect={(stock) => {
                    setSymbol(stock.symbol)
                    setStockName(stock.name)
                  }}
                  placeholder="搜尋股票代號或名稱..."
                />
                {symbol && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                    已選擇：<span className="font-semibold">{symbol}</span>
                    {stockName && <span className="text-gray-600"> - {stockName}</span>}
                  </div>
                )}
              </div>
            ) : (
              <input
                type="text"
                id="symbol"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value)
                  setStockName('')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：2330"
                required
              />
            )}
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
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
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
            {loading ? '處理中...' : '新增交易'}
          </button>
        </div>
      </form>
    </div>
  )
}
