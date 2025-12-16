# 實作計畫：投資組合洞察優化

**分支**: `001-portfolio-insights` | **日期**: 2025-11-27 | **規格書**: [spec.md](spec.md)
**輸入**: `/specs/001-portfolio-insights/spec.md` 功能規格書

## 摘要

本功能為美股投資組合管理系統新增：
1. **已實現損益計算** - 採用 FIFO（先進先出）法則計算賣出交易的損益
2. **技術分析風險評估** - 整合現有 RSI、MACD、布林通道、費波那契指標計算持股風險
3. **持股操作建議** - 基於技術分析結果提供減碼/持有/加碼建議
4. **新聞整合與情緒分析** - 從外部 API 取得新聞並納入風險評估
5. **介面優化** - 改善儀表板直覺性與行動裝置適用性

技術方法：擴展現有 Next.js 15 + Prisma + PostgreSQL 架構，新增 5 個資料庫模型，建立 4 個新服務層，整合外部新聞 API（Finnhub/Alpha Vantage），並使用每日批次快取機制。

## 技術上下文

**語言/版本**: TypeScript 5.3+ (strict mode)  
**主要依賴**: Next.js 15 (App Router), React 18, Prisma ORM, Decimal.js, Tailwind CSS  
**儲存層**: PostgreSQL（現有資料庫，需新增 5 個資料表）  
**測試框架**: Jest + fast-check (property-based testing)  
**目標平台**: Web (桌面 + 行動裝置響應式設計)  
**專案類型**: Web 應用程式  
**效能目標**: API 回應 < 200ms，頁面載入 < 3 秒（依 Constitution 規範）  
**限制條件**: 新聞 API 有速率限制（Finnhub Free: 60 calls/min），需實作快取策略  
**規模範圍**: 單用戶多投資組合，預估 100+ 持股、1000+ 交易紀錄

## 架構驗證

**使用者需求**: 「用主流的現代架構來實現、目前已使用在專案內的架構嚴格確認是否有需要替換、資料庫目前有資料，需要考量進去」

### 現有架構評估

| 元件 | 現有技術 | 是否主流 | 替換建議 |
|-----|---------|---------|---------|
| 框架 | Next.js 15 (App Router) | ✅ 是 - 2024 最新 | **不需替換** |
| React | React 18 | ✅ 是 | **不需替換** |
| 資料庫 | PostgreSQL + Prisma | ✅ 是 - 業界標準 | **不需替換** |
| 樣式 | Tailwind CSS | ✅ 是 | **不需替換** |
| 財務計算 | Decimal.js | ✅ 是 - 業界標準 | **不需替換** |
| 測試 | Jest + fast-check | ✅ 是 | **不需替換** |
| HTTP Client | axios | ✅ 是 | **不需替換** |

### 資料庫遷移策略

- 現有資料庫已有資料（User, Portfolio, Holding, Transaction, Stock, StockPrice 等）
- 新增資料表採用 **加法式遷移**，不修改既有欄位
- 已實現損益需回溯計算現有 SELL 交易
- 遷移腳本需包含資料回填邏輯

### 結論：無需替換現有架構

專案已使用主流現代技術棧，完全符合 2024 年 Web 開發最佳實踐：
- Next.js 15 是最新穩定版本
- Prisma ORM 提供型別安全的資料庫存取
- 現有服務架構（TechnicalScoreService 等）設計良好，可直接擴展

## Constitution 檢查

*閘門：Phase 0 研究前必須通過。Phase 1 設計後重新檢查。*

### I. 程式碼品質 (NON-NEGOTIABLE) ✅

| 規則 | 符合狀態 | 備註 |
|------|---------|------|
| TypeScript strict mode | ✅ | tsconfig.json 已啟用 `"strict": true` |
| Decimal.js 財務計算 | ✅ | 現有服務已使用，新服務延續使用 |
| 明確返回型別 | ✅ | 現有服務均有明確型別宣告 |
| 禁止 any 型別 | ✅ | 無違規 |
| 業務邏輯於 /src/services/ | ✅ | 新增服務遵循相同模式 |
| Prisma ORM 存取資料庫 | ✅ | 不使用 raw SQL |

