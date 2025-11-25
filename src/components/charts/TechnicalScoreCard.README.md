# TechnicalScoreCard 元件

## 概述

TechnicalScoreCard 是一個綜合技術評分卡片元件，用於顯示股票的整體技術面狀況。它整合了 RSI、MACD、布林通道和費波那契等多個技術指標，計算出一個 0-100 的綜合評分，並提供視覺化的評分趨勢圖。

## 功能特點

- **綜合評分顯示**：以大字體顯示 0-100 的技術評分
- **市場狀態標籤**：根據評分顯示強勢看多、看多、中性、看空、強勢看空
- **指標貢獻度**：顯示各個技術指標的評分、權重和對總分的貢獻
- **評分計算明細**：展示評分的計算過程
- **趨勢圖表**：顯示評分的歷史變化趨勢
- **評分區間指南**：提供評分區間的參考說明

## Props

```typescript
interface TechnicalScoreCardProps {
  currentScore: TechnicalScoreData  // 當前技術評分資料
  history?: ScoreHistory[]           // 評分歷史資料（可選）
  title?: string                     // 卡片標題（可選，預設為「綜合技術評分」）
}

interface TechnicalScoreData {
  totalScore: number                 // 總評分 (0-100)
  rating: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'
  components: ComponentScores        // 各指標評分
  timestamp: Date                    // 計算時間
}

interface ComponentScores {
  rsi: ComponentScore
  macd: ComponentScore
  bollinger: ComponentScore
  fibonacci: ComponentScore
}

interface ComponentScore {
  score: number        // 指標評分 (0-100)
  weight: number       // 權重 (0-1)
  contribution: number // 對總分的貢獻
}

interface ScoreHistory {
  date: string         // 日期
  score: number        // 評分
}
```

## 評分等級

| 評分範圍 | 等級 | 說明 |
|---------|------|------|
| 70-100 | 強勢看多 | 多項指標顯示強勁買入訊號 |
| 55-70 | 看多 | 技術面偏多，可考慮買入 |
| 45-55 | 中性 | 技術面無明確方向 |
| 30-45 | 看空 | 技術面偏空，建議觀望 |
| 0-30 | 強勢看空 | 多項指標顯示賣出訊號 |

## 使用範例

### 基本使用

```tsx
import TechnicalScoreCard from '@/components/charts/TechnicalScoreCard'

const scoreData = {
  totalScore: 72.5,
  rating: 'strong_buy',
  components: {
    rsi: { score: 75, weight: 0.3, contribution: 22.5 },
    macd: { score: 80, weight: 0.3, contribution: 24.0 },
    bollinger: { score: 65, weight: 0.2, contribution: 13.0 },
    fibonacci: { score: 70, weight: 0.2, contribution: 14.0 },
  },
  timestamp: new Date(),
}

<TechnicalScoreCard currentScore={scoreData} />
```

### 包含歷史趨勢

```tsx
const scoreData = {
  totalScore: 72.5,
  rating: 'strong_buy',
  components: {
    rsi: { score: 75, weight: 0.3, contribution: 22.5 },
    macd: { score: 80, weight: 0.3, contribution: 24.0 },
    bollinger: { score: 65, weight: 0.2, contribution: 13.0 },
    fibonacci: { score: 70, weight: 0.2, contribution: 14.0 },
  },
  timestamp: new Date(),
}

const history = [
  { date: '2024-01-01', score: 65 },
  { date: '2024-01-02', score: 68 },
  { date: '2024-01-03', score: 70 },
  { date: '2024-01-04', score: 72.5 },
]

<TechnicalScoreCard 
  currentScore={scoreData} 
  history={history}
  title="AAPL 技術評分"
/>
```

## 設計考量

### 評分計算

總評分 = Σ(各指標評分 × 權重)

例如：
- RSI: 75 × 30% = 22.5
- MACD: 80 × 30% = 24.0
- 布林通道: 65 × 20% = 13.0
- 費波那契: 70 × 20% = 14.0
- **總分: 73.5**

### 顏色編碼

- **綠色系**：看多訊號（評分 ≥ 55）
- **灰色**：中性（評分 45-55）
- **紅色系**：看空訊號（評分 < 45）

### 視覺層次

1. **主要資訊**：大字體顯示總評分和市場狀態
2. **次要資訊**：各指標的貢獻度和權重
3. **輔助資訊**：評分計算明細和趨勢圖

## 整合建議

### 與 API 整合

```tsx
'use client'

import { useEffect, useState } from 'react'
import TechnicalScoreCard from '@/components/charts/TechnicalScoreCard'

export default function StockAnalysisPage({ symbol }: { symbol: string }) {
  const [scoreData, setScoreData] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    async function fetchScore() {
      const response = await fetch(`/api/indicators/technical-score?symbol=${symbol}`)
      const data = await response.json()
      setScoreData(data.currentScore)
      setHistory(data.history || [])
    }
    fetchScore()
  }, [symbol])

  if (!scoreData) return <div>載入中...</div>

  return <TechnicalScoreCard currentScore={scoreData} history={history} />
}
```

### 響應式設計

元件使用 Tailwind CSS 和 ResponsiveContainer，自動適應不同螢幕尺寸。

## 相關元件

- `RSIIndicator` - RSI 指標元件
- `MACDIndicator` - MACD 指標元件
- `BollingerBandsChart` - 布林通道元件
- `FibonacciDrawingTool` - 費波那契工具

## 驗證需求

此元件滿足以下需求：
- **需求 8.1**：顯示 0-100 的綜合技術評分
- **需求 8.2**：評分 > 70 標示為強勢看多
- **需求 8.3**：評分 < 30 標示為弱勢看空
- **需求 8.4**：評分 45-55 標示為中性盤整
- **需求 8.5**：顯示各指標的貢獻度和權重
- **需求 8.6**：顯示評分變化趨勢圖
