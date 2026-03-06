import { useState, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'

export interface PriceDataPoint {
  date: string
  price: number
  high?: number
  low?: number
}

export interface FibonacciLevel {
  ratio: number
  price: number
  label: string
}

export interface FibonacciDrawingToolProps {
  data: PriceDataPoint[]
  currentPrice?: number
  onLevelsCalculated?: (levels: FibonacciLevel[]) => void
  height?: number
}

type DrawingMode = 'retracement' | 'extension' | null

export default function FibonacciDrawingTool({
  data,
  currentPrice,
  onLevelsCalculated,
  height = 500,
}: FibonacciDrawingToolProps) {
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null)
  const [selectedPoints, setSelectedPoints] = useState<number[]>([])
  const [fibLevels, setFibLevels] = useState<FibonacciLevel[]>([])
  const [isUptrend, setIsUptrend] = useState(true)

  const FIBONACCI_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0]
  const EXTENSION_RATIOS = [1.0, 1.618, 2.618]

  const handleChartClick = (e: any) => {
    if (!drawingMode || !e || !e.activePayload) return

    const clickedPrice = e.activePayload[0].payload.price

    if (drawingMode === 'retracement' && selectedPoints.length < 2) {
      const newPoints = [...selectedPoints, clickedPrice]
      setSelectedPoints(newPoints)

      if (newPoints.length === 2) {
        calculateRetracementLevels(newPoints[0], newPoints[1])
      }
    } else if (drawingMode === 'extension' && selectedPoints.length < 3) {
      const newPoints = [...selectedPoints, clickedPrice]
      setSelectedPoints(newPoints)

      if (newPoints.length === 3) {
        calculateExtensionLevels(newPoints[0], newPoints[1], newPoints[2])
      }
    }
  }

  const calculateRetracementLevels = (point1: number, point2: number) => {
    const high = Math.max(point1, point2)
    const low = Math.min(point1, point2)
    const range = high - low

    const levels: FibonacciLevel[] = FIBONACCI_RATIOS.map((ratio) => ({
      ratio,
      price: isUptrend ? high - range * ratio : low + range * ratio,
      label: `${(ratio * 100).toFixed(1)}%`,
    }))

    setFibLevels(levels)
    if (onLevelsCalculated) {
      onLevelsCalculated(levels)
    }
  }

  const calculateExtensionLevels = (start: number, retracement: number, breakout: number) => {
    const range = Math.abs(start - retracement)
    const direction = breakout > retracement ? 1 : -1

    const levels: FibonacciLevel[] = EXTENSION_RATIOS.map((ratio) => ({
      ratio,
      price: breakout + direction * range * ratio,
      label: `${(ratio * 100).toFixed(1)}%`,
    }))

    setFibLevels(levels)
    if (onLevelsCalculated) {
      onLevelsCalculated(levels)
    }
  }

  const startRetracement = () => {
    setDrawingMode('retracement')
    setSelectedPoints([])
    setFibLevels([])
  }

  const startExtension = () => {
    setDrawingMode('extension')
    setSelectedPoints([])
    setFibLevels([])
  }

  const clearDrawing = () => {
    setDrawingMode(null)
    setSelectedPoints([])
    setFibLevels([])
  }

  const isNearLevel = (price: number, level: number, tolerance: number = 0.02): boolean => {
    return Math.abs(price - level) / level <= tolerance
  }

  const getFibLevelColor = (ratio: number): string => {
    const colors: { [key: number]: string } = {
      0: '#ef4444',
      0.236: '#f97316',
      0.382: '#f59e0b',
      0.5: '#10b981',
      0.618: '#3b82f6',
      0.786: '#8b5cf6',
      1.0: '#ef4444',
      1.618: '#06b6d4',
      2.618: '#ec4899',
    }
    return colors[ratio] || '#6b7280'
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-white rounded-lg shadow p-6" style={{ height }}>
        <p className="text-gray-500">資料不足，無法顯示圖表</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">費波那契繪圖工具</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={startRetracement}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              drawingMode === 'retracement'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            繪製回撤線 {drawingMode === 'retracement' && `(${selectedPoints.length}/2)`}
          </button>
          <button
            onClick={startExtension}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              drawingMode === 'extension'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            繪製擴展線 {drawingMode === 'extension' && `(${selectedPoints.length}/3)`}
          </button>
          <button
            onClick={clearDrawing}
            className="px-4 py-2 rounded-md font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
          >
            清除
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-md">
            <input
              type="checkbox"
              checked={isUptrend}
              onChange={(e) => setIsUptrend(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">上升趨勢</span>
          </label>
        </div>
        {drawingMode && (
          <p className="text-sm text-gray-600">
            {drawingMode === 'retracement'
              ? '點擊圖表選擇兩個點（高點和低點）來繪製回撤線'
              : '點擊圖表選擇三個點（起點、回撤點、突破點）來繪製擴展線'}
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} onClick={handleChartClick} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" />
          <YAxis stroke="#6b7280" domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
            formatter={(value: any) => Number(value).toFixed(2)}
          />
          <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} name="價格" />

          {/* Draw Fibonacci levels */}
          {fibLevels.map((level, index) => {
            const isNear = currentPrice ? isNearLevel(currentPrice, level.price) : false
            return (
              <ReferenceLine
                key={index}
                y={level.price}
                stroke={getFibLevelColor(level.ratio)}
                strokeWidth={isNear ? 3 : 1}
                strokeDasharray={isNear ? '5 5' : '3 3'}
                label={{
                  value: `${level.label} (${level.price.toFixed(2)})`,
                  position: 'right',
                  fill: getFibLevelColor(level.ratio),
                  fontSize: isNear ? 14 : 12,
                  fontWeight: isNear ? 'bold' : 'normal',
                }}
              />
            )
          })}

          {/* Highlight selected points */}
          {selectedPoints.map((point, index) => (
            <ReferenceLine
              key={`selected-${index}`}
              y={point}
              stroke="#10b981"
              strokeWidth={2}
              label={{
                value: `點 ${index + 1}`,
                position: 'left',
                fill: '#10b981',
                fontWeight: 'bold',
              }}
            />
          ))}

          {/* Highlight current price if near a level */}
          {currentPrice && (
            <ReferenceLine
              y={currentPrice}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: `目前價格: ${currentPrice.toFixed(2)}`,
                position: 'left',
                fill: '#ef4444',
                fontWeight: 'bold',
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Display calculated levels */}
      {fibLevels.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h4 className="font-semibold text-gray-800 mb-2">
            {drawingMode === 'retracement' ? '回撤水平' : '擴展目標'}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {fibLevels.map((level, index) => {
              const isNear = currentPrice ? isNearLevel(currentPrice, level.price) : false
              return (
                <div
                  key={index}
                  className={`p-2 rounded border ${
                    isNear ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                >
                  <div className="text-xs text-gray-600">{level.label}</div>
                  <div className={`font-semibold ${isNear ? 'text-red-600' : 'text-gray-800'}`}>
                    {level.price.toFixed(2)}
                  </div>
                  {isNear && <div className="text-xs text-red-600 mt-1">接近目前價格</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
