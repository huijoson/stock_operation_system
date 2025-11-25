# 設計文件

## 概述

技術指標與黃金分割分析系統是投資組合管理系統的進階模組，專注於提供專業的技術分析工具。系統整合費波那契黃金分割理論與現代技術指標（RSI、MACD、布林通道、ATR），並提供 K線型態識別和自訂策略回測功能。

核心設計理念：
1. **高精度計算**：所有數值計算使用 Decimal.js 確保精度
2. **效能優化**：指標計算結果快取，減少重複運算
3. **模組化架構**：每個指標獨立計算，易於擴展
4. **視覺化優先**：提供直觀的圖表展示所有指標

## 架構

### 整體架構

```
┌─────────────────────────────────────────┐
│         展示層 (Presentation)            │
│  - 技術指標圖表元件                      │
│  - 費波那契繪圖工具                      │
│  - 策略設定介面                          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         業務邏輯層 (Business Logic)      │
│  - 指標計算服務                          │
│  - 黃金分割計算服務                      │
│  - K線型態識別服務                       │
│  - 策略回測引擎                          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         資料存取層 (Data Access)         │
│  - 指標快取                              │
│  - 歷史價格資料                          │
│  - 策略設定儲存                          │
└─────────────────────────────────────────┘
```

### 指標計算流程

```
使用者請求指標
    ↓
檢查快取
    ↓
快取命中？ → 是 → 返回快取資料
    ↓ 否
取得歷史價格資料
    ↓
計算技術指標
    ↓
儲存至快取
    ↓
返回計算結果
```

## 元件和介面

### 前端元件

#### 頁面元件
- `TechnicalAnalysisPage`: 技術分析主頁面
- `FibonacciToolPage`: 費波那契工具頁面
- `StrategyBuilderPage`: 策略建立器頁面
- `BacktestResultsPage`: 回測結果頁面


#### UI 元件
- `IndicatorChart`: 技術指標圖表元件
- `FibonacciDrawingTool`: 費波那契繪圖工具
- `RSIIndicator`: RSI 指標顯示元件
- `MACDIndicator`: MACD 指標顯示元件
- `BollingerBandsChart`: 布林通道圖表
- `CandlestickPatternMarker`: K線型態標記
- `SupportResistanceLines`: 支撐壓力線元件
- `TechnicalScoreCard`: 技術評分卡片
- `StrategyConditionBuilder`: 策略條件建立器

### 後端服務

#### API 路由
- `GET /api/indicators/fibonacci/retracement`: 計算費波那契回撤
- `GET /api/indicators/fibonacci/extension`: 計算費波那契擴展
- `GET /api/indicators/rsi`: 計算 RSI 指標
- `GET /api/indicators/macd`: 計算 MACD 指標
- `GET /api/indicators/bollinger`: 計算布林通道
- `GET /api/indicators/atr`: 計算 ATR 指標
- `GET /api/indicators/support-resistance`: 計算支撐壓力位
- `GET /api/indicators/technical-score`: 計算綜合技術評分
- `GET /api/indicators/candlestick-patterns`: 識別 K線型態
- `POST /api/strategies`: 建立策略
- `GET /api/strategies/:id/backtest`: 執行策略回測
- `GET /api/indicators/cache/clear`: 清除指標快取

#### 業務邏輯服務

**FibonacciService**
```typescript
interface FibonacciService {
  calculateRetracement(high: Decimal, low: Decimal, isUptrend: boolean): FibonacciLevels
  calculateExtension(start: Decimal, retracement: Decimal, breakout: Decimal): FibonacciTargets
  findNearestLevel(currentPrice: Decimal, levels: FibonacciLevels, tolerance: number): FibonacciLevel | null
}

interface FibonacciLevels {
  levels: Array<{
    ratio: number      // 0.236, 0.382, 0.5, 0.618, 0.786
    price: Decimal
    label: string
  }>
  high: Decimal
  low: Decimal
  direction: 'uptrend' | 'downtrend'
}
```

**RSIService**
```typescript
interface RSIService {
  calculateRSI(prices: Decimal[], period: number): RSIResult
  detectDivergence(prices: Decimal[], rsiValues: number[]): Divergence[]
}

interface RSIResult {
  value: number
  status: 'overbought' | 'oversold' | 'neutral'
  history: Array<{ date: Date; value: number }>
  divergences: Divergence[]
}
```

