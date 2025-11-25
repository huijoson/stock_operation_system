/**
 * Example usage of RSIIndicator component
 * This demonstrates how to use the RSI indicator with sample data
 */

import RSIIndicator, { RSIDataPoint, Divergence } from './RSIIndicator'

// Sample RSI data
const sampleData: RSIDataPoint[] = [
  { date: '2024-01-01', rsi: 45.2, price: 100 },
  { date: '2024-01-02', rsi: 52.8, price: 102 },
  { date: '2024-01-03', rsi: 58.3, price: 105 },
  { date: '2024-01-04', rsi: 65.7, price: 108 },
  { date: '2024-01-05', rsi: 72.4, price: 110 }, // Overbought
  { date: '2024-01-08', rsi: 68.9, price: 109 },
  { date: '2024-01-09', rsi: 55.2, price: 106 },
  { date: '2024-01-10', rsi: 42.1, price: 103 },
  { date: '2024-01-11', rsi: 28.5, price: 98 }, // Oversold
  { date: '2024-01-12', rsi: 35.8, price: 101 },
  { date: '2024-01-15', rsi: 48.3, price: 104 },
  { date: '2024-01-16', rsi: 55.7, price: 107 },
]

// Sample divergence data
const sampleDivergences: Divergence[] = [
  {
    startIndex: 4,
    endIndex: 8,
    type: 'bearish',
    description: '價格創新高但 RSI 未創新高，可能反轉向下',
  },
]

export default function RSIIndicatorExample() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">RSI 指標範例</h2>
        <p className="text-gray-600 mb-6">
          RSI (Relative Strength Index) 相對強弱指標用於判斷股票是否處於超買或超賣狀態
        </p>
      </div>

      {/* Basic RSI chart */}
      <div>
        <h3 className="text-xl font-semibold mb-4">基本 RSI 圖表</h3>
        <RSIIndicator data={sampleData} />
      </div>

      {/* RSI with divergences */}
      <div>
        <h3 className="text-xl font-semibold mb-4">帶背離訊號的 RSI 圖表</h3>
        <RSIIndicator data={sampleData} divergences={sampleDivergences} />
      </div>

      {/* Custom height */}
      <div>
        <h3 className="text-xl font-semibold mb-4">自訂高度的 RSI 圖表</h3>
        <RSIIndicator data={sampleData} height={400} title="RSI 指標 (自訂高度)" />
      </div>

      {/* Empty data example */}
      <div>
        <h3 className="text-xl font-semibold mb-4">無資料狀態</h3>
        <RSIIndicator data={[]} />
      </div>
    </div>
  )
}
