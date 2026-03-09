import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'

export interface RSIDataPoint {
  date: string
  rsi: number
  price?: number
}

export interface Divergence {
  startIndex: number
  endIndex: number
  type: 'bullish' | 'bearish'
  description: string
}

export interface RSIIndicatorProps {
  data: RSIDataPoint[]
  divergences?: Divergence[]
  title?: string
  height?: number
}

export default function RSIIndicator({
  data,
  divergences = [],
  title = 'RSI 相對強弱指標',
  height = 300,
}: RSIIndicatorProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-white rounded-lg shadow p-6" style={{ height }}>
        <p className="text-gray-500">資料不足，無法顯示 RSI 圖表</p>
      </div>
    )
  }

  const currentRSI = data[data.length - 1]?.rsi
  const getStatus = (rsi: number): { label: string; color: string } => {
    if (rsi > 70) return { label: '超買', color: '#ef4444' }
    if (rsi < 30) return { label: '超賣', color: '#10b981' }
    return { label: '中性', color: '#6b7280' }
  }

  const status = currentRSI ? getStatus(currentRSI) : null

  return (
    <div className="w-full bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {status && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">目前 RSI:</span>
            <span className="font-bold text-lg" style={{ color: status.color }}>
              {currentRSI.toFixed(2)}
            </span>
            <span
              className="px-2 py-1 rounded text-xs font-semibold text-white"
              style={{ backgroundColor: status.color }}
            >
              {status.label}
            </span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" />
          <YAxis domain={[0, 100]} stroke="#6b7280" />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
            formatter={(value: number | string, name: string) => {
              if (name === 'RSI') {
                const rsiValue = Number(value)
                const status = getStatus(rsiValue)
                return [
                  <span key="rsi-value" style={{ color: status.color, fontWeight: 'bold' }}>
                    {rsiValue.toFixed(2)} ({status.label})
                  </span>,
                  name,
                ]
              }
              return [Number(value).toFixed(2), name]
            }}
          />
          <Legend />

          {/* Overbought zone (70-100) */}
          <ReferenceArea y1={70} y2={100} fill="#ef4444" fillOpacity={0.1} />

          {/* Oversold zone (0-30) */}
          <ReferenceArea y1={0} y2={30} fill="#10b981" fillOpacity={0.1} />

          {/* Reference lines at 30 and 70 */}
          <ReferenceLine
            y={70}
            stroke="#ef4444"
            strokeDasharray="3 3"
            label={{ value: '超買 (70)', position: 'right', fill: '#ef4444' }}
          />
          <ReferenceLine
            y={30}
            stroke="#10b981"
            strokeDasharray="3 3"
            label={{ value: '超賣 (30)', position: 'right', fill: '#10b981' }}
          />
          <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="3 3" label={{ value: '50', position: 'right' }} />

          {/* RSI line */}
          <Line type="monotone" dataKey="rsi" stroke="#3b82f6" strokeWidth={2} dot={false} name="RSI" />

          {/* Mark divergences */}
          {divergences.map((div, index) => {
            const startDate = data[div.startIndex]?.date
            const endDate = data[div.endIndex]?.date
            if (!startDate || !endDate) return null

            return (
              <ReferenceArea
                key={index}
                x1={startDate}
                x2={endDate}
                fill={div.type === 'bullish' ? '#10b981' : '#ef4444'}
                fillOpacity={0.2}
                label={{
                  value: div.type === 'bullish' ? '看漲背離' : '看跌背離',
                  position: 'top',
                }}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>

      {/* Divergence alerts */}
      {divergences.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h4 className="font-semibold text-yellow-800 mb-2">背離訊號</h4>
          <ul className="space-y-1">
            {divergences.map((div, index) => (
              <li key={index} className="text-sm text-yellow-700">
                <span className="font-medium">{div.type === 'bullish' ? '看漲背離' : '看跌背離'}:</span>{' '}
                {div.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* RSI interpretation guide */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 bg-red-50 border border-red-200 rounded">
          <div className="font-semibold text-red-700">超買 (&gt;70)</div>
          <div className="text-red-600">可能回調</div>
        </div>
        <div className="p-2 bg-gray-50 border border-gray-200 rounded">
          <div className="font-semibold text-gray-700">中性 (30-70)</div>
          <div className="text-gray-600">正常範圍</div>
        </div>
        <div className="p-2 bg-green-50 border border-green-200 rounded">
          <div className="font-semibold text-green-700">超賣 (&lt;30)</div>
          <div className="text-green-600">可能反彈</div>
        </div>
      </div>
    </div>
  )
}
