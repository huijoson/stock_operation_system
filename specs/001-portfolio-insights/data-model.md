# 資料模型：投資組合洞察優化

**分支**: `001-portfolio-insights` | **日期**: 2025-11-27

本文件定義功能所需的資料實體、關聯與驗證規則。

---

## 新增實體

### 1. TaxLot（成本批次）

記錄每筆買入交易建立的成本批次，用於 FIFO 計算。

```prisma
model TaxLot {
  id                  String    @id @default(cuid())
  portfolioId         String
  portfolio           Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  symbol              String
  
  // 購入資訊
  acquisitionDate     DateTime
  originalShares      Decimal   @db.Decimal(18, 8)
  costBasisPerShare   Decimal   @db.Decimal(18, 8)
  totalCostBasis      Decimal   @db.Decimal(18, 8)
  
  // 目前狀態
  remainingShares     Decimal   @db.Decimal(18, 8)
  
  // 來源交易
  transactionId       String?
  transaction         Transaction? @relation(fields: [transactionId], references: [id])
  
  // 時間戳記
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  // 關聯
  realizedPLRecords   RealizedPL[]
  
  @@index([portfolioId, symbol])
  @@index([portfolioId, symbol, acquisitionDate])
}
```

**欄位說明**:
| 欄位 | 型別 | 說明 | 驗證規則 |
|------|------|------|---------|
| `originalShares` | Decimal(18,8) | 原始購入股數 | > 0 |
| `remainingShares` | Decimal(18,8) | 剩餘可賣股數 | >= 0, <= originalShares |
| `costBasisPerShare` | Decimal(18,8) | 每股成本 | > 0 |
| `acquisitionDate` | DateTime | 購入日期 | <= 今日 |

---

### 2. RealizedPL（已實現損益）

記錄每筆賣出交易產生的已實現損益。

```prisma
model RealizedPL {
  id                  String    @id @default(cuid())
  portfolioId         String
  portfolio           Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  
  // 賣出資訊
  transactionId       String
  transaction         Transaction @relation(fields: [transactionId], references: [id])
  symbol              String
  
  // 消耗的成本批次
  taxLotId            String
  taxLot              TaxLot    @relation(fields: [taxLotId], references: [id])
  
  // 損益計算
  sharesSold          Decimal   @db.Decimal(18, 8)
  costBasis           Decimal   @db.Decimal(18, 8)  // 成本
  saleProceeds        Decimal   @db.Decimal(18, 8)  // 收入
  realizedPL          Decimal   @db.Decimal(18, 8)  // 損益 = saleProceeds - costBasis
  
  // 持有期間
  saleDate            DateTime
  holdingPeriod       String    // 'SHORT' | 'LONG' (> 1 年)
  
  // 時間戳記
  createdAt           DateTime  @default(now())
  
  @@index([portfolioId, saleDate])
  @@index([portfolioId, symbol])
}
```

**欄位說明**:
| 欄位 | 型別 | 說明 | 驗證規則 |
|------|------|------|---------|
| `sharesSold` | Decimal(18,8) | 賣出股數 | > 0 |
| `costBasis` | Decimal(18,8) | 成本基礎 | >= 0 |
| `saleProceeds` | Decimal(18,8) | 賣出收入 | >= 0 |
| `realizedPL` | Decimal(18,8) | 已實現損益 | 可正可負 |
| `holdingPeriod` | String | 持有期間 | 'SHORT' \| 'LONG' |

---

### 3. RiskAssessment（風險評估）

儲存持股的風險評估結果（每日快取）。

