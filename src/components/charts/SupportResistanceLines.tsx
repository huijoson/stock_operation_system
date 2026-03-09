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

export interface PriceLevel {
  price: number
  strength: 'strong' | 'moderate' | 'weak'
  touches: number
  type: 'support' | 'resistance'
}

export interface SupportResistanceLinesProps {
  data: Array<{ date: string; price: number }>
  supports: PriceLevel[]
  resistances: PriceLevel[]
  currentPrice?: number
  nearestSupport?: PriceLevel
  nearestResistance?: PriceLevel
  title?: string
  height?: number
}

export default function SupportResistanceLines({
  data,
  supports,
  resistances,
  currentPrice,
  nearestSupport,
  nearestResistance,
  title = '支撐壓力位分析',
  height = 450,
}: SupportResistanceLinesProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-white rounded-lg shadow p-6" style={{ height }}>
        <p className="text-gray-500">資料不足，無法顯示支撐壓力圖表</p>
      </div>
    )
  }

  const getStrengthColor = (strength: string, type: 'support' | 'resistance'): string => {
    // Different colors for support and resistance
    if (type === 'support') {
      switch (strength) {
        case 'strong':
          return '#059669' // Strong green for strong support
        case 'moderate':
          return '#10b981' // Medium green for moderate support
        case 'weak':
          return '#6ee7b7' // Light green for weak support
        default:
          return '#6b7280'
      }
    } else {
      switch (strength) {
        case 'strong':
          return '#dc2626' // Strong red for strong resistance
        case 'moderate':
          return '#ef4444' // Medium red for moderate resistance
        case 'weak':
          return '#fca5a5' // Light red for weak resistance
        default:
          return '#6b7280'
      }
    }
  }

  const getStrengthWidth = (strength: string): number => {
    switch (strength) {
      case 'strong':
        return 3
      case 'moderate':
        return 2
      case 'weak':
        return 1
      default:
        return 1
    }
  }

  const getStrengthLabel = (strength: string): string => {
    switch (strength) {
      case 'strong':
        return '強'
      case 'moderate':
        return '中'
      case 'weak':
        return '弱'
      default:
        return ''
    }
  }

  return (
    <div className="w-full bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {currentPrice && (
          <div className="text-sm">
            <span className="text-gray-600">目前價格:</span>
            <span className="ml-1 font-bold text-gray-800">{currentPrice.toFixed(2)}</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" />
          <YAxis stroke="#6b7280" domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}
            formatter={(value: any) => Number(value).toFixed(2)}
          />
          <Legend />

          {/* Price line */}
          <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} name="價格" />

          {/* Support lines - Requirements 7.4, 7.5, 7.6 */}
          {supports.map((support, index) => {
            const isNearest = nearestSupport && Math.abs(support.price - nearestSupport.price) < 0.01
            const color = getStrengthColor(support.strength, 'support')
            const width = getStrengthWidth(support.strength)
            
            return (
              <ReferenceLine
                key={`support-${index}`}
                y={support.price}
                stroke={color}
                strokeWidth={isNearest ? width + 1 : width}
                strokeDasharray={isNearest ? '5 5' : support.strength === 'strong' ? 'none' : '3 3'}
                label={{
                  value: `支撐 ${support.price.toFixed(2)} (${getStrengthLabel(support.strength)})`,
                  position: 'left',
                  fill: color,
                  fontSize: isNearest ? 13 : 11,
                  fontWeight: isNearest ? 'bold' : support.strength === 'strong' ? 'bold' : 'normal',
                }}
              />
            )
          })}

          {/* Resistance lines - Requirements 7.4, 7.5, 7.6 */}
          {resistances.map((resistance, index) => {
            const isNearest = nearestResistance && Math.abs(resistance.price - nearestResistance.price) < 0.01
            const color = getStrengthColor(resistance.strength, 'resistance')
            const width = getStrengthWidth(resistance.strength)
            
            return (
              <ReferenceLine
                key={`resistance-${index}`}
                y={resistance.price}
                stroke={color}
                strokeWidth={isNearest ? width + 1 : width}
                strokeDasharray={isNearest ? '5 5' : resistance.strength === 'strong' ? 'none' : '3 3'}
                label={{
                  value: `壓力 ${resistance.price.toFixed(2)} (${getStrengthLabel(resistance.strength)})`,
                  position: 'right',
                  fill: color,
                  fontSize: isNearest ? 13 : 11,
                  fontWeight: isNearest ? 'bold' : resistance.strength === 'strong' ? 'bold' : 'normal',
                }}
              />
            )
          })}

          {/* Current price line */}
          {currentPrice && (
            <ReferenceLine
              y={currentPrice}
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: `目前 ${currentPrice.toFixed(2)}`,
                position: 'insideTopRight',
                fill: '#8b5cf6',
                fontWeight: 'bold',
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Nearest levels info */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        {nearestSupport && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-semibold text-green-800 mb-2">最近支撐位</h4>
            <div className="text-2xl font-bold text-green-700">{nearestSupport.price.toFixed(2)}</div>
            <div className="text-sm text-green-600 mt-1">
              強度: {getStrengthLabel(nearestSupport.strength)} ({nearestSupport.touches} 次觸及)
            </div>
            {currentPrice && (
              <div className="text-xs text-green-600 mt-2">
                距離: {((currentPrice - nearestSupport.price) / currentPrice * 100).toFixed(2)}%
              </div>
            )}
          </div>
        )}

        {nearestResistance && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <h4 className="font-semibold text-red-800 mb-2">最近壓力位</h4>
            <div className="text-2xl font-bold text-red-700">{nearestResistance.price.toFixed(2)}</div>
            <div className="text-sm text-red-600 mt-1">
              強度: {getStrengthLabel(nearestResistance.strength)} ({nearestResistance.touches} 次觸及)
            </div>
            {currentPrice && (
              <div className="text-xs text-red-600 mt-2">
                距離: {((nearestResistance.price - currentPrice) / currentPrice * 100).toFixed(2)}%
              </div>
            )}
          </div>
        )}
      </div>

      {/* All levels list */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        {/* Supports */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">支撐位列表</h4>
          <div className="space-y-1">
            {supports.length === 0 ? (
              <p className="text-sm text-gray-500">無支撐位</p>
            ) : (
              supports.map((support, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-green-50 border border-green-200 rounded text-sm"
                >
                  <span className="font-medium text-green-700">{support.price.toFixed(2)}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: getStrengthColor(support.strength, 'support') }}
                    >
                      {getStrengthLabel(support.strength)}
                    </span>
                    <span className="text-xs text-gray-600">{support.touches}次</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resistances */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">壓力位列表</h4>
          <div className="space-y-1">
            {resistances.length === 0 ? (
              <p className="text-sm text-gray-500">無壓力位</p>
            ) : (
              resistances.map((resistance, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-red-50 border border-red-200 rounded text-sm"
                >
                  <span className="font-medium text-red-700">{resistance.price.toFixed(2)}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: getStrengthColor(resistance.strength, 'resistance') }}
                    >
                      {getStrengthLabel(resistance.strength)}
                    </span>
                    <span className="text-xs text-gray-600">{resistance.touches}次</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 bg-red-50 border border-red-200 rounded">
          <div className="font-semibold text-red-700">強支撐/壓力</div>
          <div className="text-red-600">多次觸及且未突破</div>
        </div>
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
          <div className="font-semibold text-yellow-700">中等強度</div>
          <div className="text-yellow-600">有一定支撐/阻力作用</div>
        </div>
        <div className="p-2 bg-gray-50 border border-gray-200 rounded">
          <div className="font-semibold text-gray-700">弱支撐/壓力</div>
          <div className="text-gray-600">參考價位</div>
        </div>
      </div>
    </div>
  )
}
