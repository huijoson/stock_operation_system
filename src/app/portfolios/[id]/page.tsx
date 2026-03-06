import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HoldingTable from '@/components/portfolio/HoldingTable'
import ExportButton from '@/components/transactions/ExportButton'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Decimal } from 'decimal.js'

interface Holding {
  id: string
  portfolioId: string
  symbol: string
  quantity: string
  averageCost: string
  createdAt: string
  updatedAt: string
}

interface Portfolio {
  id: string
  name: string
  userId: string
  createdAt: string
  updatedAt: string
}

export default function PortfolioDetailPage() {
  const navigate = useNavigate()
  const params = useParams()
  const portfolioId = params.id as string

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [currentPrices, setCurrentPrices] = useState<Record<string, Decimal>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch portfolio details
        const portfolioResponse = await fetch(`/api/portfolios/${portfolioId}`)
        if (!portfolioResponse.ok) {
          throw new Error('Failed to fetch portfolio')
        }
        const portfolioData = await portfolioResponse.json()
        setPortfolio(portfolioData.portfolio)

        // Fetch holdings
        const holdingsResponse = await fetch(`/api/portfolios/${portfolioId}/holdings`)
        if (!holdingsResponse.ok) {
          throw new Error('Failed to fetch holdings')
        }
        const holdingsData = await holdingsResponse.json()
        setHoldings(holdingsData.holdings)

        // Fetch current prices for all holdings
        const prices: Record<string, Decimal> = {}
        for (const holding of holdingsData.holdings) {
          try {
            const priceResponse = await fetch(`/api/stocks/${holding.symbol}/price`)
            if (priceResponse.ok) {
              const priceData = await priceResponse.json()
              prices[holding.symbol] = new Decimal(priceData.price)
            }
          } catch (err) {
            console.warn(`Failed to fetch price for ${holding.symbol}:`, err)
          }
        }
        setCurrentPrices(prices)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (portfolioId) {
      fetchData()
    }
  }, [portfolioId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">載入中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={() => navigate('/portfolios')}
            className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            ← 返回投資組合列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => navigate('/portfolios')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 inline-flex items-center text-sm sm:text-base"
            >
              ← 返回投資組合列表
            </button>
            <ThemeToggle />
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">
                {portfolio?.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                建立時間：{portfolio && new Date(portfolio.createdAt).toLocaleDateString('zh-TW')}
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate('/technical-analysis')}
                className="flex-1 sm:flex-none bg-purple-600 dark:bg-purple-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition text-sm sm:text-base"
              >
                技術分析
              </button>
              <button
                onClick={() => navigate(`/transactions/${portfolioId}`)}
                className="flex-1 sm:flex-none bg-blue-600 dark:bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition text-sm sm:text-base"
              >
                交易記錄
              </button>
            </div>
          </div>
        </div>

        {/* Holdings Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">持股明細</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">點擊「持股明細」可查看 Finnhub 新聞與詳細資訊</p>
            </div>
            <ExportButton
              portfolioId={portfolioId}
              type="holdings"
              className="w-full sm:w-auto bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600"
            />
          </div>
          <HoldingTable holdings={holdings} currentPrices={currentPrices} />
        </div>

        {/* Summary Section */}
        {holdings.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-transparent dark:border-gray-700 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">投資組合摘要</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">持股種類</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{holdings.length}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">總持股數量</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {holdings.reduce((sum, h) => sum + parseFloat(h.quantity), 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">總成本</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-all">
                  ${holdings.reduce((sum, h) => {
                    const quantity = parseFloat(h.quantity)
                    const cost = parseFloat(h.averageCost)
                    return sum + (quantity * cost)
                  }, 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
