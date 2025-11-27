# Tasks: 投資組合洞察優化 (001-portfolio-insights)

**Input**: Design documents from `/specs/001-portfolio-insights/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: TDD 開發 - 測試先行，依 Constitution 規範服務覆蓋率 >= 80%

**Organization**: 任務依使用者故事分組，每個故事可獨立實作與測試

---

## 格式說明: `[ID] [P?] [Story?] Description`

- **[P]**: 可平行執行（不同檔案、無相依性）
- **[Story]**: 所屬使用者故事（例如 US1, US2...）
- 描述中包含確切檔案路徑

---

## Phase 1: Setup（環境設定）

**Purpose**: 專案環境與相依套件確認

- [X] T001 確認 .env.local 包含 `FINNHUB_API_KEY` 環境變數
- [X] T002 [P] 建立新聞相關型別定義於 src/types/insights.ts
- [X] T003 [P] 建立新聞來源常數定義於 src/constants/news-sources.ts
- [X] T004 [P] 建立情緒分析關鍵字常數於 src/constants/sentiment-keywords.ts

---

## Phase 2: Foundational（基礎建設）

**Purpose**: 核心基礎設施，所有使用者故事的共同相依

**⚠️ CRITICAL**: 此階段完成前，不可開始任何使用者故事

### 資料庫遷移

- [X] T005 新增 TaxLot, RealizedPL, RiskAssessment, HoldingAdvice, StockNews, NewsSourceRating 模型於 prisma/schema.prisma
- [X] T006 更新 Portfolio 模型新增 taxLots, realizedPLs 關聯於 prisma/schema.prisma
- [X] T007 更新 Transaction 模型新增 taxLot, realizedPLs 關聯於 prisma/schema.prisma
- [X] T008 執行資料庫遷移 `npx prisma migrate dev --name add_portfolio_insights`
- [X] T009 建立 NewsSourceRating 種子資料於 prisma/seed.ts（官方、主流媒體預設來源）

### 資料回填腳本

- [X] T010 建立 TaxLot 回填腳本於 scripts/backfill-tax-lots.ts（從現有 BUY 交易建立）
- [X] T011 建立 RealizedPL 回填腳本於 scripts/backfill-realized-pl.ts（從現有 SELL 交易計算）
- [X] T012 建立回填驗證腳本於 scripts/validate-insights.ts

### 共用服務基礎

- [X] T013 [P] 擴展 IndicatorCacheService 支援 'RISK_ASSESSMENT' 快取類型於 src/services/indicator-cache.service.ts

**Checkpoint**: 基礎設施完成 - 使用者故事開發可開始

---

## Phase 3: User Story 1 - 查看已實現損益 (Priority: P1) 🎯 MVP

**Goal**: 使用者可在儀表板查看已實現損益（FIFO 計算）

**Independent Test**: 新增一筆賣出交易後，驗證已實現損益數值正確計算並顯示

### 測試（TDD - 先寫測試）

- [X] T014 [P] [US1] 建立 FIFO 計算 property-based 測試於 tests/property/realized-pl.property.test.ts
- [X] T015 [P] [US1] 建立 RealizedPLService 單元測試於 tests/unit/realized-pl.service.test.ts
- [X] T016 [P] [US1] 建立已實現損益 API 整合測試於 tests/integration/realized-pl.api.test.ts

### 實作

- [X] T017 [US1] 實作 RealizedPLService FIFO 核心邏輯於 src/services/realized-pl.service.ts
- [X] T018 [US1] 實作 TaxLotService 成本批次管理於 src/services/tax-lot.service.ts
- [X] T019 [US1] 實作 /api/realized-pl GET 端點（總覽）於 src/app/api/realized-pl/route.ts
- [X] T020 [US1] 實作 /api/realized-pl/portfolio/[portfolioId] GET 端點於 src/app/api/realized-pl/portfolio/[portfolioId]/route.ts
- [X] T021 [US1] 建立時間篩選器邏輯（本月、本季、本年、全部）於 src/lib/utils/date-filters.ts

### UI 元件

- [X] T022 [P] [US1] 建立 RealizedPLCard 元件於 src/components/portfolio/RealizedPLCard.tsx
- [X] T023 [P] [US1] 建立 RealizedPLBreakdown 元件（按股票明細）於 src/components/portfolio/RealizedPLBreakdown.tsx
- [X] T024 [US1] 整合已實現損益區塊至儀表板於 src/app/dashboard/page.tsx

### 交易整合

- [X] T025 [US1] 修改交易新增流程，BUY 時自動建立 TaxLot 於 src/services/transaction.service.ts
- [X] T026 [US1] 修改交易新增流程，SELL 時自動計算 RealizedPL 於 src/services/transaction.service.ts

**Checkpoint**: User Story 1 完成 - 已實現損益功能可獨立運作與測試

---

## Phase 4: User Story 2 - 持股風險評估 (Priority: P2)

**Goal**: 使用者可查看每檔持股的風險評分（0-100）與風險等級

**Independent Test**: 選擇一檔持股，驗證顯示風險評分與等級，且評分邏輯與技術指標一致

### 測試（TDD - 先寫測試）

- [X] T027 [P] [US2] 建立風險評估 property-based 測試於 tests/property/risk-assessment.property.test.ts
- [X] T028 [P] [US2] 建立 RiskAssessmentService 單元測試於 tests/unit/risk-assessment.service.test.ts

### 實作

- [X] T029 [US2] 實作 RiskAssessmentService 核心邏輯於 src/services/risk-assessment.service.ts
- [X] T030 [US2] 整合 TechnicalScoreService（技術分數反轉為風險分數）於 src/services/risk-assessment.service.ts
- [X] T031 [US2] 實作 /api/risk-assessment/[symbol] GET 端點於 src/app/api/risk-assessment/[symbol]/route.ts
- [X] T032 [US2] 實作 /api/risk-assessment/portfolio/[portfolioId] GET 端點於 src/app/api/risk-assessment/portfolio/[portfolioId]/route.ts
- [X] T033 [US2] 實作 /api/risk-assessment/batch POST 端點（批次計算）於 src/app/api/risk-assessment/batch/route.ts
- [X] T034 [US2] 實作風險評估 24 小時快取機制於 src/services/risk-assessment.service.ts

### UI 元件

- [X] T035 [P] [US2] 建立 RiskBadge 元件（風險等級徽章）於 src/components/portfolio/RiskBadge.tsx
- [X] T036 [P] [US2] 建立 RiskAssessmentPanel 元件（詳細評估）於 src/components/portfolio/RiskAssessmentPanel.tsx
- [X] T037 [P] [US2] 建立 TechnicalIndicatorBreakdown 元件（各指標明細）於 src/components/portfolio/TechnicalIndicatorBreakdown.tsx
- [ ] T038 [US2] 整合 RiskBadge 至持股卡片於 src/components/portfolio/HoldingCard.tsx
- [X] T039 [US2] 建立「資料不足，無法評估」提示元件於 src/components/portfolio/InsufficientDataNotice.tsx

**Checkpoint**: User Story 2 完成 - 風險評估功能可獨立運作與測試

---

## Phase 5: User Story 3 - 持股建議方針 (Priority: P3)

**Goal**: 使用者可查看每檔持股的操作建議（減碼/持有/加碼）與理由

**Independent Test**: 選擇已有風險評估的持股，驗證顯示具體操作建議和理由說明

**Dependencies**: 依賴 Phase 4 (US2) 的 RiskAssessmentService

### 測試（TDD - 先寫測試）

- [ ] T040 [P] [US3] 建立 HoldingAdviceService 單元測試於 tests/unit/holding-advice.service.test.ts

### 實作

- [ ] T041 [US3] 實作 HoldingAdviceService 核心邏輯於 src/services/holding-advice.service.ts
- [ ] T042 [US3] 實作建議生成規則（風險等級 + 技術指標訊號）於 src/services/holding-advice.service.ts
- [ ] T043 [US3] 實作 /api/holding-advice/[symbol] GET 端點於 src/app/api/holding-advice/[symbol]/route.ts
- [ ] T044 [US3] 實作 /api/holding-advice/portfolio/[portfolioId] GET 端點於 src/app/api/holding-advice/portfolio/[portfolioId]/route.ts

### UI 元件

- [ ] T045 [P] [US3] 建立 HoldingAdvicePanel 元件於 src/components/portfolio/HoldingAdvicePanel.tsx
- [ ] T046 [P] [US3] 建立 AdviceTypeBadge 元件（減碼/持有/加碼標籤）於 src/components/portfolio/AdviceTypeBadge.tsx
- [ ] T047 [P] [US3] 建立 DisclaimerNotice 元件（免責聲明）於 src/components/ui/DisclaimerNotice.tsx
- [ ] T048 [US3] 整合持股建議至持股詳情頁於 src/app/portfolios/[id]/holdings/[symbol]/page.tsx

**Checkpoint**: User Story 3 完成 - 持股建議功能可獨立運作與測試

---

## Phase 6: User Story 5 - 持股新聞資訊整合 (Priority: P5)

**Goal**: 使用者可在持股詳情頁面看到該股票的最新相關新聞

**Independent Test**: 查看某檔持股，驗證顯示該股票相關的最新新聞列表（標題、來源、發布時間）

### 測試（TDD - 先寫測試）

- [ ] T049 [P] [US5] 建立 NewsService 單元測試於 tests/unit/news.service.test.ts
- [ ] T050 [P] [US5] 建立 FinnhubClient 單元測試於 tests/unit/finnhub-client.test.ts

### 實作

- [ ] T051 [US5] 實作 FinnhubClient 封裝外部 API 於 src/lib/api/finnhub-client.ts
- [ ] T052 [US5] 實作 NewsService 核心邏輯於 src/services/news.service.ts
- [ ] T053 [US5] 實作新聞 15 分鐘快取機制於 src/services/news.service.ts
- [ ] T054 [US5] 實作速率限制處理（60 calls/min）於 src/lib/api/rate-limiter.ts
- [ ] T055 [US5] 實作 /api/news/[symbol] GET 端點於 src/app/api/news/[symbol]/route.ts
- [ ] T056 [US5] 實作 /api/news/portfolio/[portfolioId] GET 端點於 src/app/api/news/portfolio/[portfolioId]/route.ts
- [ ] T057 [US5] 實作備援機制（Finnhub 失敗時使用 SEC EDGAR）於 src/services/news.service.ts

### UI 元件

- [ ] T058 [P] [US5] 建立 NewsCard 元件於 src/components/news/NewsCard.tsx
- [ ] T059 [P] [US5] 建立 NewsList 元件於 src/components/news/NewsList.tsx
- [ ] T060 [P] [US5] 建立 NewsLoadingState 元件（非同步載入狀態）於 src/components/news/NewsLoadingState.tsx
- [ ] T061 [P] [US5] 建立 NewsErrorState 元件（「新聞載入失敗，請稍後再試」）於 src/components/news/NewsErrorState.tsx
- [ ] T062 [US5] 整合新聞區塊至持股詳情頁於 src/app/portfolios/[id]/holdings/[symbol]/page.tsx

**Checkpoint**: User Story 5 完成 - 新聞整合功能可獨立運作與測試

---

## Phase 7: User Story 6 - 新聞可信度驗證 (Priority: P6)

**Goal**: 使用者可看到每則新聞的來源可信度標示

**Independent Test**: 查看新聞列表，驗證每則新聞旁顯示來源可信度標示（官方/主流媒體/未驗證）

**Dependencies**: 依賴 Phase 6 (US5) 的 NewsService

### 測試（TDD - 先寫測試）

- [ ] T063 [P] [US6] 建立 CredibilityService 單元測試於 tests/unit/credibility.service.test.ts

### 實作

- [ ] T064 [US6] 實作 CredibilityService 來源分類邏輯於 src/services/credibility.service.ts
- [ ] T065 [US6] 整合 CredibilityService 至 NewsService 於 src/services/news.service.ts
- [ ] T066 [US6] 實作 /api/news/sources GET 端點（來源評等清單）於 src/app/api/news/sources/route.ts

### UI 元件

- [ ] T067 [P] [US6] 建立 CredibilityBadge 元件於 src/components/news/CredibilityBadge.tsx
- [ ] T068 [US6] 整合 CredibilityBadge 至 NewsCard 於 src/components/news/NewsCard.tsx

**Checkpoint**: User Story 6 完成 - 可信度驗證功能可獨立運作與測試

---

## Phase 8: User Story 7 - 新聞情緒納入風險評估 (Priority: P7)

**Goal**: 風險評分同時考量技術面（80%）和新聞情緒面（20%）

**Independent Test**: 比較有負面新聞和無負面新聞的同類股票，驗證負面新聞確實會提高風險評分

**Dependencies**: 依賴 Phase 4 (US2) RiskAssessmentService 與 Phase 6 (US5) NewsService

### 測試（TDD - 先寫測試）

- [ ] T069 [P] [US7] 建立新聞情緒分析 property-based 測試於 tests/property/news-sentiment.property.test.ts
- [ ] T070 [P] [US7] 建立 SentimentAnalysisService 單元測試於 tests/unit/sentiment-analysis.service.test.ts

### 實作

- [ ] T071 [US7] 實作 SentimentAnalysisService 關鍵字比對邏輯於 src/services/sentiment-analysis.service.ts
- [ ] T072 [US7] 整合新聞情緒至 RiskAssessmentService（80/20 權重）於 src/services/risk-assessment.service.ts
- [ ] T073 [US7] 實作 /api/news/sentiment/[symbol] GET 端點於 src/app/api/news/sentiment/[symbol]/route.ts
- [ ] T074 [US7] 實作「不含新聞情緒分析」標示（情緒服務不可用時）於 src/services/risk-assessment.service.ts

### UI 元件

- [ ] T075 [P] [US7] 建立 SentimentBadge 元件於 src/components/news/SentimentBadge.tsx
- [ ] T076 [US7] 整合 SentimentBadge 至 NewsCard 於 src/components/news/NewsCard.tsx
- [ ] T077 [US7] 更新 RiskAssessmentPanel 顯示新聞情緒貢獻於 src/components/portfolio/RiskAssessmentPanel.tsx

**Checkpoint**: User Story 7 完成 - 新聞情緒整合風險評估功能可獨立運作與測試

---

## Phase 9: User Story 4 - 介面優化與導航改善 (Priority: P4)

**Goal**: 系統介面更直覺好用，導航更清晰，資訊層級分明

**Independent Test**: 從登入到查看持股詳情的步驟減少，且重要資訊一目了然

### 實作

- [ ] T078 [US4] 優化儀表板佈局（總資產、已實現損益、未實現損益、報酬率一目了然）於 src/app/dashboard/page.tsx
- [ ] T079 [US4] 優化持股列表卡片設計（顯示風險等級標示）於 src/components/portfolio/HoldingCard.tsx
- [ ] T080 [US4] 簡化持股詳情頁導航路徑（不超過 2 次點擊）於 src/app/portfolios/layout.tsx
- [ ] T081 [US4] 優化行動裝置響應式佈局於 src/components/portfolio/*.tsx
- [ ] T082 [US4] 確保所有操作按鈕在行動裝置上可輕鬆點擊（最小點擊區域 44x44px）

### 無障礙優化

- [ ] T083 [P] [US4] 確保所有新元件支援鍵盤導航於 src/components/**/*.tsx
- [ ] T084 [P] [US4] 新增 ARIA 標籤至風險評估、持股建議元件

**Checkpoint**: User Story 4 完成 - 介面優化功能完成

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: 跨使用者故事的改善與文件更新

### 文件與測試

- [ ] T085 [P] 更新 README.md 新增投資組合洞察功能說明
- [ ] T086 [P] 更新 docs/getting-started.md 新增 Finnhub API Key 設定說明
- [ ] T087 驗證所有服務覆蓋率 >= 80% (`npm test -- --coverage`)
- [ ] T088 執行 quickstart.md 驗證清單確認所有項目通過

### 效能優化

- [ ] T089 驗證所有 API 回應 < 200ms
- [ ] T090 驗證頁面載入 < 3 秒（含新聞延遲載入）
- [ ] T091 檢查並優化 N+1 查詢問題

### 安全性

- [ ] T092 確保 Finnhub API Key 不暴露於前端
- [ ] T093 驗證所有 API 端點正確檢查使用者授權

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 無相依 - 可立即開始
- **Phase 2 (Foundational)**: 依賴 Phase 1 完成 - **BLOCKS 所有使用者故事**
- **Phase 3 (US1)**: 依賴 Phase 2 完成
- **Phase 4 (US2)**: 依賴 Phase 2 完成
- **Phase 5 (US3)**: 依賴 Phase 4 (US2) - 需要 RiskAssessmentService
- **Phase 6 (US5)**: 依賴 Phase 2 完成
- **Phase 7 (US6)**: 依賴 Phase 6 (US5) - 需要 NewsService
- **Phase 8 (US7)**: 依賴 Phase 4 (US2) + Phase 6 (US5)
- **Phase 9 (US4)**: 依賴所有 UI 元件完成
- **Phase 10 (Polish)**: 依賴所有功能完成

### User Story Dependencies

```
Phase 2 (Foundational)
         │
    ┌────┼────────────┐
    ▼    ▼            ▼
  US1   US2         US5
  (P1)  (P2)        (P5)
         │            │
         ▼            ▼
        US3          US6
        (P3)         (P6)
         │            │
         └─────┬──────┘
               ▼
              US7
              (P7)
               │
               ▼
              US4
              (P4)
