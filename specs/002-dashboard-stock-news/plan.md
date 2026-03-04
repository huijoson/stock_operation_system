# 實作計畫：Dashboard 股市消息模組

**Branch**: `002-dashboard-stock-news` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-dashboard-stock-news/spec.md`

---

## 摘要

在系統首頁 Dashboard 新增「股市消息」模組。系統後端以**每小時排程**呼叫 Alpha Vantage `NEWS_SENTIMENT` API 抓取市場新聞，正規化後 upsert 至本地 PostgreSQL `DashboardNewsItem` 資料表。前端透過 `/api/dashboard/news` 端點讀取，**完全依賴本地 DB**（請求路徑中不呼叫外部 API）。支援固定分類篩選（General / Technology / Finance / Earnings / Mergers / Other），預設顯示 5 筆；API 失敗或無資料時顯示友善空狀態，確保 Dashboard 其他區塊不受影響。

Alpha Vantage Free Tier 每日 25 次呼叫上限，以 `SyncQuotaLog` 資料表持久化追蹤每日配額，並設定 20 次軟限制保留安全緩衝。

---

## 技術背景

**語言/版本**：TypeScript 5.x，`strict: true`
**主要相依套件**：Next.js 15 (App Router)、Prisma ORM、PostgreSQL、Decimal.js
**儲存**：PostgreSQL（透過 Prisma，無裸 SQL）
**測試**：Jest + fast-check（property-based），覆蓋率目標 services ≥ 80%
**目標平台**：Node.js / Vercel（serverless）
**效能目標**：`GET /api/dashboard/news` 回應 < 200ms（本地 DB 讀取）
**約束條件**：Alpha Vantage Free Tier 每日 25 次上限；軟限制 20 次；每小時排程 24 次/天
**規模/範圍**：單一系統；全使用者共享同一份市場新聞資料集（非個人化）

---

## 憲法合規檢查

*閘門：進入 Phase 0 研究前必須通過；Phase 1 設計完成後再次確認。*

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. 程式碼品質（NON-NEGOTIABLE） | ✅ 合規 | TypeScript strict mode；新增 `alpha-vantage-client.ts`、`dashboard-news-sync.service.ts`、`dashboard-news.service.ts` 均置於正確目錄；Prisma ORM 無裸 SQL；所有函數需明確回傳型別 |
| II. 測試標準（NON-NEGOTIABLE） | ✅ 合規 | TDD 流程；`mapTopicsToCategory` 與資料正規化函數使用 fast-check property-based 測試（邊界條件：空陣列、未知 tag、null 欄位）；整合測試涵蓋兩支 API 路由 |
| III. 使用者體驗一致性 | ✅ 合規 | 元件置於 `/src/components/news/`；loading/error state 遵循既有 UX 指南；文字使用 zh-TW |
| IV. 效能需求 | ✅ 合規 | 讀取端僅查詢本地 DB（目標 < 200ms）；`publishedAt DESC` 與 `category` 索引已規劃；React 元件使用 `React.memo` 防止不必要重繪 |
| V. 文件語言（NON-NEGOTIABLE） | ✅ 合規 | 本 plan 及所有 specs 文件使用 zh-TW |

**Phase 1 設計後複查結果**：無新增違規；所有 Prisma schema 變更已規劃索引；API 回應 < 200ms 可行（單表 indexed 查詢）。

---

## 專案結構

### 文件（本功能）

```text
specs/002-dashboard-stock-news/
├── plan.md              # 本文件（/speckit.plan 輸出）
├── research.md          # Phase 0 研究輸出
├── data-model.md        # Phase 1 資料模型輸出
├── quickstart.md        # Phase 1 快速上手指南
├── contracts/
│   └── dashboard-news.yaml   # OpenAPI 3.0 契約
└── tasks.md             # Phase 2 任務（/speckit.tasks 指令產生，非本指令範圍）
```

### 原始碼結構（本功能新增 / 修改檔案）

```text
src/
├── lib/
│   └── api/
│       └── alpha-vantage-client.ts          # Alpha Vantage HTTP 客戶端【新增】
├── services/
│   ├── dashboard-news-sync.service.ts       # 排程同步服務（抓取→正規化→upsert）【新增】
│   └── dashboard-news.service.ts            # 新聞查詢服務（DB 讀取）【新增】
├── types/
│   └── news.types.ts                        # NewsCategory 型別與常數【新增】
├── lib/
│   └── news-category-mapper.ts              # 分類映射函數【新增】
├── components/
│   └── news/
│       ├── DashboardNewsWidget.tsx          # 主 Widget 容器元件【新增】
│       ├── NewsCard.tsx                     # 單筆新聞卡片【新增】
│       └── NewsCategoryFilter.tsx           # 分類篩選 Tabs【新增】
└── app/
    ├── api/
    │   ├── dashboard/
    │   │   └── news/
    │   │       └── route.ts                 # GET /api/dashboard/news【新增】
    │   └── sync/
    │       └── dashboard-news/
    │           └── route.ts                 # POST /api/sync/dashboard-news【新增】
    └── dashboard/
        └── page.tsx                         # 整合 DashboardNewsWidget【修改】