**MACDService**
```typescript
interface MACDService {
  calculateMACD(prices: Decimal[], fastPeriod: number, slowPeriod: number, signalPeriod: number): MACDResult
  detectCrossover(macdLine: number[], signalLine: number[]): Crossover[]
}

interface MACDResult {
  macdLine: number[]
  signalLine: number[]
  histogram: number[]
  crossovers: Crossover[]
  currentSignal: 'bullish' | 'bearish' | 'neutral'
}
```

**BollingerBandsService**
```typescript
interface BollingerBandsService {
  calculateBands(prices: Decimal[], period: number, stdDev: number): BollingerBandsResult
  detectSqueeze(bands: BollingerBandsResult, lookbackPeriod: number): boolean
}

interface BollingerBandsResult {
  upper: Decimal[]
  middle: Decimal[]
  lower: Decimal[]
  bandwidth: number[]
  currentPosition: 'above_upper' | 'below_lower' | 'within_bands'
}
```

**ATRService**
```typescript
interface ATRService {
  calculateATR(highs: Decimal[], lows: Decimal[], closes: Decimal[], period: number): ATRResult
  suggestStopLoss(currentPrice: Decimal, atr: Decimal, multiplier: number): Decimal
}

interface ATRResult {
  value: Decimal
  history: Array<{ date: Date; value: Decimal }>
  volatilityStatus: 'high' | 'medium' | 'low'
}
```

**SupportResistanceService**
```typescript
interface SupportResistanceService {
  calculateLevels(prices: Decimal[], period: number): SupportResistanceLevels
  findGoldenRatioLevels(high: Decimal, low: Decimal): GoldenRatioLevels
  mergeNearbyLevels(levels: PriceLevel[], tolerance: number): PriceLevel[]
}

interface SupportResistanceLevels {
  supports: PriceLevel[]
  resistances: PriceLevel[]
  currentNearestSupport: PriceLevel | null
  currentNearestResistance: PriceLevel | null
}
```

**TechnicalScoreService**
```typescript
interface TechnicalScoreService {
  calculateScore(symbol: string): TechnicalScore
  getComponentScores(symbol: string): ComponentScores
}

interface TechnicalScore {
  totalScore: number  // 0-100
  rating: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'
  components: ComponentScores
  timestamp: Date
}

interface ComponentScores {
  rsi: { score: number; weight: number }
  macd: { score: number; weight: number }
  bollinger: { score: number; weight: number }
  fibonacci: { score: number; weight: number }
}
```

**CandlestickPatternService**
```typescript
interface CandlestickPatternService {
  identifyPatterns(candles: Candle[]): PatternResult[]
  calculateReliability(pattern: PatternType, context: MarketContext): number
}

interface PatternResult {
  pattern: PatternType
  signal: 'bullish' | 'bearish' | 'neutral'
  reliability: number  // 0-100
  description: string
  date: Date
  atGoldenRatio: boolean
}
```

**StrategyService**
```typescript
interface StrategyService {
  createStrategy(strategy: StrategyInput): Strategy
  backtest(strategyId: string, startDate: Date, endDate: Date): BacktestResult
  evaluateConditions(strategy: Strategy, marketData: MarketData): boolean
}

interface Strategy {
  id: string
  name: string
  conditions: StrategyCondition[]
  logic: 'AND' | 'OR'
}

interface BacktestResult {
  totalTrades: number
  winRate: number
  averageReturn: Decimal
  maxDrawdown: Decimal
  trades: Trade[]
}
```

**IndicatorCacheService**
```typescript
interface IndicatorCacheService {
  get(key: string): CachedIndicator | null
  set(key: string, data: any, ttl: number): void
  invalidate(symbol: string): void
  clear(): void
}
```

## 資料模型

### Prisma Schema 擴展