```

### Parallel Opportunities

**Phase 2 完成後，以下可平行開發**:
- US1 (已實現損益) - 獨立
- US2 (風險評估) - 獨立
- US5 (新聞整合) - 獨立

**同一 Phase 內可平行的任務**:
- 所有標記 [P] 的測試任務
- 所有標記 [P] 的 UI 元件任務

---

## Parallel Example: Phase 3 (User Story 1)

```bash
# 可同時啟動（不同檔案、無相依）:
T014 [P] 建立 FIFO 計算 property-based 測試
T015 [P] 建立 RealizedPLService 單元測試
T016 [P] 建立已實現損益 API 整合測試

# 測試通過後，可同時啟動:
T022 [P] 建立 RealizedPLCard 元件
T023 [P] 建立 RealizedPLBreakdown 元件
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (CRITICAL)
3. 完成 Phase 3: User Story 1 (已實現損益)
4. **STOP and VALIDATE**: 獨立測試 User Story 1
5. 可部署/展示 MVP

### Incremental Delivery

1. Setup + Foundational → 基礎完成
2. 新增 User Story 1 → 獨立測試 → 部署 (MVP!)
3. 新增 User Story 2 → 獨立測試 → 部署
4. 新增 User Story 3 → 獨立測試 → 部署
5. 新增 User Story 5 → 獨立測試 → 部署
6. 新增 User Story 6 → 獨立測試 → 部署
7. 新增 User Story 7 → 獨立測試 → 部署
8. 新增 User Story 4 → 獨立測試 → 部署
9. 完成 Polish → 最終驗收

