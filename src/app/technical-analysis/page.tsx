'use client'

import { useState, useEffect } from 'react'
import StockSearchBar from '@/components/stocks/StockSearchBar'
import RSIIndicator from '@/components/charts/RSIIndicator'
import MACDIndicator from '@/components/charts/MACDIndicator'
import BollingerBandsChart from '@/components/charts/BollingerBandsChart'
import TechnicalScoreCard from '@/components/charts/TechnicalScoreCard'
import CandlestickPatternMarker from '@/components/charts/CandlestickPatternMarker'
import SupportResistanceLines from '@/components/charts/SupportResistanceLines'
import IndicatorChart from '@/components/charts/IndicatorChart'
import { Loading } from '@/components/ui/Loading'

interface IndicatorSettings {
  rsi: { enabled: boolean; period: number }
  macd: { enabled: boolean; fastPeriod: number; slowPeriod: number; signalPeriod: number }
  bollinger: { enabled: boolean; period: number; stdDev: number }
  atr: { enabled: boolean; period: number }
  technicalScore: { enabled: boolean }
  candlestickPatterns: { enabled: boolean }
  supportResistance: { enabled: boolean }
}

export default function TechnicalAnalysisPage() {
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Indicator data states
  const [rsiData, setRsiData] = useState<any>(null)
  const [macdData, setMacdData] = useState<any>(null)
  const [bollingerData, setBollingerData] = useState<any>(null)
  const [atrData, setAtrData] = useState<any>(null)
  const [technicalScore, setTechnicalScore] = useState<any>(null)
  const [candlestickPatterns, setCandlestickPatterns] = useState<any>(null)
  const [supportResistance, setSupportResistance] = useState<any>(null)

  // Indicator settings
  const [settings, setSettings] = useState<IndicatorSettings>({
    rsi: { enabled: true, period: 14 },
    macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    bollinger: { enabled: true, period: 20, stdDev: 2 },
    atr: { enabled: true, period: 14 },
    technicalScore: { enabled: true },
    candlestickPatterns: { enabled: true },
    supportResistance: { enabled: true },
  })

  const [showSettings, setShowSettings] = useState(false)

  // Fetch all indicators when stock is selected
  useEffect(() => {
    if (selectedStock) {
      fetchAllIndicators()
    }
  }, [selectedStock])

  const fetchAllIndicators = async () => {
    if (!selectedStock) return

    setLoading(true)
    setError(null)

    try {
      const promises = []

      // Fetch RSI
      if (settings.rsi.enabled) {
        promises.push(
          fetch(`/api/indicators/rsi?symbol=${selectedStock.symbol}&period=${settings.rsi.period}`)
            .then((res) => res.json())
            .then((data) => setRsiData(data))
            .catch((err) => console.error('RSI fetch error:', err))
        )
      }

      // Fetch MACD
      if (settings.macd.enabled) {
        promises.push(
          fetch(
            `/api/indicators/macd?symbol=${selectedStock.symbol}&fastPeriod=${settings.macd.fastPeriod}&slowPeriod=${settings.macd.slowPeriod}&signalPeriod=${settings.macd.signalPeriod}`
          )
            .then((res) => res.json())
            .then((data) => setMacdData(data))
            .catch((err) => console.error('MACD fetch error:', err))
        )
      }

      // Fetch Bollinger Bands
      if (settings.bollinger.enabled) {
        promises.push(
          fetch(
            `/api/indicators/bollinger?symbol=${selectedStock.symbol}&period=${settings.bollinger.period}&stdDev=${settings.bollinger.stdDev}`
          )
            .then((res) => res.json())
            .then((data) => setBollingerData(data))
            .catch((err) => console.error('Bollinger fetch error:', err))
        )
      }

      // Fetch ATR
      if (settings.atr.enabled) {
        promises.push(
          fetch(`/api/indicators/atr?symbol=${selectedStock.symbol}&period=${settings.atr.period}`)
            .then((res) => res.json())
            .then((data) => setAtrData(data))
            .catch((err) => console.error('ATR fetch error:', err))
        )
      }

      // Fetch Technical Score
      if (settings.technicalScore.enabled) {
        promises.push(
          fetch(`/api/indicators/technical-score?symbol=${selectedStock.symbol}`)
            .then((res) => res.json())
            .then((data) => setTechnicalScore(data))
            .catch((err) => console.error('Technical Score fetch error:', err))
        )
      }

      // Fetch Candlestick Patterns
      if (settings.candlestickPatterns.enabled) {
        promises.push(
          fetch(`/api/indicators/candlestick-patterns?symbol=${selectedStock.symbol}`)
            .then((res) => res.json())
            .then((data) => setCandlestickPatterns(data))
            .catch((err) => console.error('Candlestick Patterns fetch error:', err))
        )
      }

      // Fetch Support/Resistance
      if (settings.supportResistance.enabled) {
        promises.push(
          fetch(`/api/indicators/support-resistance?symbol=${selectedStock.symbol}`)
            .then((res) => res.json())
            .then((data) => setSupportResistance(data))
            .catch((err) => console.error('Support/Resistance fetch error:', err))
        )
      }

      await Promise.all(promises)
    } catch (err) {
      setError('載入技術指標時發生錯誤')
      console.error('Error fetching indicators:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStockSelect = (stock: any) => {
    setSelectedStock({ symbol: stock.symbol, name: stock.name })
    // Reset all data
    setRsiData(null)
    setMacdData(null)
    setBollingerData(null)
    setAtrData(null)
    setTechnicalScore(null)
    setCandlestickPatterns(null)
    setSupportResistance(null)
  }

  const toggleIndicator = (indicator: keyof IndicatorSettings) => {
    setSettings((prev) => ({
      ...prev,
      [indicator]: { ...prev[indicator], enabled: !prev[indicator].enabled },
    }))
  }

  const updateIndicatorSetting = (indicator: keyof IndicatorSettings, key: string, value: number) => {
    setSettings((prev) => ({
      ...prev,
      [indicator]: { ...prev[indicator], [key]: value },
    }))
  }

  const handleRefresh = () => {
    fetchAllIndicators()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="text-gray-600 hover:text-gray-900"
              >
                ← 返回儀表板
              </button>
              <h1 className="text-xl font-bold text-gray-900">技術分析</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/portfolios'}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                投資組合
              </button>
              <button
                onClick={() => window.location.href = '/fibonacci-tool'}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                費波那契工具
              </button>
              <button
                onClick={() => window.location.href = '/strategy-builder'}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                策略建立器
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">完整技術指標分析</h2>
          <p className="text-gray-600">選擇股票查看完整的技術指標分析</p>
        </div>

        {/* Stock Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <StockSearchBar onSelect={handleStockSelect} placeholder="搜尋股票代號或名稱..." />
            </div>
            {selectedStock && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  ⚙️ 設定
                </button>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  disabled={loading}
                >
                  🔄 重新整理
                </button>
              </div>
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
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && selectedStock && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">指標設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* RSI Settings */}
              <div className="p-4 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium text-gray-700">RSI</label>
                  <input
                    type="checkbox"
                    checked={settings.rsi.enabled}
                    onChange={() => toggleIndicator('rsi')}
                    className="w-4 h-4"
                  />
                </div>
                {settings.rsi.enabled && (
                  <div>
                    <label className="text-sm text-gray-600">週期</label>
                    <input
                      type="number"
                      value={settings.rsi.period}
                      onChange={(e) => updateIndicatorSetting('rsi', 'period', parseInt(e.target.value))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                    />
                  </div>
                )}
              </div>

              {/* MACD Settings */}
              <div className="p-4 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium text-gray-700">MACD</label>
                  <input
                    type="checkbox"
                    checked={settings.macd.enabled}
                    onChange={() => toggleIndicator('macd')}
                    className="w-4 h-4"
                  />
                </div>
                {settings.macd.enabled && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm text-gray-600">快線週期</label>
                      <input
                        type="number"
                        value={settings.macd.fastPeriod}
                        onChange={(e) => updateIndicatorSetting('macd', 'fastPeriod', parseInt(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">慢線週期</label>
                      <input
                        type="number"
                        value={settings.macd.slowPeriod}
                        onChange={(e) => updateIndicatorSetting('macd', 'slowPeriod', parseInt(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bollinger Bands Settings */}
              <div className="p-4 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium text-gray-700">布林通道</label>
                  <input
                    type="checkbox"
                    checked={settings.bollinger.enabled}
                    onChange={() => toggleIndicator('bollinger')}
                    className="w-4 h-4"
                  />
                </div>
                {settings.bollinger.enabled && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm text-gray-600">週期</label>
                      <input
                        type="number"
                        value={settings.bollinger.period}
                        onChange={(e) => updateIndicatorSetting('bollinger', 'period', parseInt(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">標準差倍數</label>
                      <input
                        type="number"
                        value={settings.bollinger.stdDev}
                        onChange={(e) => updateIndicatorSetting('bollinger', 'stdDev', parseInt(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                        step="0.1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ATR Settings */}
              <div className="p-4 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium text-gray-700">ATR</label>
                  <input
                    type="checkbox"
                    checked={settings.atr.enabled}
                    onChange={() => toggleIndicator('atr')}
                    className="w-4 h-4"
                  />
                </div>
                {settings.atr.enabled && (
                  <div>
                    <label className="text-sm text-gray-600">週期</label>
                    <input
                      type="number"
                      value={settings.atr.period}
                      onChange={(e) => updateIndicatorSetting('atr', 'period', parseInt(e.target.value))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                    />
                  </div>
                )}
              </div>

              {/* Other Indicators */}
              <div className="p-4 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium text-gray-700">技術評分</label>
                  <input
                    type="checkbox"
                    checked={settings.technicalScore.enabled}
                    onChange={() => toggleIndicator('technicalScore')}
                    className="w-4 h-4"
                  />
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium text-gray-700">K線型態</label>
                  <input
                    type="checkbox"
                    checked={settings.candlestickPatterns.enabled}
                    onChange={() => toggleIndicator('candlestickPatterns')}
                    className="w-4 h-4"
                  />
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium text-gray-700">支撐壓力位</label>
                  <input
                    type="checkbox"
                    checked={settings.supportResistance.enabled}
                    onChange={() => toggleIndicator('supportResistance')}
                    className="w-4 h-4"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                套用設定
              </button>
            </div>
          </div>
        )}

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
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">請選擇股票</h3>
            <p className="text-gray-600">使用上方搜尋欄選擇股票以查看技術指標分析</p>
          </div>
        )}

        {/* Indicators Display */}
        {selectedStock && !loading && (
          <div className="space-y-6">
            {/* Technical Score Card */}
            {settings.technicalScore.enabled && technicalScore && (
              <TechnicalScoreCard currentScore={technicalScore} history={technicalScore.history} />
            )}

            {/* RSI Indicator */}
            {settings.rsi.enabled && rsiData && (
              <RSIIndicator data={rsiData.history} divergences={rsiData.divergences} />
            )}

            {/* MACD Indicator */}
            {settings.macd.enabled && macdData && (
              <MACDIndicator
                data={macdData.history}
                crossovers={macdData.crossovers}
              />
            )}

            {/* Bollinger Bands */}
            {settings.bollinger.enabled && bollingerData && (
              <BollingerBandsChart
                data={bollingerData.history}
                squeezeThreshold={bollingerData.squeezeThreshold}
                expansionThreshold={bollingerData.expansionThreshold}
              />
            )}

            {/* ATR Indicator */}
            {settings.atr.enabled && atrData && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">ATR 波動性指標</h3>
                <IndicatorChart
                  data={atrData.history}
                  type="line"
                  series={[{ key: 'value', name: 'ATR', color: '#3b82f6' }]}
                  height={300}
                />
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-md">
                    <div className="text-sm text-gray-600">目前 ATR</div>
                    <div className="text-xl font-bold text-gray-800">{Number(atrData.value).toFixed(2)}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <div className="text-sm text-gray-600">波動性狀態</div>
                    <div className="text-xl font-bold text-gray-800">{atrData.volatilityStatus}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <div className="text-sm text-gray-600">建議止損距離</div>
                    <div className="text-xl font-bold text-gray-800">
                      {atrData.suggestedStopLoss ? Number(atrData.suggestedStopLoss).toFixed(2) : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Candlestick Patterns */}
            {settings.candlestickPatterns.enabled && candlestickPatterns && candlestickPatterns.patterns && (
              <CandlestickPatternMarker
                data={candlestickPatterns.priceData || []}
                patterns={candlestickPatterns.patterns}
              />
            )}

            {/* Support/Resistance */}
            {settings.supportResistance.enabled && supportResistance && (
              <SupportResistanceLines
                data={supportResistance.priceData || []}
                supports={supportResistance.supports || []}
                resistances={supportResistance.resistances || []}
                currentPrice={supportResistance.currentPrice}
                nearestSupport={supportResistance.nearestSupport}
                nearestResistance={supportResistance.nearestResistance}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