prisma/
└── schema.prisma                            # 新增 DashboardNewsItem、SyncQuotaLog 模型【修改】

tests/
├── unit/
│   ├── services/
│   │   ├── dashboard-news-sync.service.test.ts
│   │   └── dashboard-news.service.test.ts
│   └── lib/
│       └── alpha-vantage-client.test.ts
├── property/
│   └── lib/
│       └── news-category-mapper.property.test.ts  # fast-check
└── integration/
    └── api/
        ├── dashboard-news.test.ts
        └── sync-dashboard-news.test.ts

vercel.json                                  # Cron 排程設定【新增或修改】
```

**結構決策**：採用 Next.js App Router 單專案架構（Option 1）。明確分離三層職責：
1. `alpha-vantage-client.ts`：HTTP 通訊層（可 mock 測試）
2. `dashboard-news-sync.service.ts`：同步業務邏輯（抓取→正規化→upsert→配額追蹤）
3. `dashboard-news.service.ts`：查詢業務邏輯（DB 讀取→分頁→陳舊度計算）

---

## 第一階段詳細設計

### 1. News DB Schema 設計

#### 1.1 DashboardNewsItem 模型

```prisma
model DashboardNewsItem {
  id          String   @id @default(cuid())
  externalId  String   @unique                    // Alpha Vantage URL 的 SHA-256（32 chars truncated）
  title       String                              // 新聞標題（最長 500 字元）
  summary     String?  @db.Text                  // 新聞摘要（可為空）
  url         String                              // 原始新聞連結
  source      String                              // 來源名稱（如 "Reuters"）
  publishedAt DateTime                            // 發布時間（UTC）
  category    String                              // 正規化分類（見 NewsCategory）
  rawTopics   String[]                            // 原始 Alpha Vantage topics（稽核用）
  syncedAt    DateTime                            // 最後一次 upsert 的同步批次時間
  createdAt   DateTime @default(now())

  @@index([publishedAt(sort: Desc)])              // 主查詢路徑：最新 N 筆
  @@index([category, publishedAt(sort: Desc)])    // 分類篩選 + 排序
  @@index([syncedAt])                             // 舊資料清理
}
```

**唯一鍵設計**：`externalId = crypto.createHash('sha256').update(article.url).digest('hex').slice(0, 32)`
- 使用 `url` 欄位雜湊確保跨同步批次冪等，即使 Alpha Vantage 回傳同一篇文章也不重複寫入

**索引設計說明**：
- `publishedAt DESC`：滿足「最新 5 筆」的主要查詢
- `(category, publishedAt DESC)`：滿足「按分類篩選 + 最新排序」複合查詢（覆蓋索引）
- `syncedAt`：支援未來定期清理超過 N 天的舊記錄

#### 1.2 SyncQuotaLog 模型

```prisma
model SyncQuotaLog {
  id          String    @id @default(cuid())
  date        String                            // 'YYYY-MM-DD'（UTC）
  service     String                            // 'alpha-vantage'
  callCount   Int       @default(0)             // 當日累計呼叫次數
  lastSyncAt  DateTime?                         // 最後成功同步時間
  lastError   String?                           // 最後失敗訊息（監控用）
  updatedAt   DateTime  @updatedAt

  @@unique([date, service])                     // 每服務每日一筆
  @@index([date])
}
```

---

### 2. 每小時排程器資料流

#### 2.1 完整流程圖

```
[Vercel Cron / External HTTP]
        │ POST /api/sync/dashboard-news
        │ Header: Authorization: Bearer {CRON_SECRET}
        ▼
