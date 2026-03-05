# 資料模型：Dashboard 股市消息模組

**Branch**: `002-dashboard-stock-news` | **Date**: 2025-01-27

---

## 1. 新增 Prisma 模型

### 1.1 DashboardNewsItem

儲存從 Alpha Vantage `NEWS_SENTIMENT` 端點正規化後的市場新聞。

```prisma
model DashboardNewsItem {
  id          String   @id @default(cuid())
  externalId  String   @unique                     // URL 的 SHA-256 前 32 字元（冪等 upsert 鍵）
  title       String                               // 新聞標題（最長 500 字元）
  summary     String?  @db.Text                   // 新聞摘要（可為空）
  url         String                               // 原始新聞連結
  source      String                               // 來源名稱（如 "Reuters"、"Bloomberg"）
  publishedAt DateTime                             // 原始發布時間（UTC）
  category    String                               // 正規化分類（見 NewsCategory）
  rawTopics   String[]                             // 原始 Alpha Vantage topics 陣列（稽核/重分類用）
  syncedAt    DateTime                             // 最後一次此記錄被同步批次 upsert 的時間
  createdAt   DateTime @default(now())

  @@index([publishedAt(sort: Desc)])               // 主查詢：最新 N 筆
  @@index([category, publishedAt(sort: Desc)])     // 分類篩選 + 時間排序（覆蓋索引）
  @@index([syncedAt])                              // 未來定期清理舊資料
}
```

**唯一鍵設計**：

```typescript
// externalId 生成方式（於 dashboard-news-sync.service.ts 中執行）
import { createHash } from 'crypto';

export function generateExternalId(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 32);
}
```

**索引設計說明**：

| 索引 | 覆蓋查詢 | 說明 |
|------|---------|------|
| `publishedAt DESC` | `ORDER BY publishedAt DESC LIMIT 5` | 預設顯示最新 5 筆 |
| `(category, publishedAt DESC)` | `WHERE category = ? ORDER BY publishedAt DESC` | 分類篩選主路徑 |
| `syncedAt` | 清理任務：`WHERE syncedAt < cutoff` | 未來保留最近 N 天資料 |

---

### 1.2 SyncQuotaLog

持久化追蹤每日 API 呼叫次數，跨程序重啟保持狀態。

```prisma
model SyncQuotaLog {
  id          String    @id @default(cuid())
  date        String                             // 'YYYY-MM-DD'（UTC）
  service     String                             // 'alpha-vantage'
  callCount   Int       @default(0)              // 當日累計呼叫次數
  lastSyncAt  DateTime?                          // 最後一次成功同步時間
  lastError   String?                            // 最後一次失敗訊息（外部監控用）
  updatedAt   DateTime  @updatedAt

  @@unique([date, service])                      // 每服務每天一筆記錄
  @@index([date])                                // 依日期查詢
}
```

---

## 2. TypeScript 型別定義

### 2.1 NewsCategory 型別

```typescript
// src/types/news.types.ts

export type NewsCategory =
  | 'General'
  | 'Technology'
  | 'Finance'
  | 'Earnings'
  | 'Mergers'
  | 'Other';

/** 所有合法分類值（用於前端篩選 UI 及後端驗證） */
export const NEWS_CATEGORIES: NewsCategory[] = [
  'General',
  'Technology',
  'Finance',
  'Earnings',
  'Mergers',
  'Other',
];

/** 前端顯示用 zh-TW 標籤 */
export const CATEGORY_DISPLAY_NAME: Record<NewsCategory, string> = {
  General:    '綜合',
  Technology: '科技',
  Finance:    '金融',
  Earnings:   '財報',
  Mergers:    '併購',
  Other:      '其他',
};
```

### 2.2 正規化後的 NewsItemDto

```typescript
// src/types/news.types.ts（續）

/** Alpha Vantage 單篇文章正規化後的 DTO（寫入 DB 前） */
export interface DashboardNewsItemDto {
  externalId:  string;         // generateExternalId(url) 結果
  title:       string;
  summary:     string | null;
  url:         string;
  source:      string;
  publishedAt: Date;           // 由 '20240115T120000' 解析
  category:    NewsCategory;
  rawTopics:   string[];
}

/** 前端 API 回應格式的單筆新聞 */
export interface NewsItemResponse {
  id:          string;
  title:       string;
  summary:     string | null;
  url:         string;
  source:      string;
  publishedAt: string;         // ISO 8601 UTC string
  category:    NewsCategory;
}

/** GET /api/dashboard/news 的完整回應 */
export interface NewsListResponse {
  success: true;
  data: {
    items: NewsItemResponse[];
    meta: {
      total:             number;
      hasMore:           boolean;
      nextCursor:        string | null;
      lastSyncedAt:      string | null;  // 最後一次成功同步的 syncedAt
      dataStalenessSecs: number;         // 距離 lastSyncedAt 的秒數
    };
  };
}
```

