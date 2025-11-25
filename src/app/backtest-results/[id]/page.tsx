'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import IndicatorChart from '@/components/charts/IndicatorChart'
import { Loading } from '@/components/ui/Loading'

interface Trade {
  date: string
  type: 'BUY' | 'SELL'
  price: number
  quantity: number
  profit?: number
  profitPercent?: number
}

interface BacktestResult {
  id: string
  strategyId: string
  strategyName: string
  startDate: string
  endDate: string
  totalTrades: number
  winRate: number
  avgReturn: number
  maxDrawdown: number
  totalReturn: number
  sharpeRatio?: number
  trades: Trade[]
  equityCurve: Array<{ date: string; equity: number }>
  createdAt: string
}

export default function BacktestResultsPage() {
  const params = useParams()
  const router = useRouter()
  const strategyId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null)
  const [strategy, setStrategy] = useState<any>(null)

  // Backtest parameters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [initialCapital, setInitialCapital] = useState(100000)
  const [symbol, setSymbol] = useState('2330')

  useEffect(() => {
    if (strategyId) {
      fetchStrategy()
    }
  }, [strategyId])

  const fetchStrategy = async () => {
    try {
      const response = await fetch(`/api/strategies/${strategyId}`)
      if (!response.ok) {
        throw new Error('無法載入策略資訊')
      }
      const data = await response.json()
      setStrategy(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入策略時發生錯誤')
      console.error('Error fetching strategy:', err)
    }
  }

  const runBacktest = async () => {
    if (!startDate || !endDate) {
      setError('請選擇回測日期範圍')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/strategies/${strategyId}/backtest?startDate=${startDate}&endDate=${endDate}&symbol=${symbol}&initialCapital=${initialCapital}`
      )

      if (!response.ok) {
        throw new Error('回測執行失敗')
      }

      const data = await response.json()
      setBacktestResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '回測時發生錯誤')
      console.error('Error running backtest:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportResults = () => {
    if (!backtestResult) return

    const csvContent = [
      ['回測報告'],
      ['策略名稱', backtestResult.strategyName],
      ['回測期間', `${backtestResult.startDate} 至 ${backtestResult.endDate}`],
      [''],
      ['績效統計'],
      ['總交易次數', backtestResult.totalTrades],
      ['勝率', `${backtestResult.winRate.toFixed(2)}%`],
      ['平均報酬', `${backtestResult.avgReturn.toFixed(2)}%`],
      ['最大回撤', `${backtestResult.maxDrawdown.toFixed(2)}%`],
      ['總報酬', `${backtestResult.totalReturn.toFixed(2)}%`],
      [''],
      ['交易記錄'],
      ['日期', '類型', '價格', '數量', '損益', '損益%'],
      ...backtestResult.trades.map((trade) => [
        trade.date,
        trade.type,
        trade.price.toFixed(2),
        trade.quantity.toString(),
        trade.profit?.toFixed(2) || '',
        trade.profitPercent?.toFixed(2) || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `backtest_${backtestResult.strategyName}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getPerformanceColor = (value: number): string => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getPerformanceLabel = (winRate: number): { label: string; color: string } => {
    if (winRate >= 60) return { label: '優秀', color: 'bg-green-100 text-green-700' }
    if (winRate >= 50) return { label: '良好', color: 'bg-blue-100 text-blue-700' }
    if (winRate >= 40) return { label: '普通', color: 'bg-yellow-100 text-yellow-700' }
    return { label: '需改進', color: 'bg-red-100 text-red-700' }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/strategy-builder')}
              className="text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1"
            >
              ← 返回策略列表
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">策略回測</h1>
            {strategy && <p className="text-gray-600">策略：{strategy.name}</p>}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Backtest Parameters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">回測參數設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">股票代號</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="例如：2330"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">初始資金</label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={runBacktest}
              disabled={loading || !startDate || !endDate}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '執行中...' : '執行回測'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loading />
          </div>
        )}

        {/* Backtest Results */}
        {backtestResult && !loading && (
          <div className="space-y-6">
            {/* Performance Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">績效統計</h2>
                <button
                  onClick={exportResults}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  📥 匯出報告
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600 mb-1">總交易次數</div>
                  <div className="text-2xl font-bold text-gray-800">{backtestResult.totalTrades}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600 mb-1">勝率</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-gray-800">{backtestResult.winRate.toFixed(1)}%</div>
                    <span className={`text-xs px-2 py-1 rounded ${getPerformanceLabel(backtestResult.winRate).color}`}>
                      {getPerformanceLabel(backtestResult.winRate).label}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600 mb-1">平均報酬</div>
                  <div className={`text-2xl font-bold ${getPerformanceColor(backtestResult.avgReturn)}`}>
                    {backtestResult.avgReturn.toFixed(2)}%
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600 mb-1">最大回撤</div>
                  <div className={`text-2xl font-bold ${getPerformanceColor(-backtestResult.maxDrawdown)}`}>
                    {backtestResult.maxDrawdown.toFixed(2)}%
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600 mb-1">總報酬</div>
                  <div className={`text-2xl font-bold ${getPerformanceColor(backtestResult.totalReturn)}`}>
                    {backtestResult.totalReturn.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Equity Curve */}
            {backtestResult.equityCurve && backtestResult.equityCurve.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">績效曲線</h2>
                <IndicatorChart
                  data={backtestResult.equityCurve}
                  type="line"
                  series={[{ key: 'equity', name: '資產淨值', color: '#3b82f6' }]}
                  height={300}
                  xAxisLabel="日期"
                  yAxisLabel="資產淨值"
                />
              </div>
            )}

            {/* Trade History */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">交易記錄 ({backtestResult.trades.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日期
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        類型
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        價格
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        數量
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        損益
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        損益%
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {backtestResult.trades.map((trade, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              trade.type === 'BUY'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {trade.type === 'BUY' ? '買入' : '賣出'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          ${trade.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {trade.quantity}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                            trade.profit ? getPerformanceColor(trade.profit) : 'text-gray-400'
                          }`}
                        >
                          {trade.profit ? `$${trade.profit.toFixed(2)}` : '-'}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                            trade.profitPercent ? getPerformanceColor(trade.profitPercent) : 'text-gray-400'
                          }`}
                        >
                          {trade.profitPercent ? `${trade.profitPercent.toFixed(2)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Analysis Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">分析建議</h2>
              <div className="space-y-3">
                {backtestResult.winRate >= 60 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700">
                      ✅ 策略勝率優秀（{backtestResult.winRate.toFixed(1)}%），顯示良好的訊號品質
                    </p>
                  </div>
                )}
                {backtestResult.winRate < 40 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">
                      ⚠️ 策略勝率偏低（{backtestResult.winRate.toFixed(1)}%），建議調整條件或參數
                    </p>
                  </div>
                )}
                {backtestResult.maxDrawdown > 20 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-700">
                      ⚠️ 最大回撤較大（{backtestResult.maxDrawdown.toFixed(2)}%），建議加入風險控制機制
                    </p>
                  </div>
                )}
                {backtestResult.totalTrades < 10 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      ℹ️ 交易次數較少（{backtestResult.totalTrades} 次），建議延長回測期間或調整條件以獲得更多樣本
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No Results Yet */}
        {!backtestResult && !loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">尚未執行回測</h3>
            <p className="text-gray-600">設定回測參數後點擊「執行回測」開始分析策略績效</p>
          </div>
        )}
      </div>
    </div>
  )
}
