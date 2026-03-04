'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Decimal } from 'decimal.js'
import PieChart from '@/components/charts/PieChart'
import LineChart from '@/components/charts/LineChart'
import BarChart from '@/components/charts/BarChart'
import DashboardNewsWidget from '@/components/news/DashboardNewsWidget'
import RealizedPLCard from '@/components/portfolio/RealizedPLCard'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface Portfolio {
  id: string
  name: string
  userId: string
  createdAt: string
  updatedAt: string
}

interface Holding {
  id: string
  portfolioId: string
  symbol: string
  quantity: string
  averageCost: string
  createdAt: string
  updatedAt: string
}

interface PortfolioSummary {
  totalCost: Decimal
  totalValue: Decimal
  unrealizedPL: Decimal
  returnRate: Decimal
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [allHoldings, setAllHoldings] = useState<Holding[]>([])
  const [currentPrices, setCurrentPrices] = useState<Record<string, Decimal>>({})
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated and fetch data
    const fetchData = async () => {
      try {
        // Check authentication
        const authResponse = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        })
        
        if (!authResponse.ok) {
          router.push('/login')
          return
        }

        const authData = await authResponse.json()
        setUser(authData.user)

        // Fetch all portfolios
        const portfoliosResponse = await fetch('/api/portfolios')
        if (!portfoliosResponse.ok) {
          throw new Error('Failed to fetch portfolios')
        }
        const portfoliosData = await portfoliosResponse.json()
        setPortfolios(portfoliosData.portfolios)

        // Fetch holdings for all portfolios
        const holdingsPromises = portfoliosData.portfolios.map((p: Portfolio) =>
          fetch(`/api/portfolios/${p.id}/holdings`).then(res => res.json())
        )
        const holdingsResults = await Promise.all(holdingsPromises)
        const allHoldingsData = holdingsResults.flatMap(result => result.holdings)
        setAllHoldings(allHoldingsData)

        // Fetch current prices for all unique symbols
        const uniqueSymbols = [...new Set(allHoldingsData.map((h: Holding) => h.symbol))]
        const prices: Record<string, Decimal> = {}
        
        for (const symbol of uniqueSymbols) {
          try {
            const priceResponse = await fetch(`/api/stocks/${symbol}/price`)
            if (priceResponse.ok) {
              const priceData = await priceResponse.json()
              prices[symbol] = new Decimal(priceData.price)
            }
          } catch (err) {
            console.warn(`Failed to fetch price for ${symbol}:`, err)
          }
        }
        setCurrentPrices(prices)

