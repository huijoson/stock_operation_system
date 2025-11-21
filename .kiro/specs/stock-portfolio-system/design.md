# 設計文件

## 概述

股市投資組合管理系統是一個基於 Web 的應用程式，採用現代化的全端架構。系統使用 Next.js 作為前端框架，提供伺服器端渲染和 API 路由功能；使用 PostgreSQL 作為資料庫，透過 Prisma ORM 進行資料存取；整合外部股價 API 以取得即時和歷史股價資料。

系統的核心價值在於提供準確的財務計算和直觀的資料視覺化，幫助個人投資者更好地管理和分析他們的股票投資組合。

## 架構

### 整體架構

系統採用三層架構：

```
┌─────────────────────────────────────────┐
│         展示層 (Presentation)            │
│  Next.js Pages + React Components       │
│  - 使用者介面                            │
│  - 圖表視覺化                            │
│  - 表單處理                              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         業務邏輯層 (Business Logic)      │
│  Services + API Routes                  │
│  - 投資組合管理                          │
│  - 交易處理                              │
│  - 損益計算                              │
│  - CSV 匯入/匯出                         │
│  - 股價資料整合                          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         資料存取層 (Data Access)         │
│  Prisma ORM + PostgreSQL                │
│  - 使用者資料                            │
│  - 投資組合資料                          │
│  - 交易記錄                              │
│  - 股價快取                              │
└─────────────────────────────────────────┘
```

### 外部整合

```
┌─────────────────────────────────────────┐
│         外部服務 (External Services)     │
│  - Yahoo Finance API                    │
│  - FinMind API                          │
│  - 台灣證券交易所 API                    │
└─────────────────────────────────────────┘
                    ↑
            (HTTP Requests)
                    ↓
┌─────────────────────────────────────────┐
│      股價服務 (Stock Price Service)      │
│  - API 客戶端                            │
│  - 快取管理                              │
│  - 錯誤處理與降級                        │
└─────────────────────────────────────────┘
```

## 元件和介面

### 前端元件

#### 頁面元件
- `LoginPage`: 使用者登入頁面
- `RegisterPage`: 使用者註冊頁面
- `DashboardPage`: 儀表板總覽頁面
- `PortfolioListPage`: 投資組合清單頁面
- `PortfolioDetailPage`: 投資組合詳細頁面
- `TransactionListPage`: 交易記錄頁面
- `StockSearchPage`: 股票搜尋頁面

#### UI 元件
- `PortfolioCard`: 投資組合卡片
- `HoldingTable`: 持股表格
- `TransactionTable`: 交易記錄表格
- `StockSearchBar`: 股票搜尋列
- `ImportDialog`: CSV 匯入對話框
- `ExportButton`: 資料匯出按鈕

#### 圖表元件
- `PieChart`: 圓餅圖（持股市值佔比）
- `LineChart`: 折線圖（績效趨勢）
- `BarChart`: 長條圖（損益分布）

### 後端服務

#### API 路由
- `POST /api/auth/register`: 使用者註冊
- `POST /api/auth/login`: 使用者登入
- `POST /api/auth/logout`: 使用者登出
- `GET /api/portfolios`: 取得投資組合清單
- `POST /api/portfolios`: 建立投資組合
- `PUT /api/portfolios/:id`: 更新投資組合
- `DELETE /api/portfolios/:id`: 刪除投資組合
- `GET /api/portfolios/:id/holdings`: 取得持股清單
- `GET /api/portfolios/:id/transactions`: 取得交易記錄
- `POST /api/transactions`: 建立交易記錄
- `DELETE /api/transactions/:id`: 刪除交易記錄
- `POST /api/transactions/import`: 匯入 CSV 交易記錄
- `GET /api/transactions/export`: 匯出交易記錄
- `GET /api/holdings/export`: 匯出持股資料
- `GET /api/stocks/search`: 搜尋股票
- `GET /api/stocks/:symbol/price`: 取得股票即時價格
- `GET /api/stocks/:symbol/history`: 取得股票歷史價格

#### 業務邏輯服務

**AuthService**
```typescript
interface AuthService {
  register(email: string, password: string): Promise<User>
  login(email: string, password: string): Promise<Session>
  logout(sessionId: string): Promise<void>
  validateSession(sessionId: string): Promise<User | null>
}
```

