# Tasks: Dashboard Stock News Module

**Input Sources (strict):**
1. `specs/002-dashboard-stock-news/spec.md`
2. `specs/002-dashboard-stock-news/plan.md`
3. `specs/002-dashboard-stock-news/data-model.md`
4. `specs/002-dashboard-stock-news/contracts/dashboard-news.yaml`

## Phase 1: DB Schema 建置與排程器 (Cron) 串接 Alpha Vantage

- [x] T001 建立 `DashboardNewsItem` 與 `SyncQuotaLog` Prisma 模型（Plan §1.1 News DB Schema 設計、§1.2 SyncQuotaLog 模型）｜DOD: `prisma/schema.prisma` 包含 externalId unique、三組索引與 `@@unique([date, service])` 並通過 `npx prisma validate`｜Status: Todo｜Path: `prisma/schema.prisma`
- [x] T002 產生並提交 Dashboard News 資料表 migration（Plan §1 News DB Schema 設計）｜DOD: migration 可建立兩個新資料表與索引，於乾淨 DB 執行成功且可回滾｜Status: Done｜Path: `prisma/migrations/*_add-dashboard-news-models/migration.sql`
- [x] T003 [P] 實作新聞領域型別與分類常數（Plan §專案結構、§分類映射完整表）｜DOD: `NewsCategory`、`NEWS_CATEGORIES`、`CATEGORY_DISPLAY_NAME`、`DashboardNewsItemDto`、`NewsListResponse` 型別可被 service 與 API route 編譯引用｜Status: Done｜Path: `src/types/news.types.ts`
- [x] T004 [P] 實作 topic 分類映射與 Alpha Vantage 時間解析工具（Plan §分類映射完整表、Data Model §3 分類映射函數）｜DOD: `mapTopicsToCategory()` 對未知/空 topics 回傳 `Other`，`parseAlphaVantageTime()` 可輸出有效 UTC Date｜Status: Done｜Path: `src/lib/news-category-mapper.ts`
- [x] T005 [US3] 實作 Alpha Vantage client（Plan §2.3 Alpha Vantage 請求格式）｜DOD: client 依 `NEWS_SENTIMENT` 規格發送請求、解析 `feed` 主要欄位並在 timeout/5xx 時丟出可辨識錯誤｜Status: Done｜Path: `src/lib/api/alpha-vantage-client.ts`
- [x] T006 [US3] 實作每小時 Cron 觸發設定與安全檢查骨架（Plan §2.2 排程觸發設定、Contracts `/api/sync/dashboard-news` security）｜DOD: `vercel.json` 設定 `0 * * * *`，sync route 能驗證 `Authorization: Bearer {CRON_SECRET}` 與 `x-vercel-cron` 條件｜Status: Done｜Path: `vercel.json`, `src/app/api/sync/dashboard-news/route.ts`
- [x] T007 [US3] 實作同步服務主流程（配額檢查→抓取→正規化→upsert→配額更新）（Plan §2.1 完整流程圖、§4 Free Tier Rate Limit 應對策略）｜DOD: `run()` 可基於 `SyncQuotaLog` 執行 20 次軟限制判斷，成功回傳 upserted/skipped/quota 統計，失敗保留舊資料｜Status: Done｜Path: `src/services/dashboard-news-sync.service.ts`
- [x] T008 [US3] 完成 POST `/api/sync/dashboard-news` 契約實作（Plan §3 前端 API 規格、Contracts `/api/sync/dashboard-news`）｜DOD: 端點回傳 200/401/429/503 與 `ErrorResponse` 結構，429 含 `Retry-After` 與 `retryAfter` 欄位｜Status: Done｜Path: `src/app/api/sync/dashboard-news/route.ts`

## Phase 2: 後端內部 API 實作與 Rate Limit 錯誤處理

- [x] T009 [US3] 實作 Dashboard news 查詢 service（Plan §3 GET /api/dashboard/news 查詢參數、Data Model §5 資料生命週期）｜DOD: 支援 `category`、`limit(1-50)`、`cursor` 分頁、`publishedAt DESC` 排序，並計算 `lastSyncedAt`/`dataStalenessSecs`｜Status: Done｜Path: `src/services/dashboard-news.service.ts`
- [x] T010 [US1] 實作 GET `/api/dashboard/news` 基本讀取與空資料降級（Plan §3 回應格式、Spec FR-002/FR-003/FR-006）｜DOD: 預設回傳最新 5 筆；無資料時回傳 `success: true` + `items: []`；不直接呼叫外部 API｜Status: Done｜Path: `src/app/api/dashboard/news/route.ts`
- [x] T011 [US2] 擴充 GET `/api/dashboard/news` 分類篩選與游標分頁（Plan §3 查詢參數、Contracts `/api/dashboard/news` parameters）｜DOD: 支援 `category` enum、`nextCursor`/`hasMore` 計算，非法 category 回傳 400（統一錯誤格式）｜Status: Done｜Path: `src/app/api/dashboard/news/route.ts`, `src/services/dashboard-news.service.ts`
- [x] T012 [US3] 補齊 Rate Limit / Upstream Error 處理策略（Plan §4.1/§4.3、Contracts 429/503）｜DOD: 軟限制達到時回傳 `QUOTA_EXCEEDED`；上游不可用回傳 `UPSTREAM_UNAVAILABLE`；錯誤訊息為 zh-TW 且記錄 `lastError`｜Status: Done｜Path: `src/services/dashboard-news-sync.service.ts`, `src/app/api/sync/dashboard-news/route.ts`
- [x] T013 [P] [US3] 撰寫 Alpha Vantage client 單元測試（Plan 技術背景-測試、§2.3 請求格式）｜DOD: 覆蓋成功解析、timeout、5xx 三情境且測試可在 CI 穩定通過｜Status: Done｜Path: `tests/unit/lib/alpha-vantage-client.test.ts`
- [x] T014 [P] [US3] 撰寫分類映射 property-based 測試（Plan 技術背景-測試、Data Model §3/§4）｜DOD: 使用 fast-check 驗證任意 topics 輸入皆回傳合法 `NewsCategory`，空陣列與未知值固定回傳 `Other`｜Status: Done｜Path: `tests/property/lib/news-category-mapper.property.test.ts`
- [ ] T015 [US3] 撰寫同步 API 整合測試（Plan §2.1 完整流程圖、Contracts `/api/sync/dashboard-news`）｜DOD: 驗證 200/401/429/503 回應碼、回應 body 與 header（含 Retry-After）符合契約｜Status: Todo｜Path: `tests/integration/api/sync-dashboard-news.test.ts`
- [ ] T016 [US1] 撰寫 Dashboard News API 整合測試（Plan §3 回應格式、Contracts `/api/dashboard/news`）｜DOD: 驗證預設 5 筆、空資料 200、`Cache-Control` 與 `X-Data-Staleness-Seconds` header 正確｜Status: Todo｜Path: `tests/integration/api/dashboard-news.test.ts`

