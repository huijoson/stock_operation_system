import { useState, useEffect } from 'react'
import StockSearchBar from '@/components/stocks/StockSearchBar'
import FibonacciDrawingTool, { FibonacciLevel } from '@/components/charts/FibonacciDrawingTool'
import { Loading } from '@/components/ui/Loading'

interface FibonacciCalculation {
  type: 'retracement' | 'extension'
  levels: FibonacciLevel[]
  timestamp: Date
}

export default function FibonacciToolPage() {
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null)
  const [priceData, setPriceData] = useState<any[]>([])
  const [currentPrice, setCurrentPrice] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUptrend, setIsUptrend] = useState(true)
  const [calculations, setCalculations] = useState<FibonacciCalculation[]>([])

  // Fetch price data when stock is selected
  useEffect(() => {
    if (selectedStock) {
      fetchPriceData()
    }
  }, [selectedStock])

  const fetchPriceData = async () => {
    if (!selectedStock) return

    setLoading(true)
    setError(null)

    try {
      // Fetch historical price data
      const historyResponse = await fetch(`/api/stocks/${selectedStock.symbol}/history?days=90`)
      if (!historyResponse.ok) {
        throw new Error('無法載入歷史價格資料')
      }
      const historyData = await historyResponse.json()

      // Transform data for chart
      const chartData = historyData.map((item: any) => ({
        date: new Date(item.date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
        price: item.close,
        high: item.high,
        low: item.low,
      }))

      setPriceData(chartData)

      // Fetch current price
      const priceResponse = await fetch(`/api/stocks/${selectedStock.symbol}/price`)
      if (priceResponse.ok) {
        const priceData = await priceResponse.json()
        setCurrentPrice(priceData.price)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入資料時發生錯誤')
      console.error('Error fetching price data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStockSelect = (stock: any) => {
    setSelectedStock({ symbol: stock.symbol, name: stock.name })
    setPriceData([])
    setCurrentPrice(undefined)
    setCalculations([])
  }

  const handleLevelsCalculated = (levels: FibonacciLevel[]) => {
    const calculation: FibonacciCalculation = {
      type: levels.length <= 7 ? 'retracement' : 'extension',
      levels,
      timestamp: new Date(),
    }
    setCalculations((prev) => [calculation, ...prev].slice(0, 5)) // Keep last 5 calculations
  }

  const calculateRetracementManually = async () => {
    if (!selectedStock || priceData.length === 0) return

    try {
      // Get high and low from price data
      const prices = priceData.map((d) => d.price)
      const high = Math.max(...prices)
      const low = Math.min(...prices)

      const response = await fetch(
        `/api/indicators/fibonacci/retracement?high=${high}&low=${low}&isUptrend=${isUptrend}`
      )

      if (!response.ok) {
        throw new Error('計算回撤水平失敗')
      }

      const data = await response.json()
      handleLevelsCalculated(data.levels)
    } catch (err) {
      setError(err instanceof Error ? err.message : '計算失敗')
    }
  }

  const calculateExtensionManually = async () => {
    if (!selectedStock || priceData.length === 0) return

    try {
      // Use first, middle, and last prices as example
      const start = priceData[0].price
      const retracement = priceData[Math.floor(priceData.length / 2)].price
      const breakout = priceData[priceData.length - 1].price

      const response = await fetch(
        `/api/indicators/fibonacci/extension?start=${start}&retracement=${retracement}&breakout=${breakout}`
      )

      if (!response.ok) {
        throw new Error('計算擴展目標失敗')
      }

      const data = await response.json()
      handleLevelsCalculated(data.levels)
    } catch (err) {
      setError(err instanceof Error ? err.message : '計算失敗')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">費波那契分析工具</h1>
          <p className="text-gray-600">使用黃金分割比例識別潛在的支撐壓力位和價格目標</p>
        </div>

        {/* Stock Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <StockSearchBar onSelect={handleStockSelect} placeholder="搜尋股票代號或名稱..." />
            </div>
            {selectedStock && (
              <button
                onClick={fetchPriceData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                🔄 重新整理
              </button>
            )}
          </div>

          {selectedStock && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-blue-600">已選擇股票</div>
                  <div className="text-lg font-bold text-blue-900">
                    {selectedStock.symbol} - {selectedStock.name}
                  </div>
                  {currentPrice && (
                    <div className="text-sm text-blue-700 mt-1">目前價格: ${currentPrice.toFixed(2)}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loading />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* No Stock Selected */}
        {!selectedStock && !loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📐</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">請選擇股票</h3>
            <p className="text-gray-600">使用上方搜尋欄選擇股票以開始費波那契分析</p>
          </div>
        )}

        {/* Fibonacci Drawing Tool */}
        {selectedStock && !loading && priceData.length > 0 && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">快速計算</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={calculateRetracementManually}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  自動計算回撤水平
                </button>
                <button
                  onClick={calculateExtensionManually}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  自動計算擴展目標
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-md cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUptrend}
                    onChange={(e) => setIsUptrend(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">上升趨勢模式</span>
                </label>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                或使用下方互動式工具手動選擇價格點來繪製費波那契線
              </p>
            </div>

            {/* Interactive Drawing Tool */}
            <FibonacciDrawingTool
              data={priceData}
              currentPrice={currentPrice}
              onLevelsCalculated={handleLevelsCalculated}
              height={500}
            />

            {/* Calculation History */}
            {calculations.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">計算歷史</h3>
                <div className="space-y-4">
                  {calculations.map((calc, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-md">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold text-white ${
                              calc.type === 'retracement' ? 'bg-blue-600' : 'bg-green-600'
                            }`}
                          >
                            {calc.type === 'retracement' ? '回撤水平' : '擴展目標'}
                          </span>
                          <span className="ml-2 text-sm text-gray-600">
                            {calc.timestamp.toLocaleString('zh-TW')}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {calc.levels.map((level, levelIndex) => (
                          <div key={levelIndex} className="p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="text-xs text-gray-600">{level.label}</div>
                            <div className="font-semibold text-gray-800">${level.price.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fibonacci Guide */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">費波那契使用指南</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-semibold text-blue-800 mb-2">回撤水平 (Retracement)</h4>
                  <p className="text-sm text-blue-700 mb-2">用於識別價格回調時的潛在支撐或壓力位</p>
                  <ul className="text-sm text-blue-600 space-y-1">
                    <li>• 選擇明顯的高點和低點</li>
                    <li>• 上升趨勢：從低點到高點</li>
                    <li>• 下降趨勢：從高點到低點</li>
                    <li>• 關鍵水平：38.2%, 50%, 61.8%</li>
                  </ul>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-semibold text-green-800 mb-2">擴展目標 (Extension)</h4>
                  <p className="text-sm text-green-700 mb-2">用於預測價格突破後的潛在目標位</p>
                  <ul className="text-sm text-green-600 space-y-1">
                    <li>• 需要三個點：起點、回撤點、突破點</li>
                    <li>• 計算突破後的延伸目標</li>
                    <li>• 關鍵目標：100%, 161.8%, 261.8%</li>
                    <li>• 用於設定獲利目標</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h4 className="font-semibold text-yellow-800 mb-2">💡 使用技巧</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 費波那契水平不是絕對的支撐壓力，而是潛在的反轉區域</li>
                  <li>• 結合其他技術指標（RSI、MACD）提高準確度</li>
                  <li>• 多個時間週期的費波那契水平重疊處更為重要</li>
                  <li>• 價格接近費波那契水平時（誤差 2% 內）需特別關注</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