**PortfolioService**
```typescript
interface PortfolioService {
  createPortfolio(userId: string, name: string): Promise<Portfolio>
  getPortfolios(userId: string): Promise<Portfolio[]>
  updatePortfolio(portfolioId: string, name: string): Promise<Portfolio>
  deletePortfolio(portfolioId: string): Promise<void>
  getHoldings(portfolioId: string): Promise<Holding[]>
}
```

**TransactionService**
```typescript
interface TransactionService {
  createTransaction(transaction: TransactionInput): Promise<Transaction>
  getTransactions(portfolioId: string): Promise<Transaction[]>
  deleteTransaction(transactionId: string): Promise<void>
  importFromCSV(portfolioId: string, file: File, format: 'schwab' | 'firstrade'): Promise<ImportResult>
  exportToCSV(portfolioId: string): Promise<string>
}
```

**CalculationService**
```typescript
interface CalculationService {
  calculateAverageCost(transactions: Transaction[]): Decimal
  calculateUnrealizedPL(holding: Holding, currentPrice: Decimal): Decimal
  calculateRealizedPL(transactions: Transaction[]): Decimal
  calculateTotalPL(portfolio: Portfolio, currentPrices: Map<string, Decimal>): Decimal
  calculateReturnRate(totalPL: Decimal, totalCost: Decimal): Decimal
}
```

**StockService**
```typescript
interface StockService {
  searchStocks(keyword: string): Promise<Stock[]>
  getCurrentPrice(symbol: string): Promise<Decimal>
  getHistoricalPrices(symbol: string, startDate: Date, endDate: Date): Promise<StockPrice[]>
  getCachedPrice(symbol: string): Promise<Decimal | null>
  cachePrice(symbol: string, price: Decimal): Promise<void>
}
```

## 資料模型

### Prisma Schema

```prisma
model User {
  id        String      @id @default(cuid())
  email     String      @unique
  password  String      // 雜湊後的密碼
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  portfolios Portfolio[]
  sessions  Session[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Portfolio {
  id           String        @id @default(cuid())
  name         String
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  holdings     Holding[]
  transactions Transaction[]
}

model Holding {
  id           String    @id @default(cuid())
  portfolioId  String
  portfolio    Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  symbol       String    // 股票代號
  quantity     Decimal   @db.Decimal(18, 8)
  averageCost  Decimal   @db.Decimal(18, 8)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  @@unique([portfolioId, symbol])
}

model Transaction {
  id          String    @id @default(cuid())
  portfolioId String
  portfolio   Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  symbol      String    // 股票代號
  type        String    // 'BUY' 或 'SELL'
  quantity    Decimal   @db.Decimal(18, 8)
  price       Decimal   @db.Decimal(18, 8)
  date        DateTime
  createdAt   DateTime  @default(now())
  
  @@index([portfolioId, date])
}

model Stock {
  id        String   @id @default(cuid())
  symbol    String   @unique
  name      String
  industry  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model StockPrice {
  id        String   @id @default(cuid())
  symbol    String
  price     Decimal  @db.Decimal(18, 8)
  date      DateTime
  createdAt DateTime @default(now())
  
  @@unique([symbol, date])
  @@index([symbol, date])
}
```

### 資料關係

- 一個 User 可以有多個 Portfolio
- 一個 Portfolio 可以有多個 Holding 和 Transaction
- Holding 和 Transaction 透過 symbol 關聯到 Stock
- StockPrice 儲存歷史股價資料，用於快取和歷史分析

## 正確性屬性

*屬性是一個特徵或行為，應該在系統的所有有效執行中保持為真 - 本質上是關於系統應該做什麼的正式陳述。屬性作為人類可讀規範和機器可驗證正確性保證之間的橋樑。*

### 使用者認證屬性

**屬性 1：帳號建立成功性**
*對於任何*有效的電子郵件和密碼組合，呼叫註冊功能應該成功建立新帳號，且該帳號可以在資料庫中查詢到。
**驗證需求：1.1**

**屬性 2：登入往返一致性**
*對於任何*已註冊的使用者，使用正確的憑證登入後，系統應該返回有效的 session，且該 session 可以用來驗證使用者身份。
**驗證需求：1.2**

**屬性 3：錯誤憑證拒絕**
*對於任何*錯誤的登入憑證（不存在的電子郵件或錯誤的密碼），系統應該拒絕登入請求並返回錯誤。
**驗證需求：1.3**

**屬性 4：登出清除狀態**
*對於任何*有效的 session，呼叫登出功能後，該 session 應該被清除且無法再用於驗證使用者身份。
**驗證需求：1.5**

### 投資組合管理屬性

