# 快速上手指南：Next.js 至 Vite 遷移

**Branch**: `001-vite-migration` | **Date**: 2025-07-17
**適用對象**: 負責實作本遷移功能的開發者

---

## 前提條件

- Node.js LTS (v18+)
- PostgreSQL 資料庫已設定（Prisma 已初始化）
- Git 已安裝
- 熟悉 TypeScript、React、Express.js 基礎

---

## 專案現狀速覽

```
✅ 已完成                    ⚠️ 待處理
─────────────────────────    ─────────────────────────
Vite 6.3 建置工具           4 個 'use client' 範例檔
React Router v7 路由         43 個 NextRequest handler
next 套件已移除              process.env 客戶端使用
index.html + main.tsx        404 catch-all 路由
VITE_ 環境變數              端點清冊文件
```

---

## 開始開發

### 1. 切換分支並安裝相依套件

```bash
git checkout 001-vite-migration
npm install
```

### 2. 驗證現有環境

```bash
# 確認 Vite 開發伺服器正常
npm run dev
# → 應在 http://localhost:3000 啟動

# 確認建置成功
npm run build
# → 應在 dist/ 產生靜態檔案

# 確認 TypeScript 型別檢查
npx tsc --noEmit
# → 應通過（可能有 backend/ 相關警告，已排除在 tsconfig 中）

# 確認現有測試
npm test
# → 應全部通過
```

---

## 遷移工作流程

### Phase A：前端清理（低風險，先做）

#### A1. 移除 'use client' 指令

受影響檔案（4 個）：
```
src/components/charts/CandlestickPatternMarker.example.tsx
src/components/charts/SupportResistanceLines.example.tsx
src/components/charts/StrategyConditionBuilder.example.tsx
src/components/charts/TechnicalScoreCard.example.tsx
```

動作：刪除每個檔案開頭的 `'use client'` 行。

驗證：
```bash
# 搜尋確認零結果
grep -r "'use client'" src/
grep -r '"use client"' src/
```

#### A2. 修正 process.env 客戶端使用

檔案：`src/components/ui/ErrorBoundary.tsx`

```diff
- if (process.env.NODE_ENV === 'development') {
+ if (import.meta.env.DEV) {
```

> 注意：`src/lib/db/prisma.ts` 和 `src/services/dashboard-news-sync.service.ts` 為伺服器端程式碼，保留 `process.env` 不變。

#### A3. 新增 404 Catch-All 路由

1. 建立 `src/app/not-found/page.tsx`:
```tsx
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-lg text-gray-600 mb-8">
        找不到您要的頁面
      </p>
      <Link
        to="/dashboard"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        返回儀表板
      </Link>
    </div>
  )
}
```

2. 在 `src/routes.tsx` 中新增 catch-all 路由：
```tsx
import NotFoundPage from '@/app/not-found/page'

// 在 children 陣列最後加入：
{ path: '*', element: <NotFoundPage /> }
```

---

### Phase B：後端 API Handler 轉換

#### B1. 理解轉換模式

```typescript
// 轉換前 (Next.js)
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')
  
  try {
    const data = await someService.getData(symbol)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// 轉換後 (Express)
import { Request, Response } from 'express'

export async function GET(req: Request, res: Response) {
  const userId = req.headers['x-user-id'] as string
  const symbol = req.query.symbol as string
  
  try {
    const data = await someService.getData(symbol)
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: 'Failed' })
  }
}
```

#### B2. 轉換順序建議

按領域風險由低到高：

1. **工具類** (1 端點)：`query-tsm` — 最簡單，單一 GET
2. **快取管理** (1 端點)：`indicators/cache/clear` — 簡單操作
3. **新聞來源** (1 端點)：`news/sources` — 無認證，純讀取
4. **技術指標** (9 端點)：`indicators/*` — 全為 GET，模式一致
5. **股票** (3 端點)：`stocks/*` — 純讀取，外部 API 呼叫
6. **新聞** (4 端點)：其餘 `news/*`
7. **持股/損益** (4 端點)：`holdings`, `realized-pl`
8. **風險評估** (3 端點)：`risk-assessment/*`
9. **持股建議** (2 端點)：`holding-advice/*`
10. **策略** (3 端點)：`strategies/*` — 含 CRUD
11. **交易** (4 端點)：`transactions/*` — 含匯入匯出
12. **投資組合** (4 端點)：`portfolios/*` — 核心 CRUD
13. **認證** (4 端點)：`auth/*` — 最敏感，最後轉換
14. **同步/儀表板** (2 端點)：`sync`, `dashboard`

#### B3. 每個端點的轉換檢查清單

- [ ] 移除 `import { NextRequest, NextResponse } from 'next/server'`
- [ ] 新增 `import { Request, Response } from 'express'`
- [ ] 修改函式簽名為 `(req: Request, res: Response)`
- [ ] 替換 `request.json()` → `req.body`
- [ ] 替換 `request.nextUrl.searchParams.get()` → `req.query`
- [ ] 替換 `request.headers.get()` → `req.headers[]`
- [ ] 替換 `NextResponse.json(data)` → `res.json(data)`
- [ ] 替換 `NextResponse.json(data, { status: N })` → `res.status(N).json(data)`
- [ ] 替換 `request.cookies.get()` → `req.cookies`
- [ ] 確認錯誤處理路徑正確
- [ ] 執行相關測試驗證

---

### Phase C：文件與驗證

#### C1. 建立端點清冊

基於 `backend/api-inventory.json`，為每個端點撰寫：
- HTTP 方法與路徑
- 用途說明（zh-TW）
- 是否需要認證
- 請求/回應格式摘要

#### C2. 最終驗證清單

```bash
# 1. 零 Next.js 匯入
grep -r "from 'next/" src/ backend/
# → 應回傳零結果

# 2. 零 'use client' 指令
grep -r "'use client'" src/
# → 應回傳零結果

# 3. 建置成功
npm run build
# → 零錯誤

# 4. TypeScript 型別檢查
npx tsc --noEmit
# → 零錯誤

# 5. 所有測試通過
npm test
# → 全部通過

# 6. 開發伺服器啟動
npm run dev
# → < 5 秒內可訪問

# 7. 所有路由可訪問（手動驗證）
# 逐一訪問 12 個頁面路由 + 404 頁面
```

---

## 關鍵檔案參考

| 檔案 | 用途 |
|------|------|
| `src/routes.tsx` | 路由定義（新增 404） |
| `src/main.tsx` | 應用進入點（不需修改） |
| `vite.config.ts` | 建置設定（不需修改） |
| `backend/next-api-legacy/lib/middleware.ts` | 認證中間件（轉換 handler 簽名） |
| `backend/api-inventory.json` | 端點清冊源資料 |
| `specs/001-vite-migration/contracts/api-contracts.md` | API 合約規格 |

---

## 常見問題

**Q: 轉換 handler 後前端需要修改嗎？**
A: 不需要。前端透過 axios 呼叫 HTTP 端點，handler 簽名的改變對 HTTP 層透明。

**Q: 伺服器端的 process.env 需要改嗎？**
A: 不需要。`process.env` 在 Node.js 後端是標準用法。僅客戶端瀏覽器程式碼需使用 `import.meta.env`。

**Q: 現有的 API 測試會受影響嗎？**
A: 會。`backend/next-api-legacy/__tests_api__/` 中的測試可能使用 `NextRequest` 模擬，需同步更新為 Express 模擬。

**Q: 為什麼不直接建立 Express 伺服器？**
A: 獨立後端伺服器的建立超出本功能範圍。本次僅將 handler 簽名標準化，使其可在未來直接整合至 Express 伺服器。