```prisma
model IndicatorCache {
  id          String   @id @default(cuid())
  symbol      String
  indicatorType String  // 'RSI', 'MACD', 'BOLLINGER', etc.
  period      Int
  data        Json     // 儲存計算結果
  calculatedAt DateTime
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  
  @@unique([symbol, indicatorType, period])
  @@index([symbol, expiresAt])
}

model Strategy {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  description String?
  conditions  Json     // 儲存策略條件
  logic       String   // 'AND' or 'OR'
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  backtests   Backtest[]
  signals     StrategySignal[]
}

model Backtest {
  id          String   @id @default(cuid())
  strategyId  String
  strategy    Strategy @relation(fields: [strategyId], references: [id], onDelete: Cascade)
  startDate   DateTime
  endDate     DateTime
  totalTrades Int
  winRate     Decimal  @db.Decimal(5, 2)
  avgReturn   Decimal  @db.Decimal(10, 4)
  maxDrawdown Decimal  @db.Decimal(10, 4)
  results     Json     // 詳細交易記錄
  createdAt   DateTime @default(now())
  
  @@index([strategyId, createdAt])
}

model StrategySignal {
  id          String   @id @default(cuid())
  strategyId  String
  strategy    Strategy @relation(fields: [strategyId], references: [id], onDelete: Cascade)
  symbol      String
  signalType  String   // 'BUY', 'SELL'
  price       Decimal  @db.Decimal(18, 8)
  conditions  Json     // 觸發條件詳情
  triggeredAt DateTime
  createdAt   DateTime @default(now())
  
  @@index([strategyId, triggeredAt])
  @@index([symbol, triggeredAt])
}

model CandlestickPattern {
  id          String   @id @default(cuid())
  symbol      String
  patternType String   // 'HAMMER', 'DOJI', 'ENGULFING', etc.
  signal      String   // 'BULLISH', 'BEARISH', 'NEUTRAL'
  reliability Int      // 0-100
  price       Decimal  @db.Decimal(18, 8)
  atGoldenRatio Boolean @default(false)
  date        DateTime
  createdAt   DateTime @default(now())
  
  @@index([symbol, date])
}
```


## 正確性屬性

*屬性是一個特徵或行為，應該在系統的所有有效執行中保持為真 - 本質上是關於系統應該做什麼的正式陳述。屬性作為人類可讀規範和機器可驗證正確性保證之間的橋樑。*

### 費波那契計算屬性

**屬性 1：回撤水平完整性**
*對於任何*價格區間（高點和低點），計算回撤水平應該返回所有五個黃金分割比例（23.6%, 38.2%, 50%, 61.8%, 78.6%）的價格
**驗證需求：1.1**

**屬性 2：回撤公式正確性**
*對於任何*高點、低點和回撤比例，計算的回撤價格應該等於：高點 - (高點 - 低點) × 回撤比例
**驗證需求：1.2**

**屬性 3：價格接近度判斷**
*對於任何*目前價格和回撤水平，當價格與水平的差異小於等於 2% 時，系統應該判定為接近
**驗證需求：1.4**

**屬性 4：擴展公式正確性**
*對於任何*起點、回撤點、突破點和擴展比例，計算的目標價格應該等於：突破點 + (起點 - 回撤點) × 擴展比例
**驗證需求：2.2**

**屬性 5：高精度數值運算**
*對於任何*涉及價格的計算，使用 Decimal 類型運算的結果應該與浮點數運算有顯著精度差異
**驗證需求：2.5**

### RSI 指標屬性

**屬性 6：RSI 公式正確性**
*對於任何*價格序列和週期，計算的 RSI 值應該等於：100 - (100 / (1 + RS))，其中 RS = 平均漲幅 / 平均跌幅
**驗證需求：3.2**

**屬性 7：RSI 超買判斷**
*對於任何*RSI 值，當值大於 70 時，系統應該標示為超買狀態
**驗證需求：3.3**

**屬性 8：RSI 超賣判斷**
*對於任何*RSI 值，當值小於 30 時，系統應該標示為超賣狀態
**驗證需求：3.4**

**屬性 9：RSI 背離識別**
*對於任何*價格序列和對應的 RSI 序列，當價格創新高但 RSI 未創新高時，系統應該識別為背離
**驗證需求：3.6**

### MACD 指標屬性

**屬性 10：MACD 黃金交叉識別**
*對於任何*MACD 線和訊號線序列，當 MACD 線從下方向上穿越訊號線時，系統應該標示為黃金交叉
**驗證需求：4.2**

