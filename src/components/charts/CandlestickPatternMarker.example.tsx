import CandlestickPatternMarker, { CandleData, PatternMarker } from './CandlestickPatternMarker'

/**
 * Example usage of CandlestickPatternMarker component
 * 
 * This component displays candlestick charts with pattern markers
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */
export default function CandlestickPatternMarkerExample() {
  // Sample candlestick data
  const candleData: CandleData[] = [
    { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103 },
    { date: '2024-01-02', open: 103, high: 107, low: 102, close: 106 },
    { date: '2024-01-03', open: 106, high: 108, low: 104, close: 105 },
    { date: '2024-01-04', open: 105, high: 106, low: 100, close: 101 },
    { date: '2024-01-05', open: 101, high: 103, low: 99, close: 102 },
    { date: '2024-01-06', open: 102, high: 104, low: 101, close: 103 },
    { date: '2024-01-07', open: 103, high: 105, low: 102, close: 104 },
    { date: '2024-01-08', open: 104, high: 110, low: 103, close: 109 },
    { date: '2024-01-09', open: 109, high: 112, low: 108, close: 111 },
    { date: '2024-01-10', open: 111, high: 113, low: 110, close: 112 },
  ]

  // Sample pattern markers
  const patterns: PatternMarker[] = [
    {
      date: '2024-01-04',
      pattern: '錘子線',
      signal: 'bullish',
      reliability: 85,
      atGoldenRatio: false,
      description: '下影線長，實體小，出現在下跌趨勢後，可能反轉向上',
    },
    {
      date: '2024-01-08',
      pattern: '看漲吞噬',
      signal: 'bullish',
      reliability: 92,
      atGoldenRatio: true,
      description: '陽線完全吞噬前一根陰線，強烈看漲訊號',
    },
  ]

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">K線型態識別元件範例</h2>
        <p className="text-gray-600 mb-6">
          此元件在 K線圖上標記識別的型態，顯示型態名稱、訊號方向、可靠度評分，並高亮在黃金分割位的型態。
        </p>
      </div>

      {/* Example 1: With patterns */}
      <div>
        <h3 className="text-xl font-semibold mb-3">範例 1：包含型態標記</h3>
        <CandlestickPatternMarker
          data={candleData}
          patterns={patterns}
          title="AAPL - K線型態分析"
          height={450}
        />
      </div>

      {/* Example 2: Without patterns */}
      <div>
        <h3 className="text-xl font-semibold mb-3">範例 2：無型態標記</h3>
        <CandlestickPatternMarker
          data={candleData}
          patterns={[]}
          title="TSLA - K線圖"
          height={400}
        />
      </div>

      {/* Example 3: Multiple patterns */}
      <div>
        <h3 className="text-xl font-semibold mb-3">範例 3：多個型態標記</h3>
        <CandlestickPatternMarker
          data={candleData}
          patterns={[
            {
              date: '2024-01-03',
              pattern: '十字星',
              signal: 'neutral',
              reliability: 70,
              atGoldenRatio: false,
              description: '開盤價與收盤價接近，市場猶豫不決',
            },
            {
              date: '2024-01-04',
              pattern: '錘子線',
              signal: 'bullish',
              reliability: 85,
              atGoldenRatio: true,
              description: '下影線長，實體小，出現在下跌趨勢後，可能反轉向上',
            },
            {
              date: '2024-01-08',
              pattern: '看漲吞噬',
              signal: 'bullish',
              reliability: 92,
              atGoldenRatio: true,
              description: '陽線完全吞噬前一根陰線，強烈看漲訊號',
            },
          ]}
          title="NVDA - 多型態分析"
          height={500}
        />
      </div>

      {/* Usage instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">使用說明</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>🟢 綠色標記表示看漲型態（如錘子線、晨星、看漲吞噬）</li>
          <li>🔴 紅色標記表示看跌型態（如吊人線、暮星、看跌吞噬）</li>
          <li>⚪ 灰色標記表示中性型態（如十字星）</li>
          <li>⭐ 黃色邊框表示型態出現在黃金分割關鍵位，訊號更強</li>
          <li>可靠度評分：80%+ 綠色，60-79% 橙色，60% 以下灰色</li>
          <li>懸停在圖表上可查看詳細的 K線數據和型態資訊</li>
        </ul>
      </div>
    </div>
  )
}