┌─────────────────────────────┐
│  route.ts (sync endpoint)   │
│  1. 驗證 CRON_SECRET        │
│  2. 呼叫 SyncService.run()  │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│  DashboardNewsSyncService.run()                     │
│                                                     │
│  STEP 1：配額檢查                                    │
│    quotaLog = SyncQuotaLog.findOrCreate(today)      │
│    if callCount >= 20 → return QuotaExceeded (429)  │
│                                                     │
│  STEP 2：呼叫 Alpha Vantage                          │
│    try {                                             │
│      raw = AlphaVantageClient.getNewsSentiment()    │
│      callCount++ (DB update)                        │
│    } catch (err) {                                  │
│      log lastError → return SyncFailed (503)        │
│      ← 保留前次 DB 資料，前端仍可正常讀取             │
│    }                                                │
│                                                     │
│  STEP 3：正規化                                      │
│    for each article in raw.feed:                    │
│      externalId = sha256(article.url).slice(0,32)   │
│      category   = mapTopicsToCategory(article.topics)│
│      publishedAt = parse('20240115T120000')          │
│      → NewsItemDto                                  │
│                                                     │
│  STEP 4：Upsert DB                                  │
│    for each dto:                                    │
│      prisma.dashboardNewsItem.upsert({              │
│        where:  { externalId },                      │
│        update: { syncedAt: now },                   │
│        create: { ...dto, syncedAt: now }            │
│      })                                             │
│                                                     │
│  STEP 5：更新配額 & 回傳結果                          │
│    update SyncQuotaLog { lastSyncAt: now }          │
│    return { upserted, skipped, quotaUsedToday }     │
└─────────────────────────────────────────────────────┘
```

#### 2.2 排程觸發設定（Vercel Cron）

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/sync/dashboard-news",
      "schedule": "0 * * * *"
    }
  ]
}
```

若使用 GitHub Actions（免費替代方案）：
```yaml
# .github/workflows/news-sync.yml
on:
  schedule:
    - cron: '0 * * * *'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST ${{ secrets.APP_URL }}/api/sync/dashboard-news \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

#### 2.3 Alpha Vantage 請求格式

```
GET https://www.alphavantage.co/query
  ?function=NEWS_SENTIMENT
  &apikey={ALPHA_VANTAGE_API_KEY}
  &limit=50
  &sort=LATEST
```

回應關鍵欄位：
- `feed[].title`、`feed[].url`、`feed[].summary`、`feed[].source`
- `feed[].time_published`（格式：`"20240115T120000"`→ 解析為 UTC DateTime）
- `feed[].topics[].topic`（原始分類陣列，映射至 `NewsCategory`）

---

### 3. 前端 API 規格

詳見 `contracts/dashboard-news.yaml`（OpenAPI 3.0）。重點摘要：

#### 端點

| 方法 | 路徑 | 用途 |
|------|------|------|
| `GET` | `/api/dashboard/news` | 前端讀取新聞列表 |
| `POST` | `/api/sync/dashboard-news` | 排程器觸發同步（內部用） |

#### GET /api/dashboard/news 查詢參數

| 參數 | 型別 | 預設 | 說明 |
|------|------|------|------|
| `category` | string（enum） | 無（全部） | General \| Technology \| Finance \| Earnings \| Mergers \| Other |
| `limit` | integer（1-50） | 5 | 回傳筆數 |
| `cursor` | string | 無 | 分頁游標（上一頁最後一筆的 `publishedAt` ISO string） |

#### 回應格式（200 OK）

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "clxxx123",
        "title": "Fed Signals Rate Cuts as Inflation Cools",
        "summary": "Federal Reserve officials hinted at...",
        "url": "https://reuters.com/article/...",
        "source": "Reuters",
        "publishedAt": "2024-01-15T10:30:00Z",
        "category": "Finance"
      }
    ],
    "meta": {
      "total": 5,
      "hasMore": false,
      "nextCursor": null,
      "lastSyncedAt": "2024-01-15T10:00:00Z",
      "dataStalenessSecs": 1800
    }
  }
}
```

