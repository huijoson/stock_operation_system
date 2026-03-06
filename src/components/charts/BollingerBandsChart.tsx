import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts'

export interface BollingerBandsDataPoint {
  date: string
  price: number
  upper: number
  middle: number
  lower: number
  bandwidth?: number
}

export interface BollingerBandsChartProps {
  data: BollingerBandsDataPoint[]
  title?: string
  height?: number
  showBandwidth?: boolean
  squeezeThreshold?: number
  expansionThreshold?: number
}

export default function BollingerBandsChart({
  data,
  title = '布林通道',
  height = 400,
  showBandwidth = false,
  squeezeThreshold,
  expansionThreshold,
}: BollingerBandsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-white rounded-lg shadow p-6" style={{ height }}>
        <p className="text-gray-500">資料不足，無法顯示布林通道圖表</p>
      </div>
    )
  }

  const currentData = data[data.length - 1]
  
  // Validate that currentData has all required fields
  if (!currentData || currentData.price === undefined || currentData.upper === undefined || currentData.lower === undefined) {
    return (
      <div className="flex items-center justify-center bg-white rounded-lg shadow p-6" style={{ height }}>
        <p className="text-gray-500">資料格式錯誤，無法顯示布林通道圖表</p>
      </div>
    )
  }
  
  // Helper function to safely convert to number
  const toNum = (val: any): number => {
    if (typeof val === 'number') return val
    if (val && typeof val.toNumber === 'function') return val.toNumber()
    return Number(val)
  }

  const price = toNum(currentData.price)
  const upper = toNum(currentData.upper)
  const middle = toNum(currentData.middle)
  const lower = toNum(currentData.lower)
  const bandwidth = currentData.bandwidth ? toNum(currentData.bandwidth) : undefined

  const pricePosition = getPricePosition(price, upper, lower)
  const isSqueeze = squeezeThreshold && bandwidth ? bandwidth < squeezeThreshold : false
  const isExpansion = expansionThreshold && bandwidth ? bandwidth > expansionThreshold : false

  function getPricePosition(price: number, upper: number, lower: number): string {
    const range = upper - lower
    const threshold = range * 0.1

    if (price >= upper - threshold) return 'near_upper'
    if (price <= lower + threshold) return 'near_lower'
    return 'within_bands'
  }

  const getPositionInfo = (position: string) => {
    switch (position) {
      case 'near_upper':
        return { label: '接近上軌', color: '#ef4444', description: '可能超買或突破' }
      case 'near_lower':
        return { label: '接近下軌', color: '#10b981', description: '可能超賣或支撐' }
      default:
        return { label: '通道內', color: '#6b7280', description: '正常波動範圍' }
    }
  }

  const positionInfo = getPositionInfo(pricePosition)

  return (
    <div className="w-full bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-gray-600">價格:</span>
            <span className="ml-1 font-bold text-gray-800">{price.toFixed(2)}</span>
          </div>
          <div
            className="px-2 py-1 rounded text-xs font-semibold text-white"
            style={{ backgroundColor: positionInfo.color }}
          >
            {positionInfo.label}
          </div>
          {isSqueeze && (
            <div className="px-2 py-1 rounded text-xs font-semibold bg-yellow-500 text-white">通道收窄</div>
          )}
          {isExpansion && (
            <div className="px-2 py-1 rounded text-xs font-semibold bg-purple-500 text-white">通道擴大</div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" />
          <YAxis stroke="#6b7280" domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
            formatter={(value: any, name: string) => {
              const labels: { [key: string]: string } = {
                price: '價格',
                upper: '上軌',
                middle: '中軌',
                lower: '下軌',
              }
              if (value === undefined || value === null) {
                return ['N/A', labels[name] || name]
              }
              return [Number(value).toFixed(2), labels[name] || name]
            }}
          />
          <Legend />

          {/* Bollinger Bands area */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill="#ef4444"
            fillOpacity={0.1}
            name="上軌區域"
            stackId="1"
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="#10b981"
            fillOpacity={0.1}
            name="下軌區域"
            stackId="2"
          />

          {/* Upper band */}
          <Line
            type="monotone"
            dataKey="upper"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            name="上軌"
          />

          {/* Middle band (SMA) */}
          <Line
            type="monotone"
            dataKey="middle"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="3 3"
            dot={false}
            name="中軌 (SMA)"
          />

          {/* Lower band */}
          <Line
            type="monotone"
            dataKey="lower"
            stroke="#10b981"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            name="下軌"
          />

          {/* Price line */}
          <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} name="價格" />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Current status */}
      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <div className="text-xs text-gray-600">上軌</div>
            <div className="font-semibold text-red-600">{upper.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">中軌 (SMA)</div>
            <div className="font-semibold text-yellow-600">{middle.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600">下軌</div>
            <div className="font-semibold text-green-600">{lower.toFixed(2)}</div>
          </div>
        </div>
        <div className="text-sm text-gray-700">
          <span className="font-medium">價格位置:</span> {positionInfo.description}
        </div>
        {bandwidth !== undefined && (
          <div className="text-sm text-gray-700 mt-1">
            <span className="font-medium">通道寬度:</span> {bandwidth.toFixed(2)}
            {isSqueeze && <span className="ml-2 text-yellow-600 font-semibold">（盤整狀態）</span>}
            {isExpansion && <span className="ml-2 text-purple-600 font-semibold">（波動加劇）</span>}
          </div>
        )}
      </div>

      {/* Interpretation guide */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-red-50 border border-red-200 rounded">
          <div className="font-semibold text-red-700">觸及上軌</div>
          <div className="text-red-600">可能超買或向上突破</div>
        </div>
        <div className="p-2 bg-green-50 border border-green-200 rounded">
          <div className="font-semibold text-green-700">觸及下軌</div>
          <div className="text-green-600">可能超賣或獲得支撐</div>
        </div>
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
          <div className="font-semibold text-yellow-700">通道收窄</div>
          <div className="text-yellow-600">盤整狀態，可能醞釀突破</div>
        </div>
        <div className="p-2 bg-purple-50 border border-purple-200 rounded">
          <div className="font-semibold text-purple-700">通道擴大</div>
          <div className="text-purple-600">波動加劇，趨勢明確</div>
        </div>
      </div>
    </div>
  )
}