**屬性 11：MACD 死亡交叉識別**
*對於任何*MACD 線和訊號線序列，當 MACD 線從上方向下穿越訊號線時，系統應該標示為死亡交叉
**驗證需求：4.3**

**屬性 12：EMA 公式正確性**
*對於任何*價格序列和週期，計算的 EMA 應該遵循公式：EMA = 前一日 EMA × (1 - α) + 今日價格 × α，其中 α = 2 / (週期 + 1)
**驗證需求：4.6**

### 布林通道屬性

**屬性 13：布林通道計算正確性**
*對於任何*價格序列，布林通道的中軌應該等於 SMA，上軌應該等於中軌 + 2 倍標準差，下軌應該等於中軌 - 2 倍標準差
**驗證需求：5.1**

**屬性 14：布林通道收窄判斷**
*對於任何*布林通道序列，當目前通道寬度小於過去 20 日平均寬度的 50% 時，系統應該標示為盤整狀態
**驗證需求：5.4**

### ATR 指標屬性

**屬性 15：ATR 公式正確性**
*對於任何*價格序列（高、低、收），計算的 ATR 應該遵循公式：ATR = (前一日 ATR × 13 + 今日 TR) / 14，其中 TR = max(高-低, |高-前收|, |低-前收|)
**驗證需求：6.2**

### 支撐壓力位屬性

**屬性 16：價位合併邏輯**
*對於任何*價位集合，當多個價位的差異小於 3% 時，系統應該將它們合併為單一強支撐或強壓力區域
**驗證需求：7.4**

### 技術評分屬性

**屬性 17：評分範圍正確性**
*對於任何*股票的技術指標組合，計算的技術評分應該在 0 到 100 之間（包含邊界）
**驗證需求：8.1**

**屬性 18：強勢看多判斷**
*對於任何*技術評分，當評分大於 70 時，系統應該標示為強勢看多
**驗證需求：8.2**

**屬性 19：弱勢看空判斷**
*對於任何*技術評分，當評分小於 30 時，系統應該標示為弱勢看空
**驗證需求：8.3**

### K線型態屬性

**屬性 20：看漲型態訊號**
*對於任何*識別為看漲的 K線型態，系統應該標示買入訊號並提供型態描述
**驗證需求：9.2**

**屬性 21：看跌型態訊號**
*對於任何*識別為看跌的 K線型態，系統應該標示賣出訊號並提供型態描述
**驗證需求：9.3**

### 策略回測屬性

**屬性 22：回測統計計算正確性**
*對於任何*策略和歷史資料，回測結果應該正確計算勝率（獲利交易數 / 總交易數）、平均報酬和最大回撤
**驗證需求：10.4**

### 快取機制屬性

**屬性 23：快取命中返回**
*對於任何*已快取的指標查詢，系統應該直接返回快取資料而不重新計算
**驗證需求：11.2**

**屬性 24：快取失效機制**
*對於任何*股票，當其價格資料更新時，系統應該自動清除該股票的所有指標快取
**驗證需求：11.3**

## 錯誤處理

### 錯誤類型擴展

```typescript
enum IndicatorErrorCode {
  // 資料不足錯誤
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  INVALID_PERIOD = 'INVALID_PERIOD',
  
  // 計算錯誤
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  INVALID_PRICE_RANGE = 'INVALID_PRICE_RANGE',
  DIVISION_BY_ZERO = 'DIVISION_BY_ZERO',
  
  // 策略錯誤
  INVALID_STRATEGY_CONDITION = 'INVALID_STRATEGY_CONDITION',
  BACKTEST_FAILED = 'BACKTEST_FAILED',
  
  // 快取錯誤
  CACHE_ERROR = 'CACHE_ERROR',
}
```

### 錯誤處理策略

1. **資料不足**：當歷史資料不足以計算指標時，返回錯誤並說明所需的最小資料點數
2. **計算錯誤**：記錄詳細錯誤日誌，返回通用錯誤訊息給使用者
3. **除零錯誤**：在計算前檢查分母，避免除零情況
4. **快取錯誤**：快取失敗時降級為直接計算，不影響使用者體驗

## 測試策略

