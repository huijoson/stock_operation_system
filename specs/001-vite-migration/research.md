# 研究報告：Next.js 至 Vite 遷移

**Branch**: `001-vite-migration` | **Date**: 2025-07-17
**來源**: Phase 0 研究 — 解決技術上下文中的所有待釐清事項

---

## 研究 1：後端 API 路由轉換策略

### 決策
將 `backend/next-api-legacy/` 中的 43 個 API 端點從 `NextRequest`/`NextResponse` 模式轉換為標準 Express.js handler 模式（`(req: Request, res: Response) => void`），保持檔案結構不變。

### 理由
1. **最小變更風險**：業務邏輯（服務層呼叫、Prisma 查詢、外部 API 調用）完全不變，僅替換請求/回應物件介面
2. **Express 已是社群標準**：Express.js 是 Node.js 最成熟的 HTTP 框架，與 Prisma、bcrypt 等現有相依套件完全相容
3. **漸進式部署**：轉換後的處理器可以立即在獨立 Express 伺服器中使用，也可繼續作為模組組織待後續整合
4. **型別安全**：`@types/express` 提供完整的 TypeScript 型別支援

### 考慮的替代方案
| 方案 | 優點 | 缺點 | 排除原因 |
|------|------|------|---------|
| Fastify | 效能更佳、schema 驗證 | 學習曲線、生態系較小 | 遷移期間增加額外學習成本不值得 |
| Hono | 輕量、跨平台 | 社群較新、TypeScript 型別支援較少文件 | 穩定性考量 |
| 原地保留 NextRequest | 無需修改 | 永遠依賴 `next/server` 套件 | 違反遷移目標 |

### 轉換對照表

| Next.js 模式 | Express 模式 |
|--------------|-------------|
| `NextRequest` | `Request` (express) |
| `NextResponse.json(data)` | `res.json(data)` |
| `NextResponse.json(data, { status: 400 })` | `res.status(400).json(data)` |
| `request.json()` | `req.body` (with express.json() middleware) |
| `request.nextUrl.searchParams` | `req.query` |
| `request.headers.get('x-user-id')` | `req.headers['x-user-id']` |
| `request.cookies.get('session_token')` | `req.cookies.session_token` (with cookie-parser) |
| `NextResponse.redirect()` | `res.redirect()` |

---

## 研究 2：`process.env` 客戶端替換策略

### 決策
將 `src/` 中 4 個使用 `process.env` 的檔案分為兩類處理：

### 發現

| 檔案 | 使用方式 | 處理方式 |
|------|---------|---------|
| `src/components/ui/ErrorBoundary.tsx` | `process.env.NODE_ENV === 'development'` | 替換為 `import.meta.env.DEV` |
| `src/lib/db/prisma.ts` | `process.env.NODE_ENV` (2 處) | **此檔案為伺服器端**，保留 `process.env` |
| `src/services/dashboard-news-sync.service.ts` | `process.env.ALPHA_VANTAGE_API_KEY` | **此檔案為伺服器端服務**，保留 `process.env` |

### 理由
1. Vite 在客戶端使用 `import.meta.env` 取代 `process.env`
2. `import.meta.env.DEV` 是 Vite 內建的布林值，等同於 `process.env.NODE_ENV !== 'production'`
3. 伺服器端程式碼（Prisma 客戶端、背景同步服務）應繼續使用 `process.env`，因為它們不經過 Vite 打包

### 考慮的替代方案
| 方案 | 排除原因 |
|------|---------|
| 全部改為 import.meta.env | 伺服器端程式碼不經過 Vite，import.meta.env 無效 |
| 使用 vite.config define 全域替換 | 過度工程化，僅 1 個檔案需要修改 |

---

## 研究 3：'use client' 指令移除影響

### 決策
直接移除 4 個範例檔案中的 `'use client'` 指令，無需其他修改。