### II. 測試標準 (NON-NEGOTIABLE) ✅

| 規則 | 符合狀態 | 備註 |
|------|---------|------|
| TDD 開發 | ✅ 計畫中 | 新服務先寫測試 |
| Property-based 測試 | ✅ 計畫中 | FIFO 計算需 fast-check 驗證 |
| 服務覆蓋率 80% | ✅ 計畫中 | 新增服務需達標 |
| 測試 < 60 秒 | ✅ | 現有套件執行正常 |

### III. 使用者體驗一致性 ✅

| 規則 | 符合狀態 | 備註 |
|------|---------|------|
| Tailwind CSS | ✅ | 延續現有樣式系統 |
| 可重用元件於 /src/components/ui/ | ✅ | 新 UI 元件遵循 |
| Loading 狀態處理 | ✅ | 使用現有 loading.tsx 模式 |
| 錯誤處理 UX | ✅ | 遵循 error-handling-ux-guide.md |
| 鍵盤無障礙 | ✅ 計畫中 | 新元件需支援 |
| 繁體中文 (zh-TW) | ✅ | 所有使用者介面文字 |

### IV. 效能要求 ✅

| 規則 | 符合狀態 | 備註 |
|------|---------|------|
| API 回應 < 200ms | ✅ 計畫中 | 需快取策略配合 |
| 頁面載入 < 3 秒 | ✅ 計畫中 | 延遲載入新聞區塊 |
| 避免 N+1 查詢 | ✅ 計畫中 | Prisma include 預載 |
| 快取重計算 | ✅ | 使用 IndicatorCacheService 模式 |

### V. 文件語言 (NON-NEGOTIABLE) ✅

| 規則 | 符合狀態 | 備註 |
|------|---------|------|
| 規格書 zh-TW | ✅ | spec.md 已使用 |
| 實作計畫 zh-TW | ✅ | 本文件使用 |
| 使用者介面 zh-TW | ✅ 計畫中 | 所有 UI 文字 |

**Gate 結果**: ✅ 通過 - 無違規項目

## 專案結構

### 文件結構 (本功能)

```text
specs/001-portfolio-insights/
├── plan.md              # 本文件
├── research.md          # Phase 0 輸出
├── data-model.md        # Phase 1 輸出
├── quickstart.md        # Phase 1 輸出
├── contracts/           # Phase 1 輸出 (API 合約)
│   ├── realized-pl.yaml
│   ├── risk-assessment.yaml
│   ├── holding-advice.yaml
│   └── stock-news.yaml
└── tasks.md             # Phase 2 輸出
```

### 原始碼結構 (延續現有架構)

```text
src/
├── app/
│   ├── api/
│   │   ├── realized-pl/           # 新增：已實現損益 API
│   │   ├── risk-assessment/       # 新增：風險評估 API
│   │   ├── holding-advice/        # 新增：持股建議 API
│   │   └── news/                  # 新增：新聞 API
│   └── dashboard/
│       └── page.tsx               # 修改：增加已實現損益區塊
├── components/
│   ├── portfolio/
│   │   ├── RealizedPLCard.tsx     # 新增：已實現損益卡片
│   │   ├── RiskBadge.tsx          # 新增：風險等級徽章
│   │   └── HoldingAdvicePanel.tsx # 新增：持股建議面板
│   └── news/                      # 新增：新聞元件目錄
│       ├── NewsCard.tsx
│       ├── NewsList.tsx
│       └── CredibilityBadge.tsx
├── services/
│   ├── realized-pl.service.ts     # 新增：FIFO 損益計算
│   ├── risk-assessment.service.ts # 新增：風險評估整合
│   ├── holding-advice.service.ts  # 新增：持股建議生成
│   └── news.service.ts            # 新增：新聞取得與情緒分析
└── types/
    └── insights.ts                # 新增：洞察功能型別

prisma/
├── schema.prisma                  # 修改：新增 5 個模型
└── migrations/
    └── 2024XXXX_portfolio_insights/ # 新增：遷移檔案

tests/
├── property/
│   ├── realized-pl.property.test.ts    # 新增
│   ├── risk-assessment.property.test.ts # 新增
│   └── news-sentiment.property.test.ts  # 新增
└── unit/
    ├── realized-pl.service.test.ts      # 新增
    ├── risk-assessment.service.test.ts  # 新增
    ├── holding-advice.service.test.ts   # 新增
    └── news.service.test.ts             # 新增
```