```prisma
model RiskAssessment {
  id                  String    @id @default(cuid())
  symbol              String
  
  // 風險評分
  riskScore           Int       // 0-100
  riskLevel           String    // 'low' | 'medium' | 'high'
  
  // 技術分析成分
  technicalScore      Int       // 0-100
  rsiScore            Int       // 0-100
  macdScore           Int       // 0-100
  bollingerScore      Int       // 0-100
  fibonacciScore      Int       // 0-100
  
  // 新聞情緒成分
  newsScore           Int?      // 0-100, null = 無新聞資料
  newsSentiment       String?   // 'positive' | 'neutral' | 'negative'
  newsArticleCount    Int       @default(0)
  
  // 權重配置
  technicalWeight     Decimal   @db.Decimal(3, 2) @default(0.80)
  newsWeight          Decimal   @db.Decimal(3, 2) @default(0.20)
  
  // 評估時間
  calculatedAt        DateTime
  expiresAt           DateTime
  
  createdAt           DateTime  @default(now())
  
  @@unique([symbol])
  @@index([symbol, expiresAt])
}
```

**欄位說明**:
| 欄位 | 型別 | 說明 | 驗證規則 |
|------|------|------|---------|
| `riskScore` | Int | 風險評分 | 0-100 |
| `riskLevel` | String | 風險等級 | 'low' \| 'medium' \| 'high' |
| `technicalScore` | Int | 技術分析分數 | 0-100 |
| `newsScore` | Int? | 新聞情緒分數 | 0-100 或 null |

**風險等級對照**:
| riskScore | riskLevel |
|-----------|-----------|
| 0-40 | low |
| 41-70 | medium |
| 71-100 | high |

---

### 4. HoldingAdvice（持股建議）

記錄系統對持股的操作建議。

```prisma
model HoldingAdvice {
  id                  String    @id @default(cuid())
  symbol              String
  
  // 建議內容
  adviceType          String    // 'reduce' | 'hold' | 'add'
  reasons             Json      // String[] - 理由清單
  confidence          Int       // 0-100 信心度
  
  // 關聯風險評估
  riskAssessmentId    String?
  riskAssessment      RiskAssessment? @relation(fields: [riskAssessmentId], references: [id])
  
  // 時間資訊
  generatedAt         DateTime
  expiresAt           DateTime
  
  createdAt           DateTime  @default(now())
  
  @@unique([symbol])
  @@index([symbol, expiresAt])
}
```

**欄位說明**:
| 欄位 | 型別 | 說明 | 驗證規則 |
|------|------|------|---------|
| `adviceType` | String | 建議類型 | 'reduce' \| 'hold' \| 'add' |
| `reasons` | Json | 理由清單 | String[], 至少 1 項 |
| `confidence` | Int | 信心度 | 0-100 |

**建議生成邏輯**:
| riskLevel | adviceType | 範例理由 |
|-----------|------------|---------|
| high + MACD 死亡交叉 | reduce | 「技術指標顯示超買，MACD 出現賣出訊號」 |
| low + RSI 中性 | hold | 「技術指標中性，無明顯買賣訊號」 |
| low + RSI < 30 + 價格接近支撐 | add | 「價格接近支撐位，技術指標顯示超賣」 |

---

### 5. StockNews（股票新聞）

儲存從外部 API 取得的新聞資訊。

```prisma
model StockNews {
  id                  String    @id @default(cuid())
  symbol              String
  
  // 新聞內容
  externalId          String?   // 外部 API 的新聞 ID
  headline            String
  summary             String?
  url                 String
  imageUrl            String?
  source              String
  publishedAt         DateTime
  
  // 可信度分類
  credibility         String    // 'official' | 'mainstream' | 'unverified'
  
  // 情緒分析
  sentimentScore      Decimal   @db.Decimal(4, 3)  // -1.000 到 1.000
  sentimentLabel      String    // 'positive' | 'neutral' | 'negative'
  sentimentConfidence String    // 'low' | 'medium' | 'high'
  
  // 時間戳記
  fetchedAt           DateTime  @default(now())
  expiresAt           DateTime
  
  createdAt           DateTime  @default(now())
  
  @@unique([symbol, externalId])
  @@index([symbol, publishedAt(sort: Desc)])
  @@index([symbol, expiresAt])
}
```

