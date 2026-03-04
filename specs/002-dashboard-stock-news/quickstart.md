# 快速上手指南：Dashboard 股市消息模組

**Branch**: `002-dashboard-stock-news` | **Date**: 2025-01-27

> 本文件說明如何在本機開發環境中設定、執行並驗證 Dashboard 股市消息功能。

---

## 前置條件

- Node.js LTS 已安裝
- PostgreSQL 運行中，`.env` 內 `DATABASE_URL` 已正確設定
- 已執行 `npm install`

---

## 步驟 1：取得 Alpha Vantage API 金鑰

1. 前往 [https://www.alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key) 申請免費金鑰
2. 將金鑰加入 `.env`（勿提交至 git）：

```env
# .env
ALPHA_VANTAGE_API_KEY=你的API金鑰

# 排程器安全金鑰（隨機字串，本機開發可用 openssl rand -hex 32 生成）
CRON_SECRET=your-random-secret-here
```

> **⚠️ Free Tier 限制**：每日最多 25 次 API 呼叫。本地開發請避免頻繁手動觸發同步端點，以免耗盡當日配額。

---

## 步驟 2：執行資料庫 Migration

```bash
# 建立新 migration（新增 DashboardNewsItem 和 SyncQuotaLog 表）
npx prisma migrate dev --name add-dashboard-news-models

# 確認 Prisma Client 已更新
npx prisma generate
```

確認以下兩個表已建立：
- `DashboardNewsItem`
- `SyncQuotaLog`

---

## 步驟 3：執行測試（TDD 流程）

```bash
# 執行所有測試
npm test

# 僅執行本功能相關測試
npm test -- --testPathPattern="dashboard-news|news-category-mapper"

# 觀察模式（開發時使用）
npm test -- --watch --testPathPattern="dashboard-news"
```

預期測試涵蓋：

| 測試類型 | 路徑 | 說明 |
|---------|------|------|
| Unit | `tests/unit/services/dashboard-news-sync.service.test.ts` | 同步服務：正規化、upsert、配額邏輯 |
| Unit | `tests/unit/services/dashboard-news.service.test.ts` | 查詢服務：分頁、分類篩選、陳舊度計算 |
| Unit | `tests/unit/lib/alpha-vantage-client.test.ts` | HTTP 客戶端：請求格式、錯誤處理 |
| Property | `tests/property/lib/news-category-mapper.property.test.ts` | 分類映射：任意輸入不拋出例外 |
| Integration | `tests/integration/api/dashboard-news.test.ts` | API 端點：回應格式、快取標頭 |

---

## 步驟 4：啟動開發伺服器

```bash
npm run dev
```

---

## 步驟 5：手動觸發同步（本機測試）

```bash
# 使用 curl 觸發同步（需帶正確 CRON_SECRET）
curl -X POST http://localhost:3000/api/sync/dashboard-news \
  -H "Authorization: Bearer your-random-secret-here" \
  -H "Content-Type: application/json"
```

**預期回應**（首次同步）：
```json
{
  "success": true,
  "data": {
    "upserted": 50,
    "skipped": 0,
    "quotaUsedToday": 1,
    "quotaRemainingToday": 19,
    "syncedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

## 步驟 6：確認前端 API

```bash
# 取得最新 5 筆新聞（預設）
curl "http://localhost:3000/api/dashboard/news"

# 依分類篩選
curl "http://localhost:3000/api/dashboard/news?category=Technology"

# 取得 10 筆
curl "http://localhost:3000/api/dashboard/news?limit=10"

# 游標分頁（下一頁）
curl "http://localhost:3000/api/dashboard/news?cursor=2024-01-15T09:15:00.000Z"
```

**預期回應結構**：
```json
{
  "success": true,
  "data": {
    "items": [/* 最多 limit 筆 NewsItem */],
    "meta": {
      "total": 5,
      "hasMore": false,
      "nextCursor": null,
      "lastSyncedAt": "2024-01-15T10:00:00.000Z",
      "dataStalenessSecs": 300
    }
  }
}
```

---

## 步驟 7：確認 Dashboard UI

1. 開啟 [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
2. 登入後，頁面應顯示「股市消息」區塊（`DashboardNewsWidget`）
3. 驗證以下行為：
   - [ ] 顯示 5 筆最新新聞（標題、分類、發布時間、來源）
   - [ ] 分類 Tab 切換正常篩選
   - [ ] 長標題截斷顯示（CSS `line-clamp-2`）
   - [ ] 同步前（空資料）顯示「目前尚無新聞資料」
   - [ ] 載入中顯示 skeleton loader

---

## 排程設定（Production 部署）

### 方案 A：Vercel Cron（Pro 方案）

在 `vercel.json` 加入：
```json
{
  "crons": [
    {
      "path": "/api/sync/dashboard-news",
      "schedule": "0 * * * *"
    }
  ]
}
```
Vercel 會自動在每小時整點呼叫同步端點（含 `x-vercel-cron: 1` 標頭）。

### 方案 B：GitHub Actions（Hobby 免費方案）

建立 `.github/workflows/news-sync.yml`：
```yaml
name: Dashboard News Sync
on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch:  # 允許手動觸發

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger news sync
        run: |
          curl -f -X POST "${{ secrets.APP_URL }}/api/sync/dashboard-news" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

在 GitHub repo Settings → Secrets 中設定：
- `APP_URL`：你的 Vercel 部署 URL（如 `https://yourapp.vercel.app`）
- `CRON_SECRET`：與 `.env` 中相同的值

---

## 配額監控

```bash
# 查看今日配額使用（直接查詢 DB）
npx prisma studio
# 開啟後找到 SyncQuotaLog 表，查看 date = 今天的記錄
```

或使用 Prisma 查詢（scripts/check-quota.ts）：
```typescript
const today = new Date().toISOString().slice(0, 10);
const log = await prisma.syncQuotaLog.findFirst({
  where: { date: today, service: 'alpha-vantage' }
});
console.log(`今日配額：${log?.callCount ?? 0} / 25`);
```

---

## 常見問題

### Q: 同步端點回傳 429
表示今日配額已達軟限制（20 次）。等待明天 UTC 00:00 後自動重置。

### Q: 同步端點回傳 503
Alpha Vantage API 不可用。Dashboard 仍可顯示前次同步的資料。
可檢查 `SyncQuotaLog.lastError` 欄位了解詳細錯誤。

### Q: 前端顯示「目前尚無新聞資料」
尚未執行第一次同步。依照步驟 5 手動觸發一次即可。

### Q: 如何確認分類映射正確？
```bash
npm test -- --testPathPattern="news-category-mapper"
```
