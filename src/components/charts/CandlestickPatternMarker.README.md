# CandlestickPatternMarker 元件

K線型態識別標記元件，用於在 K線圖上標記識別的型態，顯示型態名稱、訊號方向、可靠度評分，並高亮在黃金分割位的型態。

## 功能特性

- ✅ 在 K線圖上標記識別的型態
- ✅ 顯示型態名稱和訊號方向（看漲/看跌/中性）
- ✅ 顯示可靠度評分（0-100%）
- ✅ 高亮在黃金分割位的型態
- ✅ 互動式懸停顯示詳細資訊
- ✅ 型態列表展示

## 驗證需求

- **需求 9.2**：識別到看漲型態時標示買入訊號並說明型態特徵
- **需求 9.3**：識別到看跌型態時標示賣出訊號並說明型態特徵
- **需求 9.4**：型態出現在黃金分割關鍵位時提高訊號強度評級
- **需求 9.5**：顯示過去識別的型態

## 使用方式

```tsx
import CandlestickPatternMarker, { CandleData, PatternMarker } from '@/components/charts/CandlestickPatternMarker'

const candleData: CandleData[] = [
  { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103 },
  { date: '2024-01-02', open: 103, high: 107, low: 102, close: 106 },
  // ... more data
]

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

<CandlestickPatternMarker
  data={candleData}
  patterns={patterns}
  title="AAPL - K線型態分析"
  height={450}
/>
```

## Props

### CandlestickPatternMarkerProps

| 屬性 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `data` | `CandleData[]` | ✅ | - | K線資料陣列 |
| `patterns` | `PatternMarker[]` | ✅ | - | 型態標記陣列 |
| `title` | `string` | ❌ | `'K線型態識別'` | 圖表標題 |
| `height` | `number` | ❌ | `450` | 圖表高度（像素） |

### CandleData

| 屬性 | 類型 | 說明 |
|------|------|------|
| `date` | `string` | 日期（格式：YYYY-MM-DD） |
| `open` | `number` | 開盤價 |
| `high` | `number` | 最高價 |
| `low` | `number` | 最低價 |
| `close` | `number` | 收盤價 |

### PatternMarker

| 屬性 | 類型 | 說明 |
|------|------|------|
| `date` | `string` | 型態出現日期 |
| `pattern` | `string` | 型態名稱（如：錘子線、吞噬型態） |
| `signal` | `'bullish' \| 'bearish' \| 'neutral'` | 訊號方向 |
| `reliability` | `number` | 可靠度評分（0-100） |
| `atGoldenRatio` | `boolean` | 是否位於黃金分割位 |
| `description` | `string` | 型態描述 |

## 視覺化說明

### 訊號標記

- 🟢 **綠色圓點**：看漲型態（bullish）
- 🔴 **紅色圓點**：看跌型態（bearish）
- ⚪ **灰色圓點**：中性型態（neutral）
- ⭐ **黃色邊框**：位於黃金分割位的型態（訊號更強）

### 可靠度顏色

- **綠色**（#10b981）：可靠度 ≥ 80%
- **橙色**（#f59e0b）：可靠度 60-79%
- **灰色**（#6b7280）：可靠度 < 60%

### K線顏色

- **綠色**（#10b981）：收盤價 ≥ 開盤價（陽線）
- **紅色**（#ef4444）：收盤價 < 開盤價（陰線）

## 常見型態

### 看漲型態（Bullish）

1. **錘子線（Hammer）**：下影線長，實體小，出現在下跌趨勢後
2. **晨星（Morning Star）**：三根 K線組合，底部反轉訊號
3. **看漲吞噬（Bullish Engulfing）**：陽線完全吞噬前一根陰線

### 看跌型態（Bearish）

1. **吊人線（Hanging Man）**：下影線長，實體小，出現在上漲趨勢後
2. **暮星（Evening Star）**：三根 K線組合，頂部反轉訊號
3. **看跌吞噬（Bearish Engulfing）**：陰線完全吞噬前一根陽線

### 中性型態（Neutral）

1. **十字星（Doji）**：開盤價與收盤價接近，市場猶豫不決

## 互動功能

### 懸停提示（Tooltip）

懸停在 K線上時，顯示：
- 日期
- 開盤價、最高價、最低價、收盤價
- 如果該日有型態：
  - 型態名稱和訊號圖示
  - 型態描述
  - 可靠度評分
  - 是否位於黃金分割位

### 型態列表

圖表下方顯示所有識別的型態，包含：
- 型態名稱和訊號圖示
- 出現日期
- 型態描述
- 可靠度評分
- 黃金分割位標記

## 整合範例

### 與 API 整合

```tsx
'use client'

import { useEffect, useState } from 'react'
import CandlestickPatternMarker from '@/components/charts/CandlestickPatternMarker'

export default function StockPatternAnalysis({ symbol }: { symbol: string }) {
  const [data, setData] = useState([])
  const [patterns, setPatterns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch candlestick data
        const historyRes = await fetch(`/api/stocks/${symbol}/history?days=30`)
        const historyData = await historyRes.json()

        // Fetch pattern analysis
        const patternsRes = await fetch(`/api/indicators/candlestick-patterns?symbol=${symbol}`)
        const patternsData = await patternsRes.json()

        setData(historyData.data)
        setPatterns(patternsData.patterns)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [symbol])

  if (loading) return <div>載入中...</div>

  return (
    <CandlestickPatternMarker
      data={data}
      patterns={patterns}
      title={`${symbol} - K線型態分析`}
    />
  )
}
```

## 注意事項

1. **資料格式**：確保 K線資料的日期格式一致（建議使用 YYYY-MM-DD）
2. **資料完整性**：每根 K線必須包含 open、high、low、close 四個價格
3. **型態日期匹配**：PatternMarker 的 date 必須與 CandleData 的 date 匹配才能正確標記
4. **效能考量**：大量資料時建議限制顯示範圍（如最近 30-60 天）
5. **黃金分割位判斷**：atGoldenRatio 標記應由後端計算並提供

## 相關元件

- `IndicatorChart`：通用技術指標圖表元件
- `FibonacciDrawingTool`：費波那契繪圖工具
- `SupportResistanceLines`：支撐壓力線元件

## 相關服務

- `CandlestickPatternService`：K線型態識別服務
- `FibonacciService`：費波那契計算服務（用於判斷黃金分割位）
