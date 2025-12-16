# 研究報告：投資組合洞察優化

**分支**: `001-portfolio-insights` | **日期**: 2025-11-27

本文件整合 Phase 0 研究結果，解決所有技術上下文中的「需要釐清」項目。

---

## 1. FIFO 成本基礎計算

### 決策
採用 **FIFO（先進先出）** 作為預設成本基礎計算方法，賣出時優先消耗最早購入的股份。

### 理由
- **IRS 預設規則**: 根據 IRS Publication 550，若無法明確識別賣出的股份，應使用最早購入的股份作為成本基礎
- **券商標準**: FIFO 是 Fidelity、Schwab 等美國主要券商的預設方法
- **簡單性**: 無需使用者指定特定批次，自動決定

### 實作細節

#### 演算法範例
```
輸入:
  批次: [(10 股, $100/股, 2024-01-15), (5 股, $110/股, 2024-02-20)]
  賣出: 8 股 @ $120/股, 2024-06-15

處理:
  1. 依購入日期排序批次（最舊優先）
  2. 從第一批次消耗 8 股
  3. 成本基礎: 8 × $100 = $800
  4. 收入: 8 × $120 = $960
  5. 已實現損益: $960 - $800 = $160 獲利
  6. 持有期間: ~5 個月 = 短期
  
剩餘庫存:
  - 批次 1: 2 股 @ $100（保留原購入日期）
  - 批次 2: 5 股 @ $110（不變）
```

#### 批次資料結構
```typescript
interface TaxLot {
  id: string
  symbol: string
  shares: Decimal             // 使用 Decimal 確保精度
  costBasisPerShare: Decimal
  acquisitionDate: Date
  remainingShares: Decimal
}
```

### 邊界情況處理

| 情境 | 處理方式 |
|------|---------|
| **股票分割** | 調整每股成本（除以分割比例），調整股數（乘以分割比例），總成本不變 |
| **賣出超過持有** | 驗證失敗，不允許執行（本系統不支援放空） |
| **Wash Sale 規則** | 標記但不自動調整（未來功能，目前僅計算純損益） |

### 替代方案評估

| 方法 | 描述 | 適用性 |
|------|------|--------|
| FIFO | 最舊優先 | ✅ 採用 - 預設且合規 |
| 特定識別 | 使用者選擇批次 | ❌ 延後 - 增加複雜度 |
| 平均成本 | 所有股份平均 | ❌ 不適用個股（僅限基金） |

---

## 2. 新聞 API 整合策略

### 決策
採用 **Finnhub Free Tier** 作為主要新聞來源，**SEC EDGAR** 作為官方公告備援。

### 理由
- **速率限制**: Finnhub Free 60 calls/min >> Alpha Vantage 25 calls/day
- **新聞品質**: Finnhub 提供公司新聞端點，包含完整的來源資訊
- **免費額度**: Finnhub 提供 1 年歷史新聞，足夠投資組合應用

### API 比較

| 功能 | Finnhub Free | Alpha Vantage Free |
|------|--------------|-------------------|
| 新聞端點 | ✅ 公司 + 市場新聞 | ✅ NEWS_SENTIMENT |
| 速率限制 | 60 calls/min | 25 calls/day |
| 內建情緒分析 | ❌ 僅付費版 | ✅ 包含 |
| 歷史新聞 | 1 年 | 有限 |

### 快取策略

| 新聞類型 | TTL | 理由 |
|---------|-----|------|
| 公司新聞 | 15 分鐘 | 平衡時效性與速率限制 |
| 市場新聞 | 5 分鐘 | 較為即時 |
| SEC 公告 | 60 分鐘 | 官方文件不會改變 |

### 速率限制策略
```typescript
const RATE_LIMITS = {
  finnhub: {
    callsPerMinute: 60,
    safetyBuffer: 0.8,  // 使用 80% 額度，保留緩衝
  },
  secEdgar: {
    callsPerSecond: 10, // SEC 公平存取政策
  }
}
```

### 備援機制
1. Finnhub 速率限制觸發 → 等待後重試
2. Finnhub 服務不可用 → 使用 SEC EDGAR 官方公告
3. 全部失敗 → 顯示「新聞載入失敗」提示

---

## 3. 新聞來源可信度分類

### 決策
採用來源名稱比對進行三級分類：官方 / 主流媒體 / 未驗證。

### 分類規則

```typescript
const SOURCE_CREDIBILITY = {
  official: [
    'SEC', 'SEC.gov', 'EDGAR', 'BusinessWire', 'PR Newswire',
    'GlobeNewswire', 'AccessWire', 'Newsfile'
  ],
  mainstream: [
    'Reuters', 'Bloomberg', 'CNBC', 'Wall Street Journal', 'WSJ',
    'Financial Times', 'Barrons', 'MarketWatch', 'Yahoo Finance',
    "Investor's Business Daily", 'The Motley Fool'
  ],
  // 其他來源 → unverified
}
```

### 介面顯示

| 等級 | 顏色 | 標籤 |
|------|------|------|
| 官方 | 綠色 | 🏛️ 官方來源 |
| 主流 | 藍色 | 📰 主流媒體 |
| 未驗證 | 灰色 | ⚠️ 未驗證 |

---

## 4. 關鍵字情緒分析

### 決策
採用純關鍵字比對方式，無需 ML 依賴，降低複雜度。

### 實作方式

