# 快速開始：投資組合洞察優化

**分支**: `001-portfolio-insights` | **日期**: 2025-11-27

本文件提供功能實作的快速上手指南。

---

## 前置準備

### 環境需求

- Node.js >= 18.x
- PostgreSQL 資料庫
- npm 或 yarn

### 必要環境變數

```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/stock_portfolio"

# 新增：新聞 API 金鑰
FINNHUB_API_KEY="your_finnhub_api_key"        # 從 https://finnhub.io 免費取得
ALPHA_VANTAGE_API_KEY="your_alpha_vantage_key" # 備援用（可選）
```

### 取得 Finnhub API Key

1. 前往 https://finnhub.io/register
2. 註冊免費帳號
3. 取得 API Key（Free Tier 足夠使用）
4. 複製到 `.env.local`

---

## 資料庫設定

### 1. 執行遷移

```bash
# 新增投資組合洞察相關資料表
npx prisma migrate dev --name add_portfolio_insights
```

### 2. 資料回填（現有資料庫）

如果資料庫已有交易紀錄，需執行回填腳本：

```bash
# 從現有 BUY 交易建立 TaxLot，從 SELL 交易計算 RealizedPL
npx ts-node scripts/backfill-insights.ts
```

### 3. 初始化新聞來源評等

```bash
# 種子預設新聞來源可信度資料
npx prisma db seed
```

---

## 開發流程

### TDD 開發順序

依功能優先級（P1 → P7）開發：

```
1. P1: 已實現損益 (RealizedPL)
   - tests/property/realized-pl.property.test.ts
   - tests/unit/realized-pl.service.test.ts
   - src/services/realized-pl.service.ts
   - src/app/api/realized-pl/route.ts

2. P2: 風險評估 (RiskAssessment)
   - tests/property/risk-assessment.property.test.ts
   - tests/unit/risk-assessment.service.test.ts
   - src/services/risk-assessment.service.ts
   - src/app/api/risk-assessment/[symbol]/route.ts

3. P3: 持股建議 (HoldingAdvice)
   - tests/unit/holding-advice.service.test.ts
   - src/services/holding-advice.service.ts
   - src/app/api/holding-advice/[symbol]/route.ts

4. P5-P7: 新聞整合 (StockNews)
   - tests/property/news-sentiment.property.test.ts
   - tests/unit/news.service.test.ts
   - src/services/news.service.ts
   - src/app/api/news/[symbol]/route.ts

5. P4: 介面優化
   - src/components/portfolio/RealizedPLCard.tsx
   - src/components/portfolio/RiskBadge.tsx
   - src/components/portfolio/HoldingAdvicePanel.tsx
   - src/components/news/NewsList.tsx
```

### 測試先行

```bash
# 寫測試
npm run test:watch -- realized-pl

# 實作功能
# 確認測試通過
npm test

# 檢查型別
npm run type-check

# 格式化
npm run format
```

---

## 核心服務實作範例

### RealizedPLService

```typescript
// src/services/realized-pl.service.ts
import Decimal from 'decimal.js'
import { PrismaClient } from '@prisma/client'

export interface RealizedPLResult {
  totalPL: Decimal
  shortTermPL: Decimal
  longTermPL: Decimal
  records: RealizedPLRecord[]
}

export class RealizedPLService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 計算賣出交易的已實現損益（FIFO）
   */
  async calculateForSale(
    portfolioId: string,
    symbol: string,
    saleQuantity: Decimal,
    salePrice: Decimal,
    saleDate: Date,
    transactionId: string
  ): Promise<RealizedPLRecord[]> {
    // 1. 取得可用批次（FIFO 排序）
    const lots = await this.getAvailableLots(portfolioId, symbol)
    
    // 2. 消耗批次並計算損益
    const results: RealizedPLRecord[] = []
    let remaining = saleQuantity
    
    for (const lot of lots) {
      if (remaining.lte(0)) break
      
      const consumed = Decimal.min(lot.remainingShares, remaining)
      const costBasis = consumed.mul(lot.costBasisPerShare)
      const proceeds = consumed.mul(salePrice)
      const pl = proceeds.minus(costBasis)
      
      // 計算持有期間
      const holdingDays = this.daysBetween(lot.acquisitionDate, saleDate)
      const holdingPeriod = holdingDays > 365 ? 'LONG' : 'SHORT'
      
      // 建立 RealizedPL 紀錄
      const record = await this.prisma.realizedPL.create({
        data: {
          portfolioId,
          transactionId,
          symbol,
          taxLotId: lot.id,
          sharesSold: consumed,
          costBasis,
          saleProceeds: proceeds,
          realizedPL: pl,
          saleDate,
          holdingPeriod
        }
      })
      
      // 更新批次剩餘股數
      await this.prisma.taxLot.update({
        where: { id: lot.id },
        data: { remainingShares: lot.remainingShares.minus(consumed) }
      })
      
      results.push(record)
      remaining = remaining.minus(consumed)
    }
    
    return results
  }
}
```