---

## 3. 分類映射函數

```typescript
// src/lib/news-category-mapper.ts

import { NewsCategory } from '@/types/news.types';

/** Alpha Vantage topic 字串 → NewsCategory 靜態映射表 */
export const ALPHA_VANTAGE_TOPIC_MAP: Readonly<Record<string, NewsCategory>> = {
  technology:               'Technology',
  finance:                  'Finance',
  earnings:                 'Earnings',
  mergers_and_acquisitions: 'Mergers',
  ipo:                      'Finance',
  blockchain:               'Technology',
  economy_fiscal:           'General',
  economy_monetary:         'General',
  economy_macro:            'General',
  energy_transportation:    'General',
  manufacturing:            'General',
  real_estate:              'General',
  retail_wholesale:         'General',
  life_sciences:            'General',
} as const;

/**
 * 將 Alpha Vantage topics 陣列映射至 NewsCategory。
 * 取第一個有對應映射的 topic；若全部未命中或輸入為空，回傳 'Other'。
 *
 * @param topics - 原始 topics 陣列（如 ["technology", "earnings"]）
 * @returns 對應的 NewsCategory
 */
export function mapTopicsToCategory(topics: string[]): NewsCategory {
  for (const topic of topics) {
    const normalized = topic.toLowerCase().trim();
    const mapped = ALPHA_VANTAGE_TOPIC_MAP[normalized];
    if (mapped !== undefined) {
      return mapped;
    }
  }
  return 'Other';
}

/**
 * 解析 Alpha Vantage 時間格式 '20240115T120000' 為 UTC Date。
 * @param timePublished - 格式：'YYYYMMDDTHHmmss'
 */
export function parseAlphaVantageTime(timePublished: string): Date {
  // '20240115T120000' → '2024-01-15T12:00:00Z'
  const formatted =
    `${timePublished.slice(0, 4)}-${timePublished.slice(4, 6)}-${timePublished.slice(6, 8)}` +
    `T${timePublished.slice(9, 11)}:${timePublished.slice(11, 13)}:${timePublished.slice(13, 15)}Z`;
  return new Date(formatted);
}
```

---

## 4. 驗證規則

| 欄位 | 規則 | 違規處理 |
|------|------|---------|
| `title` | 非空字串，≤ 500 字元 | 截斷或跳過該筆記錄 |
| `url` | `https://` 開頭的合法 URL | 跳過該筆記錄，記錄警告 |
| `source` | 非空字串，≤ 200 字元 | 使用 `'Unknown Source'` 替代 |
| `publishedAt` | 合法 DateTime，不超過未來 1 分鐘 | 跳過該筆記錄 |
| `category` | 必須為 `NewsCategory` 之一 | `mapTopicsToCategory` 保證不拋出例外 |
| `externalId` | 非空，32 字元（SHA-256 截斷） | 由 `generateExternalId` 保證 |

---

## 5. 資料生命週期

```
Alpha Vantage API 回傳
        │
        ▼ 每小時排程 upsert
DashboardNewsItem（PostgreSQL）
        │ externalId 唯一，重複不寫入新記錄
        │ syncedAt 每次更新
        ▼
GET /api/dashboard/news（DB 讀取）
        │ 依 publishedAt DESC 排序
        │ 支援 category 篩選
        ▼
前端 DashboardNewsWidget（顯示）
```

**資料保留策略**：
- 目前：不自動刪除舊資料（DB 容量低，每次最多 50 篇）
- 未來可選：定期清理 `syncedAt < now() - 7 days` 的記錄

---

## 6. Prisma Migration 指令（開發參考）

```bash
# 新增 migration
npx prisma migrate dev --name add-dashboard-news-models

# 確認 schema 正確後部署至 production
npx prisma migrate deploy
```