### Suggested Execution Order

由於相依性，建議執行順序：

```
P1 優先: US1 (已實現損益) ← MVP
P2 優先: US2 (風險評估) + US5 (新聞整合) ← 可平行
P3 優先: US3 (持股建議) + US6 (可信度驗證) ← 可平行
P7 優先: US7 (新聞情緒)
P4 優先: US4 (介面優化) ← 最後，因需整合所有 UI
```

---

## Notes

- [P] 任務 = 不同檔案、無相依性
- [Story] 標籤 = 對應 spec.md 使用者故事
- 每個使用者故事應可獨立完成與測試
- 測試需先失敗再實作（TDD）
- 每個任務或邏輯群組完成後 commit
- 任何 checkpoint 都可暫停驗證故事獨立性
- 避免：模糊任務、同檔案衝突、破壞獨立性的跨故事相依

---

## Summary

| 指標 | 數值 |
|------|------|
| 總任務數 | 93 |
| Phase 數 | 10 |
| 使用者故事數 | 7 (P1-P7) |
| 可平行任務數 | 32 (標記 [P]) |
| MVP 範圍 | User Story 1 (Phase 1-3, 約 26 任務) |
| 新增服務數 | 8 (RealizedPL, TaxLot, RiskAssessment, HoldingAdvice, News, Credibility, Sentiment, FinnhubClient) |
| 新增 API 端點數 | 10 |
| 新增 UI 元件數 | 18 |
