'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import HoldingTable from '@/components/portfolio/HoldingTable'
import ExportButton from '@/components/transactions/ExportButton'
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
  const router = useRouter()
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-500">載入中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
          <button
            onClick={() => router.push('/portfolios')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ← 返回投資組合列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.push('/portfolios')}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center text-sm sm:text-base"
          >
            ← 返回投資組合列表
          </button>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
                {portfolio?.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                建立時間：{portfolio && new Date(portfolio.createdAt).toLocaleDateString('zh-TW')}
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => router.push(`/transactions/${portfolioId}`)}
                className="flex-1 sm:flex-none bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
              >
                查看交易記錄
              </button>
            </div>
          </div>
        </div>

        {/* Holdings Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">持股明細</h2>
            <ExportButton
              portfolioId={portfolioId}
              type="holdings"
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
            />
          </div>
          <HoldingTable holdings={holdings} currentPrices={currentPrices} />
        </div>

        {/* Summary Section */}
        {holdings.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">投資組合摘要</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">持股種類</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{holdings.length}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">總持股數量</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {holdings.reduce((sum, h) => sum + parseFloat(h.quantity), 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">總成本</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 break-all">
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