### RiskAssessmentService

```typescript
// src/services/risk-assessment.service.ts
import { TechnicalScoreService } from './technical-score.service'
import { NewsService } from './news.service'
import { IndicatorCacheService } from './indicator-cache.service'

const TECHNICAL_WEIGHT = 0.80
const NEWS_WEIGHT = 0.20

export class RiskAssessmentService {
  constructor(
    private technicalService: TechnicalScoreService,
    private newsService: NewsService,
    private cacheService: IndicatorCacheService
  ) {}

  async calculateRisk(symbol: string, marketData: MarketData): Promise<RiskAssessment> {
    // 檢查快取
    const cached = await this.cacheService.get(symbol, 'RISK_ASSESSMENT', 0)
    if (cached) return cached.data as RiskAssessment

    // 計算技術分數
    const techScore = this.technicalService.calculateScore(marketData)
    
    // 取得新聞情緒
    const newsScore = await this.newsService.getSentimentScore(symbol)
    
    // 反轉技術分數為風險分數
    const techRisk = 100 - techScore.totalScore
    const newsRisk = newsScore ? 100 - this.mapSentimentToScore(newsScore) : null
    
    // 加權計算
    const riskScore = newsRisk !== null
      ? Math.round(techRisk * TECHNICAL_WEIGHT + newsRisk * NEWS_WEIGHT)
      : techRisk
    
    const result: RiskAssessment = {
      symbol,
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      technicalScore: techScore.totalScore,
      // ... 其他欄位
    }
    
    // 快取 24 小時
    await this.cacheService.set(symbol, 'RISK_ASSESSMENT', 0, result, 24)
    
    return result
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score <= 40) return 'low'
    if (score <= 70) return 'medium'
    return 'high'
  }
}
```

---

## API 路由範例

```typescript
// src/app/api/realized-pl/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { RealizedPLService } from '@/services/realized-pl.service'
import { getSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'all'

  const service = new RealizedPLService()
  const summary = await service.getSummary(session.userId, period)

  return NextResponse.json(summary)
}
```

---

## 元件開發範例

```tsx
// src/components/portfolio/RiskBadge.tsx
interface RiskBadgeProps {
  riskLevel: 'low' | 'medium' | 'high'
}

const RISK_STYLES = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
}

const RISK_LABELS = {
  low: '低風險',
  medium: '中等風險',
  high: '高風險',
}

export function RiskBadge({ riskLevel }: RiskBadgeProps) {
  return (
    <span className={`px-2 py-1 rounded-full text-sm font-medium ${RISK_STYLES[riskLevel]}`}>
      {RISK_LABELS[riskLevel]}
    </span>
  )
}
```

---

## 驗證清單

實作完成後確認：

- [ ] 所有測試通過 (`npm test`)
- [ ] 型別檢查通過 (`npm run type-check`)
- [ ] Lint 通過 (`npm run lint`)
- [ ] 服務覆蓋率 >= 80%
- [ ] API 回應 < 200ms
- [ ] UI 使用繁體中文
- [ ] 免責聲明已顯示
- [ ] 行動裝置響應式正常

---

## 常見問題

### Q: Finnhub API 速率限制錯誤？

檢查快取是否正常運作，避免重複請求同一股票的新聞。

```typescript
// 確認快取 TTL 設定
await cache.set(symbol, 'NEWS', 0, news, 0.25) // 15 分鐘
```

### Q: 已實現損益與交易紀錄不符？

執行驗證腳本檢查：

```bash
npx ts-node scripts/validate-insights.ts
```

### Q: 風險評估顯示「資料不足」？

股票需至少 50 天歷史價格資料才能計算技術指標。

---

## 下一步

1. 執行 `npm run dev` 啟動開發伺服器
2. 依 TDD 順序實作各服務
3. 完成後執行 `/speckit.tasks` 生成任務清單