**屬性 5：投資組合建立成功性**
*對於任何*有效的投資組合名稱，建立投資組合應該成功，且該投資組合出現在使用者的投資組合清單中。
**驗證需求：2.1, 2.2**

**屬性 6：投資組合更新一致性**
*對於任何*投資組合，更新名稱後，查詢該投資組合應該返回更新後的名稱。
**驗證需求：2.3**

**屬性 7：投資組合級聯刪除**
*對於任何*投資組合，刪除後，該投資組合及其所有相關的持股和交易記錄都應該從資料庫中移除。
**驗證需求：2.4**

**屬性 8：空白名稱拒絕**
*對於任何*僅包含空白字元的字串，使用該字串建立或更新投資組合應該被拒絕。
**驗證需求：2.5**

### 交易處理屬性

**屬性 9：買入交易增加持股**
*對於任何*買入交易，執行後持股數量應該增加相應的數量，且平均成本應該根據加權平均公式正確更新。
**驗證需求：3.2**

**屬性 10：賣出交易減少持股**
*對於任何*有效的賣出交易（數量不超過持股），執行後持股數量應該減少相應的數量，且已實現損益應該正確計算。
**驗證需求：3.3**

**屬性 11：超額賣出拒絕**
*對於任何*賣出數量超過持股數量的交易，系統應該拒絕該交易。
**驗證需求：3.4**

**屬性 12：交易記錄排序**
*對於任何*投資組合的交易記錄查詢，返回的結果應該按日期排序（從舊到新或從新到舊）。
**驗證需求：3.5**

**屬性 13：交易刪除重新計算**
*對於任何*交易記錄，刪除後，相關持股的數量和平均成本應該重新計算，就像該交易從未發生過一樣。
**驗證需求：3.6**

**屬性 14：無效交易參數拒絕**
*對於任何*數量或價格為零或負數的交易，系統應該拒絕該交易。
**驗證需求：3.7**

### 持股查詢屬性

**屬性 15：持股查詢完整性**
*對於任何*投資組合，查詢持股應該返回所有數量大於零的持股，且每個持股包含股票代號、數量、平均成本和總成本。
**驗證需求：4.1**

**屬性 16：零持股過濾**
*對於任何*數量為零的持股，該持股不應該出現在持股查詢結果中。
**驗證需求：4.2**

### 股價資料屬性

**屬性 17：股價快取一致性**
*對於任何*成功取得的股價資料，系統應該快取該資料，且在快取有效期內，相同的查詢應該返回快取的資料而非重新呼叫外部 API。
**驗證需求：5.4**

**屬性 18：無效股票代號錯誤處理**
*對於任何*無效或不存在的股票代號，查詢股價應該返回錯誤而非崩潰或返回錯誤的資料。
**驗證需求：5.5**

### 損益計算屬性

**屬性 19：未實現損益計算正確性**
*對於任何*持股和目前股價，未實現損益應該等於（目前股價 - 平均成本）× 持股數量。
**驗證需求：6.1**

**屬性 20：總未實現損益聚合正確性**
*對於任何*投資組合，總未實現損益應該等於所有持股的未實現損益之和。
**驗證需求：6.2**

**屬性 21：已實現損益計算正確性**
*對於任何*賣出交易序列，已實現損益應該等於所有賣出交易的（賣出價格 - 買入時平均成本）× 賣出數量之和。
**驗證需求：6.3**

**屬性 22：報酬率計算正確性**
*對於任何*投資組合，報酬率應該等於（總損益 / 總成本）× 100%。
**驗證需求：6.5**

**屬性 23：高精度數值運算**
*對於任何*涉及金額的計算，使用 Decimal 類型進行運算後的結果，應該與使用浮點數運算的結果在精度上有顯著差異（避免浮點數誤差）。
**驗證需求：6.6**

### 圖表資料屬性

**屬性 24：市值佔比總和為 100%**
*對於任何*投資組合的圓餅圖資料，所有持股的市值佔比之和應該等於 100%（誤差在 0.01% 以內）。
**驗證需求：7.1**

**屬性 25：績效趨勢時間序列正確性**
*對於任何*投資組合的績效趨勢資料，時間序列應該按時間順序排列，且每個時間點的總市值計算正確。
**驗證需求：7.2**

### 股票搜尋屬性

**屬性 26：搜尋結果相關性**
*對於任何*搜尋關鍵字（至少兩個字元），返回的所有股票結果應該在股票代號或名稱中包含該關鍵字（不區分大小寫）。
**驗證需求：8.1**