        // Calculate summary
        calculateSummary(allHoldingsData, prices)
      } catch (error) {
        console.error('Error fetching data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const calculateSummary = (holdings: Holding[], prices: Record<string, Decimal>) => {
    let totalCost = new Decimal(0)
    let totalValue = new Decimal(0)
    let unrealizedPL = new Decimal(0)

    for (const holding of holdings) {
      const quantity = new Decimal(holding.quantity)
      const averageCost = new Decimal(holding.averageCost)
      const cost = quantity.times(averageCost)
      totalCost = totalCost.plus(cost)

      const currentPrice = prices[holding.symbol]
      if (currentPrice) {
        const value = quantity.times(currentPrice)
        totalValue = totalValue.plus(value)
        
        const pl = currentPrice.minus(averageCost).times(quantity)
        unrealizedPL = unrealizedPL.plus(pl)
      } else {
        // If no current price, use cost as value
        totalValue = totalValue.plus(cost)
      }
    }

    const returnRate = totalCost.isZero() 
      ? new Decimal(0) 
      : unrealizedPL.div(totalCost).times(100)

    setSummary({
      totalCost,
      totalValue,
      unrealizedPL,
      returnRate,
    })
  }

  const formatNumber = (value: Decimal, decimals: number = 2): string => {
    return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const getPLColorClass = (pl: Decimal): string => {
    if (pl.isPositive()) return 'text-green-600'
    if (pl.isNegative()) return 'text-red-600'
    return 'text-gray-900'
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-300">載入中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                股市投資組合管理系統
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <ThemeToggle />
              <button
                onClick={() => router.push('/portfolios')}
                className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                投資組合
              </button>
              <button
                onClick={() => router.push('/technical-analysis')}
                className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                技術分析
              </button>
              <span className="hidden md:inline text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Welcome Section */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              投資組合總覽
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 truncate">
              歡迎回來，{user?.email}
            </p>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Total Assets */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">總資產</h3>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white break-all">
                  ${formatNumber(summary.totalValue)}
                </p>
              </div>

              {/* Total Cost */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">總成本</h3>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white break-all">
                  ${formatNumber(summary.totalCost)}
                </p>
              </div>

              {/* Unrealized P&L */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">未實現損益</h3>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${getPLColorClass(summary.unrealizedPL)} break-all`}>
                  ${formatNumber(summary.unrealizedPL)}
                </p>
              </div>

              {/* Return Rate */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">報酬率</h3>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${getPLColorClass(summary.returnRate)} break-all`}>
                  {formatNumber(summary.returnRate)}%
                </p>
              </div>
            </div>
          )}

          {/* Technical Analysis Quick Access */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow p-4 sm:p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">技術指標分析</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-4">
                  使用專業技術指標分析股票走勢，包含 RSI、MACD、布林通道、費波那契等工具
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push('/technical-analysis')}
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-purple-600 dark:bg-purple-500 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600"
                  >
                    技術分析
                  </button>
                  <button
                    onClick={() => router.push('/fibonacci-tool')}
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-600 rounded-md hover:bg-purple-50 dark:hover:bg-gray-700"
                  >
                    費波那契工具
                  </button>
                  <button
                    onClick={() => router.push('/strategy-builder')}
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-600 rounded-md hover:bg-purple-50 dark:hover:bg-gray-700"
                  >
                    策略建立器
                  </button>
                </div>
              </div>
              <svg className="hidden sm:block w-12 h-12 text-purple-400 dark:text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>

          {/* Dashboard News */}
          <DashboardNewsWidget />

          {/* Portfolio List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">我的投資組合</h3>
                <button
                  onClick={() => router.push('/portfolios')}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  管理投資組合
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {portfolios.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4">您還沒有建立任何投資組合</p>
                  <button
                    onClick={() => router.push('/portfolios')}
                    className="text-sm sm:text-base text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                  >
                    立即建立 →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {portfolios.map((portfolio) => {
                    const portfolioHoldings = allHoldings.filter(h => h.portfolioId === portfolio.id)
                    const holdingsCount = portfolioHoldings.length
                    
                    return (
                      <div
                        key={portfolio.id}
                        onClick={() => router.push(`/portfolios/${portfolio.id}`)}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition cursor-pointer bg-white dark:bg-gray-700"
                      >
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">{portfolio.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {holdingsCount} 檔持股
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Charts Section */}
          {allHoldings.length > 0 && Object.keys(currentPrices).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Realized P&L Card */}
              <RealizedPLCard className="lg:col-span-2" />

              {/* Market Value Distribution Pie Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-4 sm:p-6">
                <PieChart
                  data={allHoldings
                    .filter(h => currentPrices[h.symbol])
                    .map(h => {
                      const quantity = new Decimal(h.quantity)
                      const currentPrice = currentPrices[h.symbol]
                      const marketValue = quantity.times(currentPrice).toNumber()
                      
                      // Calculate percentage
                      const totalMarketValue = allHoldings
                        .filter(holding => currentPrices[holding.symbol])
                        .reduce((sum, holding) => {
                          const qty = new Decimal(holding.quantity)
                          const price = currentPrices[holding.symbol]
                          return sum.plus(qty.times(price))
                        }, new Decimal(0))
                      
                      const percentage = totalMarketValue.isZero()
                        ? 0
                        : new Decimal(marketValue).div(totalMarketValue).times(100).toNumber()
                      
                      return {
                        name: h.symbol,
                        value: marketValue,
                        percentage,
                      }
                    })}
                  title="持股市值佔比"
                />
              </div>

              {/* P&L Distribution Bar Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-4 sm:p-6">
                <BarChart
                  data={allHoldings
                    .filter(h => currentPrices[h.symbol])
                    .map(h => {
                      const quantity = new Decimal(h.quantity)
                      const averageCost = new Decimal(h.averageCost)
                      const currentPrice = currentPrices[h.symbol]
                      const pl = currentPrice.minus(averageCost).times(quantity).toNumber()
                      
                      return {
                        name: h.symbol,
                        value: pl,
                      }
                    })}
                  title="各持股損益分布"
                  yAxisLabel="損益 (TWD)"
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