## Phase 3: 前端 Dashboard 介面整合與分類標籤功能

- [ ] T017 [US1] 實作 DashboardNewsWidget 容器（Plan §專案結構 components/news、Spec US1 Acceptance）｜DOD: 元件可載入 API 資料並顯示 loading/empty/error state，API 失敗不影響其他 dashboard 區塊｜Status: Todo｜Path: `src/components/news/DashboardNewsWidget.tsx`
- [ ] T018 [P] [US1] 實作 NewsCard 呈現規則（Plan §專案結構 NewsCard、Spec FR-004/FR-007/EC-002/EC-003）｜DOD: 每卡片顯示 Title/Category/Publication Time/Source，長標題 2 行截斷，缺失 source 顯示 `Unknown Source`｜Status: Todo｜Path: `src/components/news/NewsCard.tsx`
- [ ] T019 [US2] 實作 NewsCategoryFilter 分類標籤（Plan §專案結構 NewsCategoryFilter、Spec US2 Acceptance）｜DOD: 提供 All + 固定分類（General/Technology/Finance/Earnings/Mergers/Other），切換後 1 秒內更新列表｜Status: Todo｜Path: `src/components/news/NewsCategoryFilter.tsx`
- [ ] T020 [US1] 將新聞模組整合至 Dashboard 主頁（Plan §專案結構 `app/dashboard/page.tsx`）｜DOD: Dashboard 成功掛載 `DashboardNewsWidget`，首頁載入時可見最新新聞區塊且版面不破版｜Status: Todo｜Path: `src/app/dashboard/page.tsx`
- [ ] T021 [US2] 串接前端分類互動至後端查詢參數（Plan §3 GET 查詢參數、Contracts `category/limit/cursor`）｜DOD: 點擊分類標籤會發送對應 query string，清除篩選可恢復 All，UI 與 API 回傳一致｜Status: Todo｜Path: `src/components/news/DashboardNewsWidget.tsx`, `src/components/news/NewsCategoryFilter.tsx`
- [ ] T022 [US1] 前端整合測試：降級顯示與資料渲染（Spec SC-001/SC-004）｜DOD: 驗證 API 失敗顯示友善訊息、成功時顯示來源與時間欄位，不阻斷 Dashboard 其他元件渲染｜Status: Todo｜Path: `tests/integration/components/dashboard-news-widget.test.tsx`

## 依賴關係（Dependency Graph）

- 基礎路徑：`T001 -> T002 -> T007 -> T008 -> T009 -> T010`
- US3（資料同步與交付）完成條件：`T005, T006, T007, T008, T009, T012, T013, T014, T015`
- US1（顯示最新新聞）依賴 US3 最小可用 API：`T010, T016, T017, T018, T020, T022`
- US2（分類篩選）依賴 US1 Widget + API filter：`T011, T019, T021`
- 建議故事完成順序：`US3 -> US1 -> US2`

## 平行執行建議（Parallel Opportunities）

- Phase 1 可平行：`T003` 與 `T004`（型別與 mapper 不互相阻塞）
- US3 可平行：`T013` 與 `T014`（不同測試檔案）、`T005` 與 `T006`（client 與 cron 設定）
- Phase 3 可平行：`T018` 與 `T019`（卡片與篩選元件）
- 串接順序建議：先完成 `T007/T008/T009/T010` 再進入前端整合，降低 UI 假資料成本

## MVP 策略

- **MVP 範圍（先交付）**：US3 + US1 最小閉環
  - 必要任務：`T001~T010`, `T012`, `T015`, `T017`, `T018`, `T020`
  - 成果：可每小時同步資料、Dashboard 顯示最新 5 筆、API 失敗可降級顯示
- **第二增量**：US2 分類篩選與互動（`T011`, `T019`, `T021`）
- **第三增量**：測試補強與前端降級整合測試（`T013`, `T014`, `T016`, `T022`）