**欄位說明**:
| 欄位 | 型別 | 說明 | 驗證規則 |
|------|------|------|---------|
| `headline` | String | 新聞標題 | 非空 |
| `source` | String | 來源名稱 | 非空 |
| `credibility` | String | 可信度 | 'official' \| 'mainstream' \| 'unverified' |
| `sentimentScore` | Decimal(4,3) | 情緒分數 | -1.000 ~ 1.000 |
| `sentimentLabel` | String | 情緒標籤 | 'positive' \| 'neutral' \| 'negative' |

---

### 6. NewsSourceRating（新聞來源評等）

記錄新聞來源的可信度評等。

```prisma
model NewsSourceRating {
  id                  String    @id @default(cuid())
  sourceName          String    @unique
  credibilityLevel    String    // 'official' | 'mainstream' | 'unverified'
  
  // 元資料
  description         String?
  isActive            Boolean   @default(true)
  
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}
```

**預設資料種子**:
```typescript
const defaultSources = [
  { sourceName: 'SEC', credibilityLevel: 'official' },
  { sourceName: 'BusinessWire', credibilityLevel: 'official' },
  { sourceName: 'PR Newswire', credibilityLevel: 'official' },
  { sourceName: 'Reuters', credibilityLevel: 'mainstream' },
  { sourceName: 'Bloomberg', credibilityLevel: 'mainstream' },
  { sourceName: 'CNBC', credibilityLevel: 'mainstream' },
  { sourceName: 'Wall Street Journal', credibilityLevel: 'mainstream' },
]
```

---

## 現有模型關聯更新

### Portfolio 模型新增關聯

```prisma
model Portfolio {
  // ... 現有欄位 ...
  
  // 新增關聯
  taxLots      TaxLot[]
  realizedPLs  RealizedPL[]
}
```

### Transaction 模型新增關聯

```prisma
model Transaction {
  // ... 現有欄位 ...
  
  // 新增關聯
  taxLot       TaxLot?      // BUY 交易建立的批次
  realizedPLs  RealizedPL[] // SELL 交易產生的損益
}
```

### RiskAssessment 模型新增關聯

```prisma
model RiskAssessment {
  // ... 現有欄位 ...
  
  // 新增關聯
  holdingAdvice HoldingAdvice?
}
```

---

## 實體關係圖

```
┌─────────────────┐     ┌─────────────────┐
│    Portfolio    │────<│     TaxLot      │
│                 │     │                 │
│ - id            │     │ - portfolioId   │
│ - name          │     │ - symbol        │
│ - holdings[]    │     │ - remainingShares│
└────────┬────────┘     └────────┬────────┘
         │                       │
         │                       │
         │              ┌────────▼────────┐
         │              │   RealizedPL    │
         └─────────────<│                 │
                        │ - portfolioId   │
                        │ - taxLotId      │
                        │ - realizedPL    │
                        └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│ RiskAssessment  │────>│  HoldingAdvice  │
│                 │     │                 │
│ - symbol        │     │ - symbol        │
│ - riskScore     │     │ - adviceType    │
│ - riskLevel     │     │ - reasons       │
└─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│   StockNews     │     │NewsSourceRating │
│                 │     │                 │
│ - symbol        │     │ - sourceName    │
│ - headline      │     │ - credibility   │
│ - credibility   │     │                 │
└─────────────────┘     └─────────────────┘
```

---

## 資料遷移計畫

### 遷移步驟

1. **建立新資料表** (additive migration)
   ```bash
   npx prisma migrate dev --name add_portfolio_insights
   ```

2. **資料回填腳本** (`prisma/seed-insights.ts`)
   - 從現有 BUY 交易建立 TaxLot
   - 從現有 SELL 交易計算 RealizedPL
   - 初始化 NewsSourceRating 預設資料