### TDD 開發流程

遵循「紅-綠-重構」循環：
1. 先寫屬性測試定義正確性
2. 再寫單元測試覆蓋特定案例
3. 實作功能使測試通過
4. 重構優化程式碼

### 單元測試

使用 Jest 測試框架：

1. **指標計算測試**
   - 測試已知輸入的預期輸出
   - 測試邊界情況（空資料、單一資料點）
   - 測試特殊情況（所有價格相同、極端波動）

2. **公式驗證測試**
   - 使用標準範例驗證 RSI、MACD、布林通道公式
   - 與業界標準工具（如 TradingView）的結果比對

3. **型態識別測試**
   - 測試標準 K線型態的識別
   - 測試邊界型態（接近但不完全符合）

### 屬性基礎測試

使用 **fast-check** 框架：

1. **測試配置**
   - 每個屬性測試執行 100 次迭代
   - 使用自訂生成器產生合理的價格資料

2. **測試標註**
   - 格式：`// Feature: technical-indicators, Property {number}: {property_text}`
   - 例如：`// Feature: technical-indicators, Property 2: 回撤公式正確性`

3. **核心屬性測試優先級**
   - 數學公式正確性（屬性 2, 4, 6, 12, 13, 15）：最高優先級
   - 訊號識別正確性（屬性 7-11, 18-21）：高優先級
   - 快取機制（屬性 23-24）：中優先級

4. **測試資料生成器**
   - `arbitraryPriceSequence()`: 生成合理的價格序列
   - `arbitraryFibonacciRange()`: 生成高低點範圍
   - `arbitraryRSIValue()`: 生成 0-100 的 RSI 值
   - `arbitraryCandlestick()`: 生成 K線資料
   - `arbitraryStrategy()`: 生成策略條件

### 整合測試

1. **指標計算流程測試**
   - 測試從取得價格資料到計算指標的完整流程
   - 測試快取機制的整合

2. **策略回測測試**
   - 測試完整的回測流程
   - 驗證統計計算的準確性

### 效能測試

1. **計算效能**
   - 測試大量資料點（1000+ 天）的計算時間
   - 目標：單一指標計算 < 100ms

2. **快取效能**
   - 測試快取命中率
   - 測試快取失效和重建時間

### 測試執行

```bash
# 執行所有測試
npm test

# 執行指標測試
npm run test:indicators

# 執行屬性測試
npm run test:property

# 執行效能測試
npm run test:performance

# 監看模式
npm run test:watch
```

## 效能優化

### 計算優化

1. **增量計算**：對於 EMA、ATR 等指標，使用增量更新而非全量重算
2. **並行計算**：多個指標可並行計算，使用 Promise.all
3. **資料預處理**：一次性計算所有需要的基礎資料（SMA、標準差等）

### 快取策略

1. **多層快取**：
   - L1: 記憶體快取（最近查詢）
   - L2: Redis 快取（熱門股票）
   - L3: 資料庫快取（所有計算結果）

2. **智能失效**：
   - 盤中：快取 5 分鐘
   - 盤後：快取 1 小時
   - 歷史資料：快取 24 小時

3. **預計算**：
   - 熱門股票的指標定期預計算
   - 使用者持股的指標優先計算

### 資料庫優化

1. **索引優化**：在 symbol、date、indicatorType 上建立複合索引
2. **分區策略**：按日期分區儲存歷史資料
3. **資料壓縮**：使用 JSON 壓縮儲存計算結果

## 安全性考量

1. **輸入驗證**：
   - 驗證價格範圍（> 0）
   - 驗證週期參數（> 0 且 < 合理上限）
   - 驗證日期範圍

2. **資源限制**：
   - 限制單次查詢的資料點數量
   - 限制並行計算的指標數量
   - 設定計算超時時間

3. **權限控制**：
   - 策略僅限建立者查看和修改
   - 回測結果僅限策略擁有者存取

## 未來擴展

### 短期規劃
- 支援更多技術指標（KD、威廉指標、OBV）
- 加入更多 K線型態識別
- 支援自訂黃金分割比例

### 長期規劃
- AI 輔助型態識別
- 機器學習優化策略參數
- 即時訊號推送（WebSocket）
- 社群策略分享平台