**屬性 27：短關鍵字不觸發搜尋**
*對於任何*少於兩個字元的搜尋關鍵字，系統不應該執行搜尋。
**驗證需求：8.3**

**屬性 28：搜尋結果完整性**
*對於任何*搜尋結果，每個股票應該包含股票代號、名稱和產業資訊。
**驗證需求：8.5**

### CSV 匯入匯出屬性

**屬性 29：CSV 匯入解析正確性**
*對於任何*符合 Schwab 或 Firstrade 格式的 CSV 檔案，系統應該正確解析所有有效的交易記錄，且解析後的交易資料與 CSV 中的資料一致。
**驗證需求：9.1, 9.2, 9.3**

**屬性 30：CSV 匯入錯誤處理**
*對於任何*包含無效資料行的 CSV 檔案，系統應該跳過無效的行，成功匯入有效的行，並報告錯誤的行數。
**驗證需求：9.4, 9.5**

**屬性 31：CSV 匯入冪等性**
*對於任何*CSV 檔案，匯入兩次應該產生與匯入一次相同的結果（重複的交易應該被跳過）。
**驗證需求：9.6**

**屬性 32：匯入後持股更新正確性**
*對於任何*匯入的交易記錄，匯入完成後，相關投資組合的持股和損益計算應該正確更新，就像這些交易是手動輸入的一樣。
**驗證需求：9.7**

**屬性 33：CSV 匯出往返一致性**
*對於任何*投資組合的交易記錄，匯出為 CSV 後再匯入，應該產生相同的交易記錄（往返一致性）。
**驗證需求：10.1**

**屬性 34：CSV 匯出編碼正確性**
*對於任何*包含中文字元的資料，匯出的 CSV 檔案應該使用 UTF-8 編碼，且在文字編輯器中開啟時中文字元顯示正確。
**驗證需求：10.4**

## 錯誤處理

### 錯誤類型

系統定義以下錯誤類型：

```typescript
enum ErrorCode {
  // 認證錯誤
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // 驗證錯誤
  INVALID_INPUT = 'INVALID_INPUT',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  INVALID_PORTFOLIO_NAME = 'INVALID_PORTFOLIO_NAME',
  
  // 業務邏輯錯誤
  INSUFFICIENT_HOLDINGS = 'INSUFFICIENT_HOLDINGS',
  INVALID_TRANSACTION = 'INVALID_TRANSACTION',
  PORTFOLIO_NOT_FOUND = 'PORTFOLIO_NOT_FOUND',
  
  // 外部服務錯誤
  STOCK_API_ERROR = 'STOCK_API_ERROR',
  STOCK_NOT_FOUND = 'STOCK_NOT_FOUND',
  
  // 檔案處理錯誤
  CSV_PARSE_ERROR = 'CSV_PARSE_ERROR',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  
  // 系統錯誤
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

interface AppError {
  code: ErrorCode
  message: string
  details?: any
}
```

### 錯誤處理策略

1. **輸入驗證錯誤**：在 API 層級進行驗證，返回 400 Bad Request 和詳細的錯誤訊息
2. **認證錯誤**：返回 401 Unauthorized，前端導向登入頁面
3. **授權錯誤**：返回 403 Forbidden，顯示無權限訊息
4. **資源不存在**：返回 404 Not Found
5. **業務邏輯錯誤**：返回 422 Unprocessable Entity 和業務錯誤訊息
6. **外部 API 錯誤**：
   - 使用快取資料作為降級方案
   - 記錄錯誤日誌
   - 返回 503 Service Unavailable 或使用快取資料
7. **資料庫錯誤**：記錄詳細錯誤，返回 500 Internal Server Error 和通用錯誤訊息
8. **CSV 解析錯誤**：收集所有錯誤行，返回部分成功結果和錯誤報告

### 錯誤日誌

所有錯誤應該記錄到日誌系統，包含：
- 錯誤類型和訊息
- 請求上下文（使用者 ID、請求路徑、參數）
- 時間戳記
- 堆疊追蹤（僅限伺服器端錯誤）

## 測試策略

### TDD 開發流程

本專案採用**測試驅動開發（TDD）**方法，遵循「紅-綠-重構」循環：

1. **紅（Red）**：先寫測試，測試失敗（因為功能尚未實作）
2. **綠（Green）**：實作最小可行的程式碼使測試通過
3. **重構（Refactor）**：優化程式碼，確保測試仍然通過

### 測試優先順序

在 TDD 流程中，按以下順序開發：