### 發現
受影響檔案皆為 `.example.tsx` 格式：
1. `src/components/charts/CandlestickPatternMarker.example.tsx`
2. `src/components/charts/SupportResistanceLines.example.tsx`
3. `src/components/charts/StrategyConditionBuilder.example.tsx`
4. `src/components/charts/TechnicalScoreCard.example.tsx`

### 理由
1. `'use client'` 在純 Vite/React 環境中是無效指令（被忽略）
2. 這些是範例/展示檔案，非生產程式碼
3. 移除指令不影響任何功能行為
4. 消除「未完成遷移」的錯誤印象

---

## 研究 4：404 Catch-All 路由實作

### 決策
在 `src/routes.tsx` 中新增 `path: '*'` catch-all 路由，指向 `NotFoundPage` 元件。

### 現況
目前 `routes.tsx` 定義了 12 條路由，但**缺少 catch-all `*` 路由**。訪問不存在的 URL 會顯示空白頁面。

### 實作方式
```tsx
// src/routes.tsx - 在 children 陣列最後新增
{ path: '*', element: <NotFoundPage /> }
```

`NotFoundPage` 元件需：
- 顯示 zh-TW 「找不到頁面」訊息
- 提供返回首頁/儀表板的連結
- 遵循現有 Tailwind CSS 設計風格

### 理由
- FR-008 明確要求 catch-all 404 路由
- React Router v7 的 `*` 路由是標準做法
- 不需要伺服器端設定，純客戶端路由處理

---

## 研究 5：API 端點清冊文件格式

### 決策
建立 Markdown 格式的完整端點清冊，補充現有 `backend/api-inventory.json`。

### 現況
`backend/api-inventory.json` 已包含 43 個端點的結構化資料（路徑、HTTP 方法、匯入相依），但缺少：
- 人類可讀的用途說明
- 認證需求標示
- 請求/回應格式範例
- 領域分組導覽

### 理由
- FR-016 要求端點清冊包含「HTTP method, path, purpose, request/response shape, 是否需要認證」
- SC-005 要求「使不熟悉專案的開發者能理解並實作後端」
- JSON 格式不便閱讀，Markdown 更適合開發者文件

---

## 研究 6：憲法技術堆疊更新

### 決策
遷移完成後，需更新 `.specify/memory/constitution.md` 的 Technology Stack 區段：

```diff
- Next.js 15 with App Router architecture
+ Vite 6 with React Router v7 (React SPA)
```

### 理由
- 憲法是專案的最高規範文件，技術堆疊描述必須反映實際狀態
- 過時的描述會誤導新開發者
- 此更新屬於 MINOR 版本變更（新資訊，非破壞性）

---

## 研究 7：Bundle Size 影響評估

### 決策
移除 Next.js 相關程式碼預期不影響 bundle size，因為 `next` 套件已不在 `package.json` 中。

### 分析
- Vite 僅打包 `src/` 下的前端程式碼
- `backend/next-api-legacy/` 已排除在 tsconfig `include` 之外
- 現有 `dist/` 輸出為純 SPA 靜態檔案
- 預期 bundle size 變化 < 1%（僅移除少量 'use client' 字串）

### 風險
- 若轉換過程意外引入新的客戶端匯入，bundle 可能增大
- 需在建置後驗證 SC-008（bundle size 不增加超過 10%）

---

## 研究摘要

| 研究項目 | 狀態 | 關鍵決策 |
|---------|------|---------|
| API 路由轉換策略 | ✅ 已解決 | 使用 Express.js handler 模式 |
| process.env 替換 | ✅ 已解決 | 僅 1 個客戶端檔案需修改 |
| 'use client' 移除 | ✅ 已解決 | 直接移除，無副作用 |
| 404 路由 | ✅ 已解決 | React Router catch-all `*` 路由 |
| 端點清冊格式 | ✅ 已解決 | Markdown 格式，含認證標示 |
| 憲法更新 | ✅ 已解決 | 遷移後更新 Technology Stack |
| Bundle Size | ✅ 已解決 | 預期無顯著影響 |

**所有 NEEDS CLARIFICATION 項目均已解決。可進入 Phase 1 設計階段。**
