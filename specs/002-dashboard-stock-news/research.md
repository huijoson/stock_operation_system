# Phase 0 研究報告：Dashboard 股市消息模組

**Branch**: `002-dashboard-stock-news` | **Date**: 2025-01-27

---

## R-001：Alpha Vantage News & Sentiment API 規格

**決策**：使用 `NEWS_SENTIMENT` 端點，每小時排程觸發一次。

**理由**：
- Alpha Vantage 免費方案每日 **25 次**呼叫上限
- 每小時同步 = 24 次/天，設定軟限制 20 次（80% 安全閾值）保留緩衝
- `NEWS_SENTIMENT` 一次呼叫可回傳最多 50 篇跨市場新聞，包含 `topics` 陣列供分類映射
- 相較 Finnhub（已用於個股新聞）：Finnhub `/company-news` 需帶 `symbol` 參數，不適合市場概覽型用途；兩者分工清晰

**端點格式**：
```
GET https://www.alphavantage.co/query
  ?function=NEWS_SENTIMENT
  &apikey={ALPHA_VANTAGE_API_KEY}
  &limit=50
  &sort=LATEST
```

**回應關鍵欄位**：

| 欄位路徑 | 型別 | 說明 | 映射至 DB 欄位 |
|---------|------|------|--------------|
| `feed[].title` | string | 新聞標題 | `title` |
| `feed[].url` | string | 原始連結 | `url`、`externalId`（URL 雜湊） |
| `feed[].summary` | string | 摘要 | `summary` |
| `feed[].source` | string | 來源名稱 | `source` |
| `feed[].time_published` | string | `"20240115T120000"` 格式 | `publishedAt`（解析為 UTC DateTime） |
| `feed[].topics[].topic` | string[] | 原始分類標籤 | `rawTopics`、`category`（映射後） |

**考慮的替代方案**：
- Finnhub Free（60 calls/min）：速率更優，但端點設計針對個股而非市場概覽；已在既有 `StockNews` 模組使用，職責不同
- RSS 聚合（免費，無 API 呼叫限制）：需自行解析多個來源，維護成本高，且缺乏標準化分類標籤，捨棄
- 複用現有 `StockNews` 模型加佔位符 symbol：型別不安全且語義不清，捨棄

---

## R-002：每小時排程器方案評估

**決策**：採用 **Next.js API Route + 外部 Cron 觸發**（Vercel Cron 或 GitHub Actions）。

**理由**：
- 現有專案架構為 Vercel serverless；API Route 方式保持架構一致性
- Vercel Cron（Pro 方案）可直接設定 `vercel.json`，無需外部服務
- 若為 Vercel Hobby（免費），GitHub Actions Scheduled Workflow 可作為零成本替代方案
- 相較 node-cron：不需自訂 server，不破壞 serverless 優勢；不需管理程序持久化

**Vercel Cron 設定**：
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

**安全設計**：
- 同步端點驗證 `Authorization: Bearer {CRON_SECRET}` 標頭
- `CRON_SECRET` 存放於環境變數，不寫入程式碼
- Vercel Cron 自動在請求中附加 `x-vercel-cron: 1` 標頭（雙重驗證）

**考慮的替代方案**：

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| Vercel Cron | 最簡單、內建 | Pro 方案才支援 | 主要方案（Pro），否則降級至 GitHub Actions |
| GitHub Actions | 免費、平台無關 | 需管理 secret、偶爾延遲 | Fallback 方案 |
| node-cron 自訂 server | 完全控制 | 破壞 serverless、無橫向擴展 | 捨棄 |
| 第三方排程（EasyCron 等） | 靈活 | 多一個外部依賴 | 捨棄 |

---

## R-003：資料模型分離決策

**決策**：新增獨立 `DashboardNewsItem` 模型，與現有 `StockNews`（個股導向）分離。

**理由**：
- `StockNews` 以 `(symbol, externalId)` 為複合唯一鍵，設計語義為「某支股票的新聞」
- Dashboard 市場新聞無 symbol 維度，以 `externalId`（URL 雜湊）作為全域唯一鍵
- 索引策略不同：`StockNews` 需 `symbol` 前綴索引；`DashboardNewsItem` 需 `category` + `publishedAt` 複合索引
- 職責明確，未來修改各自模型時不互相影響

