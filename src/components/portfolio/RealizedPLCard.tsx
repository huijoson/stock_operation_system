'use client'

import { useState, useEffect } from 'react'

interface RealizedPLData {
  totalRealizedPL: string
  shortTermPL: string
  longTermPL: string
  periodStart: string
  periodEnd: string
}

interface RealizedPLCardProps {
  portfolioId?: string
  className?: string
}

type TimePeriod = 'month' | 'quarter' | 'year' | 'all'

const periodLabels: Record<TimePeriod, string> = {
  month: '本月',
  quarter: '本季',
  year: '本年',
  all: '全部'
}

export default function RealizedPLCard({ portfolioId, className = '' }: RealizedPLCardProps) {
  const [data, setData] = useState<RealizedPLData | null>(null)
  const [period, setPeriod] = useState<TimePeriod>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [period, portfolioId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const url = portfolioId
        ? `/api/realized-pl/portfolio/${portfolioId}?period=${period}`
        : `/api/realized-pl?period=${period}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('無法載入已實現損益資料')
      }

      const result = await response.json()
      setData(result)
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
          <div className="h-12 bg-gray-200 rounded w-1/2"></div>
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

  if (!data) {
    return null
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">已實現損益</h3>
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

      <div className="mb-6">
        <div className="text-sm text-gray-500 mb-2">總損益</div>
        <div className={`text-3xl font-bold ${getColorClass(data.totalRealizedPL)}`}>
          {formatCurrency(data.totalRealizedPL)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded p-4">
          <div className="text-xs text-gray-500 mb-1">短期損益 (≤1年)</div>
          <div className={`text-lg font-semibold ${getColorClass(data.shortTermPL)}`}>
            {formatCurrency(data.shortTermPL)}
          </div>
        </div>

        <div className="bg-gray-50 rounded p-4">
          <div className="text-xs text-gray-500 mb-1">長期損益 (&gt;1年)</div>
          <div className={`text-lg font-semibold ${getColorClass(data.longTermPL)}`}>
            {formatCurrency(data.longTermPL)}
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        期間：{new Date(data.periodStart).toLocaleDateString('zh-TW')} -{' '}
        {new Date(data.periodEnd).toLocaleDateString('zh-TW')}
      </div>
    </div>
  )
}