#### 錯誤格式

```json
{
  "success": false,
  "error": "人類可讀訊息（zh-TW）",
  "code": "MACHINE_READABLE_CODE",
  "retryAfter": 60
}
```

#### 快取 / 陳舊資料策略

- **HTTP 快取標頭**：`Cache-Control: public, max-age=300, stale-while-revalidate=3600`
  - 5 分鐘強快取（CDN / 瀏覽器）；最多 1 小時 stale-while-revalidate
- **`dataStalenessSecs`**：前端可用於顯示「N 分鐘前更新」或超過閾值時顯示警告
- **無資料時**：回傳 `200` + `items: []`（非 404），前端顯示「目前尚無新聞資料」
- **SC-001 保障**：讀取端永不呼叫 Alpha Vantage，即使同步完全失敗，DB 中仍有舊資料可服務

---

### 4. Free Tier Rate Limit 應對策略

#### 4.1 配額層級定義

| 層級 | 每日呼叫次數 | 動作 |
|------|------------|------|
| 正常 | 0–19 | 允許同步，正常執行 |
| 軟限制 | 20–23 | 跳過同步，回傳 429，記錄 WARN |
| 硬限制 | 24 | 強制拒絕，回傳 429，記錄 ERROR |
| Alpha Vantage 上限 | 25 | API 本身返回錯誤（已由硬限制預防） |

**設計理由**：每小時 1 次 × 24 小時 = 24 次/天。軟限制 20 次留有 4 次緩衝，應對服務重啟後重算等邊緣情況。

#### 4.2 配額追蹤實作

```typescript
// src/services/dashboard-news-sync.service.ts（偽碼）

const SOFT_LIMIT = 20;
const HARD_LIMIT = 24;
const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD' UTC

// 原子性遞增（使用 Prisma transaction 防止 race condition）
async function incrementQuota(): Promise<SyncQuotaLog> {
  return prisma.$transaction(async (tx) => {
    const log = await tx.syncQuotaLog.upsert({
      where: { date_service: { date: today, service: 'alpha-vantage' } },
      update: { callCount: { increment: 1 } },
      create: { date: today, service: 'alpha-vantage', callCount: 1 },
    });
    return log;
  });
}
```

#### 4.3 退避策略

- **同步失敗（API 5xx / timeout）**：不重試；記錄 `lastError`；等待下次排程自然觸發
  - 理由：立即重試會消耗寶貴的每日配額
- **配額超限**：不重試；排程器下一整天才重置
- **客戶端降級**：DB 中保留最後成功同步的資料，前端正常讀取（SC-001a）

#### 4.4 監控 / 告警

- `SyncQuotaLog.lastError` 欄位：每次失敗時寫入錯誤訊息
- 可設定外部監控工具（如 Uptime Robot、Betterstack）每小時 GET `/api/dashboard/news`，若 `dataStalenessSecs > 7200`（2 小時）觸發告警
- 同步端點回傳 `quotaUsedToday`，可在 admin 頁面顯示當日配額使用狀況

---

## 分類映射完整表

| Alpha Vantage `topics[].topic` | 映射至 `NewsCategory` |
|-------------------------------|----------------------|
| `technology` | Technology |
| `finance` | Finance |
| `earnings` | Earnings |
| `mergers_and_acquisitions` | Mergers |
| `ipo` | Finance |
| `blockchain` | Technology |
| `economy_fiscal` | General |
| `economy_monetary` | General |
| `economy_macro` | General |
| `energy_transportation` | General |
| `manufacturing` | General |
| `real_estate` | General |
| `retail_wholesale` | General |
| `life_sciences` | General |
| （其他 / 空陣列 / 未知） | Other |

**映射規則**：取 `topics` 陣列第一個有對應映射的 topic；若全部未命中，回傳 `'Other'`。
