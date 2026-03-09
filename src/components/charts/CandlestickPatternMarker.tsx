import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceDot,
} from 'recharts'

export interface CandleData {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export interface PatternMarker {
  date: string
  pattern: string
  signal: 'bullish' | 'bearish' | 'neutral'
  reliability: number
  atGoldenRatio: boolean
  description: string
}

export interface CandlestickPatternMarkerProps {
  data: CandleData[]
  patterns: PatternMarker[]
  title?: string
  height?: number
}

export default function CandlestickPatternMarker({
  data,
  patterns,
  title = 'K線型態識別',
  height = 450,
}: CandlestickPatternMarkerProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-white rounded-lg shadow p-6" style={{ height }}>
        <p className="text-gray-500">資料不足，無法顯示 K線圖表</p>
      </div>
    )
  }

  // Transform candle data for visualization
  const chartData = data.map((candle) => ({
    ...candle,
    candleColor: candle.close >= candle.open ? '#10b981' : '#ef4444',
    body: [Math.min(candle.open, candle.close), Math.max(candle.open, candle.close)],
    wick: [candle.low, candle.high],
  }))

  const getPatternIcon = (signal: string) => {
    switch (signal) {
      case 'bullish':
        return '🟢'
      case 'bearish':
        return '🔴'
      default:
        return '⚪'
    }
  }

  const getReliabilityColor = (reliability: number) => {
    if (reliability >= 80) return '#10b981'
    if (reliability >= 60) return '#f59e0b'
    return '#6b7280'
  }

  return (
    <div className="w-full bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {patterns.length > 0 && (
          <div className="text-sm text-gray-600">
            識別到 <span className="font-bold text-blue-600">{patterns.length}</span> 個型態
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" />
          <YAxis stroke="#6b7280" domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null

              const data = payload[0].payload
              const pattern = patterns.find((p) => p.date === data.date)

              return (
                <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                  <p className="font-semibold text-gray-800 mb-2">{data.date}</p>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-600">開:</span>{' '}
                      <span className="font-medium">{data.open.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">高:</span>{' '}
                      <span className="font-medium">{data.high.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">低:</span>{' '}
                      <span className="font-medium">{data.low.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">收:</span>{' '}
                      <span className={`font-medium ${data.close >= data.open ? 'text-green-600' : 'text-red-600'}`}>
                        {data.close.toFixed(2)}
                      </span>
                    </div>
                    {pattern && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="font-semibold text-blue-700">
                          {getPatternIcon(pattern.signal)} {pattern.pattern}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{pattern.description}</div>
                        <div className="text-xs mt-1">
                          <span className="text-gray-600">可靠度:</span>{' '}
                          <span
                            className="font-semibold"
                            style={{ color: getReliabilityColor(pattern.reliability) }}
                          >
                            {pattern.reliability}%
                          </span>
                        </div>
                        {pattern.atGoldenRatio && (
                          <div className="text-xs text-yellow-600 font-semibold mt-1">⭐ 位於黃金分割位</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            }}
          />
          <Legend />

          {/* Candlestick wicks (high-low) */}
          <Bar dataKey="wick" fill="transparent" stroke="#6b7280" strokeWidth={1} name="影線">
            {chartData.map((entry, index) => (
              <Cell key={`wick-${index}`} stroke="#6b7280" />
            ))}
          </Bar>

          {/* Candlestick bodies (open-close) */}
          <Bar dataKey="body" name="實體" radius={[2, 2, 2, 2]}>
            {chartData.map((entry, index) => (
              <Cell key={`body-${index}`} fill={entry.candleColor} />
            ))}
          </Bar>

          {/* Mark patterns with dots */}
          {patterns.map((pattern, index) => {
            const dataPoint = chartData.find((d) => d.date === pattern.date)
            if (!dataPoint) return null

            const yValue = dataPoint.high + (dataPoint.high - dataPoint.low) * 0.1

            return (
              <ReferenceDot
                key={index}
                x={pattern.date}
                y={yValue}
                r={pattern.atGoldenRatio ? 8 : 6}
                fill={pattern.signal === 'bullish' ? '#10b981' : pattern.signal === 'bearish' ? '#ef4444' : '#6b7280'}
                stroke={pattern.atGoldenRatio ? '#f59e0b' : 'none'}
                strokeWidth={pattern.atGoldenRatio ? 2 : 0}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Pattern list */}
      {patterns.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="font-semibold text-gray-800">識別的型態</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {patterns.map((pattern, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${
                  pattern.atGoldenRatio
                    ? 'border-yellow-400 bg-yellow-50'
                    : pattern.signal === 'bullish'
                      ? 'border-green-200 bg-green-50'
                      : pattern.signal === 'bearish'
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-semibold text-sm">
                    {getPatternIcon(pattern.signal)} {pattern.pattern}
                  </div>
                  <div className="text-xs text-gray-600">{pattern.date}</div>
                </div>
                <div className="text-xs text-gray-700 mb-1">{pattern.description}</div>
                <div className="flex justify-between items-center">
                  <div className="text-xs">
                    <span className="text-gray-600">可靠度:</span>{' '}
                    <span className="font-semibold" style={{ color: getReliabilityColor(pattern.reliability) }}>
                      {pattern.reliability}%
                    </span>
                  </div>
                  {pattern.atGoldenRatio && <div className="text-xs text-yellow-600 font-semibold">⭐ 黃金分割位</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 bg-green-50 border border-green-200 rounded">
          <div className="font-semibold text-green-700">🟢 看漲型態</div>
          <div className="text-green-600">錘子線、晨星、看漲吞噬</div>
        </div>
        <div className="p-2 bg-red-50 border border-red-200 rounded">
          <div className="font-semibold text-red-700">🔴 看跌型態</div>
          <div className="text-red-600">吊人線、暮星、看跌吞噬</div>
        </div>
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
          <div className="font-semibold text-yellow-700">⭐ 黃金分割位</div>
          <div className="text-yellow-600">型態出現在關鍵價位，訊號更強</div>
        </div>
      </div>
    </div>
  )
}
