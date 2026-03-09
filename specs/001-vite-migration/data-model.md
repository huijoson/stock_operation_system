# 資料模型：Next.js 至 Vite 遷移

**Branch**: `001-vite-migration` | **Date**: 2025-07-17
**來源**: Phase 1 設計 — 實體、關係與狀態轉換

---

## 概述

本功能為基礎架構遷移，**不新增任何資料庫實體或 Prisma schema 變更**。PostgreSQL 資料庫、Prisma ORM 設定及所有資料模型維持不變。

以下記錄遷移過程中涉及的邏輯實體與轉換關係。

---

## 遷移影響範圍實體

### 1. API 路由處理器 (Handler)

| 欄位 | 說明 |
|------|------|
| 原始路徑 | `src/app/api/{domain}/{endpoint}/route.ts` |
| 遷移路徑 | `backend/next-api-legacy/{domain}/{endpoint}/handler.ts` (已完成) |
| 目標狀態 | handler 內部使用標準 Express `(req, res)` 簽名 |
| HTTP 方法 | GET, POST, PUT, DELETE (依端點而異) |
| 認證需求 | 透過 middleware 的 `requireAuth()` 檢查 |

**狀態轉換：**

```
[NextRequest/NextResponse 模式] 
    → 移至 backend/next-api-legacy/ (已完成)
    → 替換為 Express handler 簽名 (本次任務)
    → 整合至獨立 Express 伺服器 (未來功能)
```

### 2. 前端元件分類

| 類別 | 數量 | 遷移動作 |
|------|------|---------|
| 頁面元件 (`src/app/`) | 12 | 無需修改 |
| UI 元件 (`src/components/ui/`) | 8 | ErrorBoundary 修正 process.env |
| 圖表元件 (`src/components/charts/`) | 12 + 4 example | 移除 4 個 'use client' |
| 服務 (`src/services/`) | 23 | 無需修改 |
| Hooks (`src/hooks/`) | 2 | 無需修改 |

### 3. 路由定義

| 路由路徑 | 元件 | 參數 |
|---------|------|------|
| `/` | `HomePage` | — |
| `/dashboard` | `DashboardPage` | — |
| `/portfolios` | `PortfolioListPage` | — |
| `/portfolios/:id` | `PortfolioDetailPage` | `id: string` |
| `/portfolios/:id/holdings/:symbol` | `HoldingDetailPage` | `id: string, symbol: string` |
| `/transactions/:portfolioId` | `TransactionListPage` | `portfolioId: string` |
| `/strategy-builder` | `StrategyBuilderPage` | — |
| `/technical-analysis` | `TechnicalAnalysisPage` | — |
| `/fibonacci-tool` | `FibonacciToolPage` | — |
| `/backtest-results/:id` | `BacktestResultsPage` | `id: string` |
| `/login` | `LoginPage` | — |
| `/register` | `RegisterPage` | — |
| `*` | `NotFoundPage` | — **(新增)** |

---

## API 端點領域模型

### 認證 (Auth) — 4 端點

| 端點 | 方法 | 認證 | 服務層 |
|------|------|------|--------|
| `/api/auth/login` | POST | ❌ | `AuthService.login()` |
| `/api/auth/logout` | POST | ✅ | `AuthService.logout()` |
| `/api/auth/me` | GET | ✅ | `AuthService.getCurrentUser()` |
| `/api/auth/register` | POST | ❌ | `AuthService.register()` |

### 投資組合 (Portfolios) — 4 端點

| 端點 | 方法 | 認證 | 服務層 |
|------|------|------|--------|
| `/api/portfolios` | GET, POST | ✅ | `PortfolioService` |
| `/api/portfolios/:id` | GET, PUT, DELETE | ✅ | `PortfolioService` |
| `/api/portfolios/:id/holdings` | GET | ✅ | `PortfolioService` |
| `/api/portfolios/:id/transactions` | GET | ✅ | `PortfolioService` |

### 交易 (Transactions) — 4 端點

| 端點 | 方法 | 認證 | 服務層 |
|------|------|------|--------|
| `/api/transactions` | POST | ✅ | `TransactionService` |
| `/api/transactions/:id` | PUT, DELETE | ✅ | `TransactionService` |
| `/api/transactions/export` | GET | ✅ | `TransactionService` |
| `/api/transactions/import` | POST | ✅ | `TransactionService` |

