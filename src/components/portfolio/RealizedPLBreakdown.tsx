'use client'

import { useState, useEffect } from 'react'

interface SymbolBreakdown {
  symbol: string
  totalPL: string
  tradeCount: number
}

interface RealizedPLRecord {
  id: string
  symbol: string
  saleDate: string
  sharesSold: string
  costBasis: string
  saleProceeds: string
  realizedPL: string
  holdingPeriod: 'SHORT' | 'LONG'
}

interface RealizedPLBreakdownProps {
  portfolioId: string
  className?: string
}

type TimePeriod = 'month' | 'quarter' | 'year' | 'all'

const periodLabels: Record<TimePeriod, string> = {
  month: '本月',
  quarter: '本季',
  year: '本年',
  all: '全部'
}

export default function RealizedPLBreakdown({ portfolioId, className = '' }: RealizedPLBreakdownProps) {
  const [symbolBreakdown, setSymbolBreakdown] = useState<SymbolBreakdown[]>([])
  const [records, setRecords] = useState<RealizedPLRecord[]>([])
  const [period, setPeriod] = useState<TimePeriod>('all')
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [period, selectedSymbol, portfolioId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const url = selectedSymbol
        ? `/api/realized-pl/portfolio/${portfolioId}?period=${period}&symbol=${selectedSymbol}`
        : `/api/realized-pl/portfolio/${portfolioId}?period=${period}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('無法載入損益明細')
      }

      const result = await response.json()
      setSymbolBreakdown(result.symbolBreakdown || [])
      setRecords(result.records || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
    const sign = num >= 0 ? '+' : ''
    return `${sign}$${num.toFixed(2)}`
  }

  const getColorClass = (value: string) => {
    const num = parseFloat(value)
    if (num > 0) return 'text-green-600'
    if (num < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">損益明細</h3>
          <div className="flex gap-2">
            {(Object.keys(periodLabels) as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded text-sm ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {symbolBreakdown.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedSymbol(null)}
              className={`px-3 py-1 rounded text-sm ${
                selectedSymbol === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {symbolBreakdown.map((item) => (
              <button
                key={item.symbol}
                onClick={() => setSelectedSymbol(item.symbol)}
                className={`px-3 py-1 rounded text-sm ${
                  selectedSymbol === item.symbol
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {item.symbol} ({item.tradeCount})
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        {records.length === 0 ? (
          <div className="p-6 text-center text-gray-500">此期間無已實現損益記錄</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  股票
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  賣出股數
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  成本
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  收入
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  損益
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  持有期間
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.saleDate).toLocaleDateString('zh-TW')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {parseFloat(record.sharesSold).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ${parseFloat(record.costBasis).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ${parseFloat(record.saleProceeds).toFixed(2)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${getColorClass(record.realizedPL)}`}>
                    {formatCurrency(record.realizedPL)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        record.holdingPeriod === 'LONG'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {record.holdingPeriod === 'LONG' ? '長期' : '短期'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