**externalId 生成策略**：
```typescript
// src/lib/news-category-mapper.ts
import { createHash } from 'crypto';

export function generateExternalId(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 32);
}
```

- 使用 URL 作為輸入：Alpha Vantage 中同一篇文章 URL 固定
- SHA-256 + 32 字元截斷：確保唯一性（碰撞機率極低），且長度固定

**Upsert 模式選擇**：
```typescript
// 使用 Prisma upsert（非 createMany + skipDuplicates）
// 原因：需要更新 syncedAt，skipDuplicates 無法做到
await prisma.dashboardNewsItem.upsert({
  where:  { externalId },
  update: { syncedAt: now },
  create: { ...dto, syncedAt: now },
});
```

---

## R-004：分類映射策略

**決策**：靜態映射表（`ALPHA_VANTAGE_TOPIC_MAP`），未命中標籤預設為 `'Other'`。

**理由**：
- spec 明確要求固定分類清單（FR-005、FR-005a）
- 靜態映射易於測試（property-based）且無外部依賴
- Alpha Vantage topics 為穩定的固定集合，不需動態學習

**映射表（完整）**：

| Alpha Vantage `topic` | NewsCategory |
|----------------------|--------------|
| `technology` | `Technology` |
| `finance` | `Finance` |
| `earnings` | `Earnings` |
| `mergers_and_acquisitions` | `Mergers` |
| `ipo` | `Finance` |
| `blockchain` | `Technology` |
| `economy_fiscal` | `General` |
| `economy_monetary` | `General` |
| `economy_macro` | `General` |
| `energy_transportation` | `General` |
| `manufacturing` | `General` |
| `real_estate` | `General` |
| `retail_wholesale` | `General` |
| `life_sciences` | `General` |
| （其他 / 空陣列） | `Other` |

**Property-based 測試要求**：
- 任意輸入不得拋出例外，必回傳合法的 `NewsCategory`
- 已知映射 key 必回傳正確分類
- 空陣列 `[]` 必回傳 `'Other'`
- 大小寫正規化（`TECHNOLOGY` → `technology` 後映射）

---

## R-005：配額保護與退避策略

**決策**：以 `SyncQuotaLog` DB 模型追蹤每日呼叫次數；軟限制 20 次，硬限制 24 次；失敗不重試。

**理由**：
- 既有 `rate-limiter.ts` 為記憶體式（程序重啟歸零），不適合跨部署的每日配額追蹤
- DB 持久化確保即使 Vercel 函式冷啟動後仍維持正確計數
- **不重試** 策略：Alpha Vantage 每日 25 次上限非常有限，重試會浪費配額；失敗後等待下次排程（最多 1 小時）對使用者影響可接受（SC-005：最多 60 分鐘陳舊）

**退避決策樹**：
```
同步觸發
  ├─ callCount >= 20 → 跳過，回傳 429，不呼叫 API，不消耗配額
  ├─ API 呼叫成功
  │   └─ upsert DB → 更新 lastSyncAt → 回傳 200
  └─ API 呼叫失敗（5xx / timeout / 網路錯誤）
      └─ 記錄 lastError → 不重試 → 回傳 503
         ← DB 保留前次資料，前端降級服務
```

**監控方案**：
- `SyncQuotaLog.lastError` 供外部監控工具掃描（如 Betterstack、Uptime Robot）
- `GET /api/dashboard/news` 回應中 `meta.dataStalenessSecs > 7200` 可觸發告警
- 可選：Admin 頁面顯示今日配額使用狀況（`quotaUsedToday / 25`）

---

## 研究結論摘要

| 項目 | 決策 | 關鍵約束 |
|------|------|---------|
| 外部 API | Alpha Vantage `NEWS_SENTIMENT` | 25 req/day，取 50 篇/次 |
| 排程器 | Vercel Cron / GitHub Actions | 每小時 `0 * * * *` |
| DB 模型 | 獨立 `DashboardNewsItem` | `externalId` 唯一（URL SHA-256） |
| 分類映射 | 靜態表，14 個 topics | 未命中 → `Other` |
| 配額保護 | `SyncQuotaLog` DB 持久化 | 軟限 20，硬限 24 |
| 失敗策略 | 不重試，服務舊資料 | 前端最多看到 60 分鐘陳舊資料 |

所有 NEEDS CLARIFICATION 項目已透過研究解決，無阻礙進入 Phase 1。