```typescript
const SENTIMENT_KEYWORDS = {
  positive: [
    'surge', 'soar', 'jump', 'rally', 'gain', 'profit', 'growth',
    'beat', 'exceed', 'upgrade', 'bullish', 'record', 'strong',
    'acquisition', 'partnership', 'breakthrough', 'innovation'
  ],
  negative: [
    'plunge', 'crash', 'drop', 'fall', 'loss', 'decline', 'miss',
    'downgrade', 'bearish', 'layoff', 'lawsuit', 'investigation',
    'bankruptcy', 'recall', 'warning', 'concern', 'risk'
  ]
}

function analyzeSentiment(headline: string, summary: string): {
  score: number        // -1 到 1
  label: 'positive' | 'neutral' | 'negative'
  confidence: 'low' | 'medium' | 'high'
}
```

### 信心度判斷
- 匹配 ≥3 個關鍵字 → `high`
- 匹配 1-2 個關鍵字 → `medium`
- 無匹配 → `low`（標記為 neutral）

---

## 5. 技術評分擴展為風險評估

### 現有架構分析

現有 `TechnicalScoreService` 的權重分配：
| 指標 | 權重 | 評分邏輯 |
|------|------|---------|
| RSI | 25% | 超賣 (<30) → 高分, 超買 (>70) → 低分 |
| MACD | 30% | 黃金交叉 → 70+, 死亡交叉 → 30- |
| Bollinger | 25% | 低於下軌 → 80, 高於上軌 → 20 |
| Fibonacci | 20% | 接近支撐 → 高分, 接近阻力 → 低分 |

### 擴展策略

**決策**: 建立新的 `RiskAssessmentService` 包裝現有 `TechnicalScoreService`。

**理由**:
- 保持單一職責原則
- 不修改已驗證的技術評分邏輯
- 允許加入新聞情緒等額外因素

### 權重重新分配（加入新聞後）

| 元件 | 原權重 | 新權重 |
|------|--------|--------|
| 技術分析（整體） | 100% | 80% |
| 新聞情緒 | 0% | 20% |

技術分析內部權重保持不變（RSI 25%, MACD 30%, Bollinger 25%, Fibonacci 20%）。

### 技術分數轉換為風險分數

```typescript
// 技術分數：高分 = 買入訊號（看漲）
// 風險分數：高分 = 高風險（看跌）
// 因此：風險分數 = 100 - 技術分數

const technicalScore = 75  // strong_buy 訊號
const riskScore = 100 - 75 = 25  // 低風險
```

### 風險等級對照

| 風險分數 | 風險等級 | 對應技術評分 |
|---------|---------|-------------|
| 0-40 | 低風險 | 技術分數 > 60 |
| 40-70 | 中等風險 | 技術分數 40-60 |
| 70-100 | 高風險 | 技術分數 < 40 |

---

## 6. 快取策略

### 決策
採用現有 `IndicatorCacheService` 模式，使用 24 小時 TTL 進行每日批次快取。

### 實作方式

```typescript
// 使用 'RISK_ASSESSMENT' 作為指標類型
const RISK_INDICATOR_TYPE = 'RISK_ASSESSMENT'

// 快取金鑰：symbol + RISK_ASSESSMENT + 0
await cache.set(symbol, RISK_INDICATOR_TYPE, 0, assessment, 24) // 24 小時
```

### 批次計算排程
- **執行時間**: 美股收盤後（美東時間 4:30 PM）
- **觸發條件**: 每日自動執行，或股價變動超過 5% 時強制更新
- **涵蓋範圍**: 投資組合內所有持股

---

## 7. 資料庫遷移策略

### 既有資料處理

| 考量 | 策略 |
|------|------|
| 現有交易紀錄 | 回溯計算所有 SELL 交易的已實現損益 |
| 成本批次建立 | 從 BUY 交易重建 TaxLot 資料 |
| 持股平均成本 | 現有 `averageCost` 欄位保留，TaxLot 另外追蹤 |

### 遷移腳本需求
1. 為每筆 BUY 交易建立 TaxLot 紀錄
2. 為每筆 SELL 交易計算並寫入 RealizedPL
3. 更新 TaxLot 的 remainingShares
4. 驗證總已實現損益與交易紀錄一致

---

## 8. 效能優化策略

### API 回應時間 < 200ms 達成方式

| 端點 | 策略 |
|------|------|
| 已實現損益 | 預先計算存入資料庫，API 僅讀取 |
| 風險評估 | 每日批次計算並快取 |
| 新聞資訊 | 15 分鐘快取 + 非同步載入 |

### N+1 查詢避免

```typescript
// 使用 Prisma include 預載關聯資料
const portfolioWithHoldings = await prisma.portfolio.findUnique({
  where: { id: portfolioId },
  include: {
    holdings: true,
    transactions: {
      where: { type: 'SELL' }
    }
  }
})
```

---

## 總結

所有「需要釐清」項目已解決：

| 項目 | 決策 |
|------|------|
| 成本基礎方法 | FIFO（先進先出） |
| 新聞 API | Finnhub Free + SEC EDGAR |
| 來源可信度 | 三級分類（官方/主流/未驗證） |
| 情緒分析 | 關鍵字比對（無 ML） |
| 風險評估 | 技術 80% + 新聞 20% |
| 快取策略 | 24 小時 TTL + 每日批次 |
| 資料遷移 | 加法式遷移 + 回溯計算 |