### 股票 (Stocks) — 3 端點

| 端點 | 方法 | 認證 | 服務層 |
|------|------|------|--------|
| `/api/stocks/search` | GET | ✅ | `StockService` |
| `/api/stocks/:symbol/price` | GET | ✅ | `StockService` |
| `/api/stocks/:symbol/history` | GET | ✅ | `StockService` |

### 新聞 (News) — 5 端點

| 端點 | 方法 | 認證 | 服務層 |
|------|------|------|--------|
| `/api/news/:symbol` | GET | ✅ | `NewsService` |
| `/api/news/portfolio/:portfolioId` | GET | ✅ | `NewsService` |
| `/api/news/sentiment/:symbol` | GET | ✅ | `NewsService` |
| `/api/news/sources` | GET | ❌ | `NewsService` |
| `/api/dashboard/news` | GET | ✅ | `DashboardNewsService` |

### 技術指標 (Indicators) — 9 端點

| 端點 | 方法 | 認證 | 服務層 |
|------|------|------|--------|
| `/api/indicators/atr` | GET | ✅ | `ATRService` |
| `/api/indicators/macd` | GET | ✅ | `MACDService` |
| `/api/indicators/rsi` | GET | ✅ | `RSIService` |
| `/api/indicators/bollinger` | GET | ✅ | `BollingerService` |
| `/api/indicators/support-resistance` | GET | ✅ | `SupportResistanceService` |
| `/api/indicators/technical-score` | GET | ✅ | `TechnicalScoreService` |
| `/api/indicators/candlestick-patterns` | GET | ✅ | `CandlestickService` |
| `/api/indicators/fibonacci/retracement` | GET | ✅ | `FibonacciService` |
| `/api/indicators/fibonacci/extension` | GET | ✅ | `FibonacciService` |

### 風險評估 (Risk Assessment) — 3 端點

| 端點 | 方法 | 認證 | 服務層 |
|------|------|------|--------|
| `/api/risk-assessment/:symbol` | GET | ✅ | `RiskAssessmentService` |
| `/api/risk-assessment/portfolio/:portfolioId` | GET | ✅ | `RiskAssessmentService` |
| `/api/risk-assessment/batch` | POST | ✅ | `RiskAssessmentService` |

### 持股建議 (Holding Advice) — 2 端點

| 端點 | 方法 | 認證 | 服務層 |
|------|------|------|--------|
| `/api/holding-advice/:symbol` | GET | ✅ | `HoldingAdviceService` |
| `/api/holding-advice/portfolio/:portfolioId` | GET | ✅ | `HoldingAdviceService` |

### 策略 (Strategies) — 3 端點

| 端點 | 方法 | 認證 | 服務層 |
|------|------|------|--------|
| `/api/strategies` | GET, POST | ✅ | `StrategyService` |
| `/api/strategies/:id` | GET, PUT, DELETE | ✅ | `StrategyService` |
| `/api/strategies/:id/backtest` | GET | ✅ | `StrategyService` |

### 其他端點

| 端點 | 方法 | 認證 | 服務層 |
|------|------|------|--------|
| `/api/realized-pl` | GET | ✅ | `RealizedPLService` |
| `/api/realized-pl/portfolio/:portfolioId` | GET | ✅ | `RealizedPLService` |
| `/api/holdings/export` | GET | ✅ | `HoldingsService` |
| `/api/sync/dashboard-news` | POST | ✅ | `DashboardNewsSyncService` |
| `/api/query-tsm` | GET | ✅ | `QueryTSMService` |
| `/api/indicators/cache/clear` | GET, POST | ✅ | `IndicatorCacheService` |

---

## 驗證規則

### 無變更項目（驗證不變）
- Prisma schema（所有模型定義不變）
- 資料庫遷移（無新遷移）
- 表單驗證邏輯（`useFormValidation` hook 不變）
- API 請求/回應資料格式（僅 handler 簽名改變）

### 新增驗證
- 404 路由需正確匹配所有未定義路徑
- Express handler 的錯誤處理需與 NextResponse 錯誤回應格式一致