3. **驗證腳本** (`scripts/validate-migration.ts`)
   - 確認所有 BUY 交易都有對應 TaxLot
   - 確認所有 SELL 交易都有對應 RealizedPL
   - 驗證 TaxLot 的 remainingShares 正確

### 回填邏輯

```typescript
async function backfillTaxLots(portfolioId: string) {
  // 取得所有 BUY 交易，按日期排序
  const buyTransactions = await prisma.transaction.findMany({
    where: { portfolioId, type: 'BUY' },
    orderBy: { date: 'asc' }
  })
  
  for (const tx of buyTransactions) {
    await prisma.taxLot.create({
      data: {
        portfolioId: tx.portfolioId,
        symbol: tx.symbol,
        acquisitionDate: tx.date,
        originalShares: tx.quantity,
        remainingShares: tx.quantity, // 初始值，後續 SELL 處理時扣減
        costBasisPerShare: tx.price,
        totalCostBasis: new Decimal(tx.quantity).mul(new Decimal(tx.price)),
        transactionId: tx.id
      }
    })
  }
}

async function backfillRealizedPL(portfolioId: string) {
  // 取得所有 SELL 交易，按日期排序
  const sellTransactions = await prisma.transaction.findMany({
    where: { portfolioId, type: 'SELL' },
    orderBy: { date: 'asc' }
  })
  
  for (const tx of sellTransactions) {
    // FIFO: 取得最早且有剩餘股數的 TaxLot
    const availableLots = await prisma.taxLot.findMany({
      where: {
        portfolioId: tx.portfolioId,
        symbol: tx.symbol,
        remainingShares: { gt: 0 }
      },
      orderBy: { acquisitionDate: 'asc' }
    })
    
    let remainingToSell = new Decimal(tx.quantity.toString())
    const salePrice = new Decimal(tx.price.toString())
    
    for (const lot of availableLots) {
      if (remainingToSell.lte(0)) break
      
      const lotRemaining = new Decimal(lot.remainingShares.toString())
      const sharesFromThisLot = Decimal.min(lotRemaining, remainingToSell)
      const costBasis = sharesFromThisLot.mul(new Decimal(lot.costBasisPerShare.toString()))
      const proceeds = sharesFromThisLot.mul(salePrice)
      const pl = proceeds.minus(costBasis)
      
      // 計算持有期間
      const holdingDays = Math.floor(
        (tx.date.getTime() - lot.acquisitionDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const holdingPeriod = holdingDays > 365 ? 'LONG' : 'SHORT'
      
      // 建立 RealizedPL
      await prisma.realizedPL.create({
        data: {
          portfolioId: tx.portfolioId,
          transactionId: tx.id,
          symbol: tx.symbol,
          taxLotId: lot.id,
          sharesSold: sharesFromThisLot,
          costBasis,
          saleProceeds: proceeds,
          realizedPL: pl,
          saleDate: tx.date,
          holdingPeriod
        }
      })
      
      // 更新 TaxLot 剩餘股數
      await prisma.taxLot.update({
        where: { id: lot.id },
        data: { remainingShares: lotRemaining.minus(sharesFromThisLot) }
      })
      
      remainingToSell = remainingToSell.minus(sharesFromThisLot)
    }
  }
}
```

---

## 索引策略

| 資料表 | 索引 | 用途 |
|--------|------|------|
| TaxLot | `(portfolioId, symbol)` | 查詢特定持股的批次 |
| TaxLot | `(portfolioId, symbol, acquisitionDate)` | FIFO 排序 |
| RealizedPL | `(portfolioId, saleDate)` | 時間篩選查詢 |
| RealizedPL | `(portfolioId, symbol)` | 按股票統計 |
| RiskAssessment | `(symbol, expiresAt)` | 快取查詢與過期清理 |
| StockNews | `(symbol, publishedAt DESC)` | 取得最新新聞 |
| StockNews | `(symbol, expiresAt)` | 快取過期清理 |
