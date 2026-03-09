import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'

export interface MACDDataPoint {
  date: string
  macd: number
  signal: number
  histogram: number
}

export interface Crossover {
  index: number
  date: string
  type: 'golden' | 'death'
  description: string
}

export interface MACDIndicatorProps {
  data: MACDDataPoint[]
  crossovers?: Crossover[]
  title?: string
  height?: number
}

export default function MACDIndicator({
  data,
  crossovers = [],
  title = 'MACD 指標',
  height = 350,
}: MACDIndicatorProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-white rounded-lg shadow p-6" style={{ height }}>
        <p className="text-gray-500">資料不足，無法顯示 MACD 圖表</p>
      </div>
    )
  }

  const currentData = data[data.length - 1]
  const currentSignal = currentData.macd > currentData.signal ? 'bullish' : 'bearish'
  const momentumStrengthening = currentData.histogram > 0 && data[data.length - 2]?.histogram < currentData.histogram

  return (
    <div className="w-full bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-gray-600">MACD:</span>
            <span className={`ml-1 font-bold ${currentData.macd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currentData.macd.toFixed(2)}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">訊號:</span>
            <span className={`ml-1 font-bold ${currentData.signal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currentData.signal.toFixed(2)}
            </span>
          </div>
          <div
            className={`px-2 py-1 rounded text-xs font-semibold text-white ${
              currentSignal === 'bullish' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {currentSignal === 'bullish' ? '看漲' : '看跌'}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
            formatter={(value: any) => Number(value).toFixed(2)}
          />
          <Legend />

          {/* Zero line */}
          <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />

          {/* Histogram (MACD - Signal) */}
          <Bar dataKey="histogram" name="柱狀圖" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.histogram >= 0 ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>

          {/* MACD line */}
          <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={2} dot={false} name="MACD 線" />

          {/* Signal line */}
          <Line type="monotone" dataKey="signal" stroke="#f59e0b" strokeWidth={2} dot={false} name="訊號線" />

          {/* Mark crossovers */}
          {crossovers.map((cross, index) => {
            const point = data.find((d) => d.date === cross.date)
            if (!point) return null

            return (
              <ReferenceLine
                key={index}
                x={cross.date}
                stroke={cross.type === 'golden' ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: cross.type === 'golden' ? '黃金交叉' : '死亡交叉',
                  position: 'top',
                  fill: cross.type === 'golden' ? '#10b981' : '#ef4444',
                  fontSize: 12,
                  fontWeight: 'bold',
                }}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Crossover alerts */}
      {crossovers.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="font-semibold text-blue-800 mb-2">交叉訊號</h4>
          <ul className="space-y-1">
            {crossovers.slice(-3).map((cross, index) => (
              <li key={index} className="text-sm text-blue-700">
                <span className="font-medium">
                  {cross.type === 'golden' ? '🟢 黃金交叉' : '🔴 死亡交叉'}
                </span>
                : {cross.description} ({cross.date})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Momentum strengthening alert */}
      {momentumStrengthening && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="font-semibold text-green-800 mb-1">動能轉強訊號</h4>
          <p className="text-sm text-green-700">MACD 柱狀圖由負轉正或持續擴大，顯示上漲動能增強</p>
        </div>
      )}

      {/* MACD interpretation guide */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-green-50 border border-green-200 rounded">
          <div className="font-semibold text-green-700">黃金交叉</div>
          <div className="text-green-600">MACD 線向上穿越訊號線，買入訊號</div>
        </div>
        <div className="p-2 bg-red-50 border border-red-200 rounded">
          <div className="font-semibold text-red-700">死亡交叉</div>
          <div className="text-red-600">MACD 線向下穿越訊號線，賣出訊號</div>
        </div>
        <div className="p-2 bg-blue-50 border border-blue-200 rounded">
          <div className="font-semibold text-blue-700">柱狀圖擴大</div>
          <div className="text-blue-600">MACD 與訊號線差距擴大，趨勢增強</div>
        </div>
        <div className="p-2 bg-gray-50 border border-gray-200 rounded">
          <div className="font-semibold text-gray-700">柱狀圖收窄</div>
          <div className="text-gray-600">MACD 與訊號線差距縮小，趨勢減弱</div>
        </div>
      </div>
    </div>
  )
}