1. **先寫屬性測試** - 定義正確性屬性，確保核心邏輯正確
2. **再寫單元測試** - 測試特定範例和邊界情況
3. **實作功能** - 編寫最小可行的程式碼使測試通過
4. **重構** - 優化程式碼結構和效能

### 單元測試

使用 Jest 作為測試框架，針對以下模組編寫單元測試：

1. **計算邏輯測試**
   - 平均成本計算
   - 損益計算
   - 報酬率計算
   - 測試已知的邊界情況（例如：零持股、單筆交易）

2. **CSV 解析測試**
   - Schwab 格式解析
   - Firstrade 格式解析
   - 測試特定的格式範例

3. **驗證邏輯測試**
   - 電子郵件格式驗證
   - 密碼強度驗證
   - 交易參數驗證

4. **API 路由測試**
   - 測試各 API 端點的基本功能
   - 測試認證和授權
   - 測試錯誤情況

### 屬性基礎測試

使用 **fast-check** 作為屬性基礎測試框架，針對正確性屬性編寫測試：

1. **測試配置**
   - 每個屬性測試至少執行 100 次迭代
   - 使用自訂生成器產生符合業務規則的測試資料

2. **測試標註**
   - 每個屬性測試必須使用註解標註對應的設計文件屬性
   - 格式：`// Feature: stock-portfolio-system, Property {number}: {property_text}`
   - 例如：`// Feature: stock-portfolio-system, Property 9: 買入交易增加持股`

3. **核心屬性測試**
   - 財務計算屬性（屬性 19-23）：最高優先級，必須確保數值計算的正確性
   - 交易處理屬性（屬性 9-14）：測試交易邏輯的正確性和一致性
   - CSV 往返屬性（屬性 29-34）：測試資料匯入匯出的一致性
   - 投資組合管理屬性（屬性 5-8）：測試 CRUD 操作的正確性

4. **測試資料生成器**
   - `arbitraryUser()`: 生成隨機使用者資料
   - `arbitraryPortfolio()`: 生成隨機投資組合
   - `arbitraryTransaction()`: 生成隨機交易（確保業務規則有效）
   - `arbitraryHolding()`: 生成隨機持股
   - `arbitraryPrice()`: 生成隨機股價（正數，合理範圍）
   - `arbitraryCSV()`: 生成隨機 CSV 資料

### TDD 實作範例

以「買入交易增加持股」功能為例：

```typescript
// 步驟 1：先寫屬性測試（紅）
describe('Property 9: 買入交易增加持股', () => {
  it('對於任何買入交易，持股數量應該增加', () => {
    fc.assert(
      fc.property(
        arbitraryPortfolio(),
        arbitraryBuyTransaction(),
        (portfolio, transaction) => {
          const initialQuantity = getHoldingQuantity(portfolio, transaction.symbol)
          executeTransaction(portfolio, transaction)
          const finalQuantity = getHoldingQuantity(portfolio, transaction.symbol)
          
          expect(finalQuantity).toBe(initialQuantity + transaction.quantity)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// 步驟 2：實作功能使測試通過（綠）
function executeTransaction(portfolio: Portfolio, transaction: Transaction) {
  // 實作買入邏輯
}

// 步驟 3：重構優化程式碼
```

### 整合測試

1. **資料庫整合測試**
   - 使用測試資料庫
   - 測試 Prisma 模型和關聯
   - 測試交易和回滾

2. **外部 API 整合測試**
   - 使用 mock 服務模擬外部 API
   - 測試錯誤處理和降級策略
   - 測試快取機制

3. **端到端測試**
   - 使用 Playwright 或 Cypress
   - 測試關鍵使用者流程：
     - 註冊 → 登入 → 建立投資組合 → 新增交易 → 查看損益
     - 匯入 CSV → 驗證持股更新
     - 匯出 CSV → 驗證資料完整性

### 測試覆蓋率目標

- 單元測試：80% 程式碼覆蓋率
- 屬性測試：100% 正確性屬性覆蓋率
- 整合測試：覆蓋所有 API 端點
- 端到端測試：覆蓋所有主要使用者流程

### 測試執行

```bash
# 執行所有測試
npm test

# 執行單元測試
npm run test:unit

# 執行屬性測試
npm run test:property

# 執行整合測試
npm run test:integration

# 執行端到端測試
npm run test:e2e

# 監看模式（TDD 開發時使用）
npm run test:watch

# 產生覆蓋率報告
npm run test:coverage
```
