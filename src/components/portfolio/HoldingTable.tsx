import { Decimal } from 'decimal.js'
import { useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'

interface Holding {
  id: string
  portfolioId: string
  symbol: string
  quantity: string | Decimal
  averageCost: string | Decimal
  createdAt: string | Date
  updatedAt: string | Date
}

interface HoldingTableProps {
  holdings: Holding[]
  currentPrices?: Record<string, Decimal>
}

type SortKey = 'symbol' | 'quantity' | 'averageCost' | 'totalCost' | 'currentPrice' | 'unrealizedPL' | 'plPercentage'
type SortDirection = 'asc' | 'desc'

export default function HoldingTable({ holdings, currentPrices = {} }: HoldingTableProps) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('symbol')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Calculate total cost for a holding
  const calculateTotalCost = (holding: Holding): string => {
    const quantity = new Decimal(holding.quantity.toString())
    const averageCost = new Decimal(holding.averageCost.toString())
    const totalCost = quantity.times(averageCost)
    return totalCost.toFixed(2)
  }

  // Calculate unrealized P&L for a holding
  const calculateUnrealizedPL = (holding: Holding): Decimal | null => {
    const currentPrice = currentPrices[holding.symbol]
    if (!currentPrice) {
      return null
    }
    
    const quantity = new Decimal(holding.quantity.toString())
    const averageCost = new Decimal(holding.averageCost.toString())
    
    // (currentPrice - averageCost) * quantity
    return currentPrice.minus(averageCost).times(quantity)
  }

  // Calculate P&L percentage
  const calculatePLPercentage = (holding: Holding): Decimal | null => {
    const currentPrice = currentPrices[holding.symbol]
    if (!currentPrice) {
      return null
    }
    
    const averageCost = new Decimal(holding.averageCost.toString())
    
    if (averageCost.isZero()) {
      return null
    }
    
    // ((currentPrice - averageCost) / averageCost) * 100
    return currentPrice.minus(averageCost).div(averageCost).times(100)
  }

  // Format number with thousand separators
  const formatNumber = (value: string | Decimal, decimals: number = 2): string => {
    const num = new Decimal(value.toString())
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  // Get color class based on P&L value
  const getPLColorClass = (pl: Decimal | null): string => {
    if (!pl) return 'text-gray-500 dark:text-gray-400'
    if (pl.isPositive()) return 'text-green-600 dark:text-green-400'
    if (pl.isNegative()) return 'text-red-600 dark:text-red-400'
    return 'text-gray-900 dark:text-white'
  }

  const getSortValue = (holding: Holding, key: SortKey): string | Decimal => {
    switch (key) {
      case 'symbol':
        return holding.symbol
      case 'quantity':
        return new Decimal(holding.quantity.toString())
      case 'averageCost':
        return new Decimal(holding.averageCost.toString())
      case 'totalCost':
        return new Decimal(holding.quantity.toString()).times(new Decimal(holding.averageCost.toString()))
      case 'currentPrice':
        return currentPrices[holding.symbol] ?? new Decimal(-Infinity)
      case 'unrealizedPL':
        return calculateUnrealizedPL(holding) ?? new Decimal(-Infinity)
      case 'plPercentage':
        return calculatePLPercentage(holding) ?? new Decimal(-Infinity)
    }
  }

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const aVal = getSortValue(a, sortKey)
      const bVal = getSortValue(b, sortKey)
      let cmp: number
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal)
      } else {
        cmp = new Decimal(aVal.toString()).comparedTo(new Decimal(bVal.toString()))
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [holdings, currentPrices, sortKey, sortDirection])

  const handleSort = (key: SortKey): void => {
    if (key === sortKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const renderSortIndicator = (key: SortKey): string => {
    if (sortKey !== key) return ''
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  if (holdings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">目前沒有持股記錄</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">請先新增交易記錄以建立持股</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop/Tablet Table View */}
      <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {([
                  { key: 'symbol' as SortKey, label: '股票代號', align: 'text-left' },
                  { key: 'quantity' as SortKey, label: '持股數量', align: 'text-right' },
                  { key: 'averageCost' as SortKey, label: '平均成本', align: 'text-right' },
                  { key: 'totalCost' as SortKey, label: '總成本', align: 'text-right' },
                  { key: 'currentPrice' as SortKey, label: '目前價格', align: 'text-right' },
                  { key: 'unrealizedPL' as SortKey, label: '未實現損益', align: 'text-right' },
                  { key: 'plPercentage' as SortKey, label: '報酬率', align: 'text-right' },
                ]).map(({ key, label, align }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`px-4 lg:px-6 py-3 ${align} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors`}
                  >
                    {label}{renderSortIndicator(key)}
                  </th>
                ))}
                <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedHoldings.map((holding) => {
                const unrealizedPL = calculateUnrealizedPL(holding)
                const plPercentage = calculatePLPercentage(holding)
                const currentPrice = currentPrices[holding.symbol]
                
                return (
                  <tr key={holding.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {holding.symbol}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900 dark:text-gray-300">
                        {formatNumber(holding.quantity, 4)}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900 dark:text-gray-300">
                        ${formatNumber(holding.averageCost)}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        ${formatNumber(calculateTotalCost(holding))}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900 dark:text-gray-300">
                        {currentPrice ? `${formatNumber(currentPrice)}` : '-'}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                      <div className={`text-sm font-medium ${getPLColorClass(unrealizedPL)}`}>
                        {unrealizedPL ? `${formatNumber(unrealizedPL)}` : '-'}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right">
                      <div className={`text-sm font-medium ${getPLColorClass(plPercentage)}`}>
                        {plPercentage ? `${formatNumber(plPercentage)}%` : '-'}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-center space-x-2">
                      <button
                        onClick={() => navigate(`/portfolios/${holding.portfolioId}/holdings/${holding.symbol}`)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium"
                        title="查看持股明細與新聞"
                      >
                        持股明細
                      </button>
                      <button
                        onClick={() => navigate(`/technical-analysis?symbol=${holding.symbol}`)}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-xs font-medium"
                        title="查看技術分析"
                      >
                        技術分析
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-4">
        {sortedHoldings.map((holding) => {
          const unrealizedPL = calculateUnrealizedPL(holding)
          const plPercentage = calculatePLPercentage(holding)
          const currentPrice = currentPrices[holding.symbol]
          
          return (
            <div key={holding.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{holding.symbol}</h3>
                  <button
                    onClick={() => navigate(`/portfolios/${holding.portfolioId}/holdings/${holding.symbol}`)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium"
                    title="查看持股明細與新聞"
                  >
                    📰
                  </button>
                  <button
                    onClick={() => navigate(`/technical-analysis?symbol=${holding.symbol}`)}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-xs font-medium"
                    title="查看技術分析"
                  >
                    📊
                  </button>
                </div>
                {plPercentage && (
                  <span className={`text-sm font-semibold ${getPLColorClass(plPercentage)}`}>
                    {formatNumber(plPercentage)}%
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">持股數量</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatNumber(holding.quantity, 4)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">平均成本</p>
                  <p className="font-medium text-gray-900 dark:text-white">${formatNumber(holding.averageCost)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">總成本</p>
                  <p className="font-medium text-gray-900 dark:text-white">${formatNumber(calculateTotalCost(holding))}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">目前價格</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {currentPrice ? `${formatNumber(currentPrice)}` : '-'}
                  </p>
                </div>
              </div>
              
              {unrealizedPL && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">未實現損益</span>
                    <span className={`text-base font-bold ${getPLColorClass(unrealizedPL)}`}>
                      ${formatNumber(unrealizedPL)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