**結構決策**: 延續現有 Next.js App Router 單體架構，於 `/src/services/` 新增業務邏輯服務，於 `/src/app/api/` 新增 REST API 端點，符合專案既有模式。

## 複雜度追蹤

> 無 Constitution 違規項目，無需填寫本節

---

## Post-Design Constitution 檢查

*Phase 1 設計完成後重新驗證*

### 設計產出符合性

| 原則 | 設計符合狀態 | 備註 |
|------|-------------|------|
| **I. 程式碼品質** | ✅ | data-model.md 使用 Prisma + Decimal 型別 |
| **II. 測試標準** | ✅ | quickstart.md 規劃 TDD 順序與 property tests |
| **III. UX 一致性** | ✅ | contracts/ 包含 zh-TW 顯示標籤 |
| **IV. 效能要求** | ✅ | research.md 包含快取策略與速率限制處理 |
| **V. 文件語言** | ✅ | 所有產出文件使用 zh-TW |

### 新增實體驗證

| 實體 | Decimal.js 使用 | 驗證規則定義 | 關聯正確性 |
|------|----------------|-------------|-----------|
| TaxLot | ✅ Decimal(18,8) | ✅ 含驗證規則 | ✅ Portfolio, Transaction |
| RealizedPL | ✅ Decimal(18,8) | ✅ 含驗證規則 | ✅ Portfolio, Transaction, TaxLot |
| RiskAssessment | ✅ Decimal(3,2) 權重 | ✅ 風險等級邏輯 | ✅ HoldingAdvice |
| HoldingAdvice | ❌ 無財務欄位 | ✅ adviceType enum | ✅ RiskAssessment |
| StockNews | ✅ Decimal(4,3) 情緒 | ✅ credibility enum | ❌ 獨立實體 |
| NewsSourceRating | ❌ 無財務欄位 | ✅ credibilityLevel | ❌ 參照用 |

### API 合約驗證

| 端點 | < 200ms 可達成 | zh-TW 標籤 | 錯誤處理 |
|------|---------------|-----------|---------|
| /api/realized-pl | ✅ 預計算 | ✅ | ✅ 401, 404 |
| /api/risk-assessment | ✅ 快取 | ✅ | ✅ 404 + INSUFFICIENT_DATA |
| /api/holding-advice | ✅ 快取 | ✅ disclaimer | ✅ 404 |
| /api/news | ✅ 15 min 快取 | ✅ | ✅ 503 + retryAfter |

**Post-Design Gate 結果**: ✅ 通過 - 設計完全符合 Constitution 規範

---

## 生成的產出物

| 產出物 | 路徑 | 狀態 |
|-------|------|------|
| 實作計畫 | [plan.md](plan.md) | ✅ 完成 |
| 研究報告 | [research.md](research.md) | ✅ 完成 |
| 資料模型 | [data-model.md](data-model.md) | ✅ 完成 |
| API 合約 | [contracts/](contracts/) | ✅ 完成 |
| 快速開始 | [quickstart.md](quickstart.md) | ✅ 完成 |
| 任務清單 | tasks.md | ⏳ 待 /speckit.tasks 生成 |
