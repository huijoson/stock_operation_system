# 實作計畫：Next.js 至 Vite (React SPA) 遷移

**Branch**: `001-vite-migration` | **Date**: 2025-07-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-vite-migration/spec.md`

## 摘要

將股市投資組合管理系統從殘留的 Next.js 模式完全遷移至純 Vite React SPA 架構。專案目前已處於混合狀態：前端已使用 Vite + React Router v7 運行，但後端 API 路由（43 個端點位於 `backend/next-api-legacy/`）仍使用 `NextRequest`/`NextResponse` 模式。本計畫的核心工作為：

1. **後端 API 路由現代化** — 將 43 個端點從 Next.js Route Handler 模式轉換為標準 Express/Node.js 請求處理模式
2. **前端殘留清理** — 移除 4 個範例檔案中的 `'use client'` 指令、修正 `process.env` 使用
3. **路由完善** — 新增 404 catch-all 路由
4. **端點清冊文件** — 建立完整的 API 端點清冊供後端獨立部署使用
5. **專案設定驗證** — 確認 Vite 為唯一建置工具，無 Next.js 殘留設定

## 技術上下文

**語言/版本**: TypeScript 5.3 (strict mode), Node.js LTS
**主要相依套件**: Vite 6.3, React 18.3, React Router DOM 7.6, Prisma 6.19, Axios 1.13, Decimal.js 10.4
**資料儲存**: PostgreSQL + Prisma ORM
**測試框架**: Jest + fast-check (property-based testing)
**目標平台**: 瀏覽器端 SPA (靜態檔案部署) + 獨立 Node.js 後端 (未來部署)
**專案類型**: Web 應用 (前端 SPA + 後端 API 分離架構)
**效能目標**: API 回應 < 200ms, 首頁載入 < 3 秒 (4G), 初始 bundle < 500KB gzipped
**限制條件**: 遷移過程不得改變使用者介面或行為，純基礎架構變更
**規模範圍**: 12 個頁面路由, 43 個 API 端點, ~135+ TypeScript 檔案

### 現況分析

| 項目 | 現狀 | 目標 |
|------|------|------|
| `next` 套件 | ✅ 已移除 | 維持移除 |
| `next.config.js` | ✅ 不存在 | 維持不存在 |
| `next-env.d.ts` | ✅ 不存在 | 維持不存在 |
| Vite 建置 | ✅ 運作中 | 維持運作 |
| React Router | ✅ v7 已設定 | 新增 404 catch-all |
| `'use client'` 指令 | ⚠️ 4 個範例檔 | 0 個 |
| `next/` 匯入 | ⚠️ 60 個檔案 (legacy) | 0 個 (轉換完成) |
| `process.env` (客戶端) | ⚠️ 4 個檔案 | 0 個 (改用 `import.meta.env`) |
| API 路由 (NextRequest) | ⚠️ 43 端點 | 標準 Express 模式 |
| 端點清冊文件 | ⚠️ JSON 格式 | 完整 Markdown 文件 |

## 憲法檢查

*GATE: Phase 0 研究前必須通過。Phase 1 設計後重新檢查。*

### Pre-Design 檢查

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. 程式碼品質 | ✅ 通過 | TypeScript strict mode 已啟用；Decimal.js 用於財務計算；Prisma ORM 用於資料庫查詢 |
| II. 測試標準 | ✅ 通過 | Jest + fast-check 已設定；遷移以行為保留為主，需驗證現有測試通過 |
| III. 使用者體驗一致性 | ✅ 通過 | Tailwind CSS 維持不變；UI 無任何視覺變更 |
| IV. 效能要求 | ✅ 通過 | Bundle size 不增加超過 10%；Vite 開發伺服器 < 5 秒啟動 |
| V. 文件語言 | ✅ 通過 | 本計畫及產出文件使用 zh-TW |

### 注意事項

- **憲法技術堆疊條目已過時**：憲法 Technology Stack 區段仍記載 "Next.js 15 with App Router"，此遷移完成後需更新為 "Vite 6 with React Router v7"
- **TDD 適用性**：本功能為重構/遷移性質，TDD 的「先寫測試」原則調整為「確保現有測試全部通過 + 新增遷移驗證測試」
- **spec.md 語言**：既有 spec.md 以英文撰寫（在憲法 V 新增前建立），後續文件均以 zh-TW 撰寫

## 專案結構

### 文件 (本功能)

```text
specs/001-vite-migration/
├── plan.md              # 本檔案 (/speckit.plan 輸出)
├── research.md          # Phase 0 輸出 (/speckit.plan)
├── data-model.md        # Phase 1 輸出 (/speckit.plan)
├── quickstart.md        # Phase 1 輸出 (/speckit.plan)
├── contracts/           # Phase 1 輸出 (/speckit.plan)
│   └── api-contracts.md     # API 合約規格
└── tasks.md             # Phase 2 輸出 (/speckit.tasks — 非本命令產出)
```

### 原始碼 (儲存庫根目錄)

```text
src/                          # 前端 SPA 原始碼
├── app/                      # 頁面元件 (維持現有結構)
│   ├── (auth)/               # 登入/註冊頁面
│   ├── dashboard/            # 儀表板
│   ├── portfolios/           # 投資組合 (含動態路由)
│   ├── transactions/         # 交易記錄
│   ├── strategy-builder/     # 策略建構器
│   ├── technical-analysis/   # 技術分析
│   ├── fibonacci-tool/       # 費波那契工具
│   └── backtest-results/     # 回測結果
├── components/               # 可重用元件
│   ├── ui/                   # 基礎 UI 元件
│   ├── charts/               # 圖表元件
│   ├── portfolio/            # 投資組合元件
│   ├── transactions/         # 交易元件
│   ├── news/                 # 新聞元件
│   └── stocks/               # 股票元件
├── services/                 # 業務邏輯服務 (23 個檔案)
├── hooks/                    # 自定義 React Hooks
├── types/                    # TypeScript 型別定義
├── layouts/                  # 佈局元件
├── lib/                      # 工具函式庫
├── constants/                # 常數定義
├── routes.tsx                # React Router 路由定義
└── main.tsx                  # 應用程式進入點

backend/                      # 後端原始碼
├── next-api-legacy/          # 待轉換的 Legacy API 處理器
│   ├── auth/                 # 認證 (4 端點)
│   ├── portfolios/           # 投資組合 (4 端點)
│   ├── transactions/         # 交易 (4 端點)
│   ├── stocks/               # 股票 (3 端點)
│   ├── news/                 # 新聞 (5 端點)
│   ├── indicators/           # 技術指標 (9 端點)
│   ├── risk-assessment/      # 風險評估 (3 端點)
│   ├── holding-advice/       # 持股建議 (2 端點)
│   ├── strategies/           # 策略 (3 端點)
│   ├── realized-pl/          # 已實現損益 (2 端點)
│   ├── holdings/             # 持股 (1 端點)
│   ├── dashboard/            # 儀表板 (1 端點)
│   ├── sync/                 # 同步 (1 端點)
│   ├── query-tsm/            # 台股查詢 (1 端點)
│   ├── lib/                  # 中間件 & 錯誤處理
│   └── __tests_api__/        # API 測試 (12 個檔案)
└── api-inventory.json        # 端點清冊 (JSON)

tests/                        # 測試目錄
├── unit/                     # 單元測試
├── property/                 # 屬性測試
└── integration/              # 整合測試

prisma/                       # 資料庫 schema & 遷移
```

**結構決策**: 採用前後端分離架構。前端為純 SPA (`src/`)，後端 API 處理器位於 `backend/` 目錄。遷移期間 `backend/next-api-legacy/` 中的檔案將就地轉換為標準 Node.js/Express 模式，後續可直接整合至獨立後端伺服器。

## 複雜度追蹤

| 違反項 | 必要原因 | 拒絕更簡單替代方案之原因 |
|--------|---------|------------------------|
| TDD 先寫測試 → 改為驗證現有測試 | 遷移/重構性質，邏輯不變 | 對已通過測試的程式碼重寫測試無實際價值 |
| spec.md 為英文 | 在憲法 V 新增前已建立並通過審核 | 重新翻譯已通過的規格會產生不一致風險 |

---

# 分階段執行路線圖 (Phased Execution Roadmap)

> 依據 2026-03-06 程式碼庫審計結果產出。每個階段可獨立測試與驗證。

## 現況審計摘要

| 項目 | 狀態 | 詳情 |
|------|------|------|
| Vite 建置工具 | ✅ 完成 | `vite.config.ts`, `index.html`, `src/main.tsx` |
| React Router DOM | ✅ 完成 | 12 路由於 `src/routes.tsx` |
| VITE_ 環境變數 | ✅ 完成 | 客戶端無 `NEXT_PUBLIC_` 或 `process.env` |
| `next` 已移除 | ✅ 完成 | 不在 `package.json` 中 |
| `next/` 匯入 (前端) | ✅ 完成 | `src/` 中零匯入 |
| API handlers 已萃取 | ⚠️ 部分 | 43 handlers 於 `backend/next-api-legacy/` 仍用 NextRequest/NextResponse |
| Services 含 Prisma | ❌ 未遷移 | 16 個 services 於 `src/services/` 直接匯入 Prisma |
| `'use client'` 指令 | ⚠️ 輕微 | 7 個範例/README 檔案 |
| 後端伺服器 | ❌ 不存在 | 無 Express/Fastify 伺服器 |
| CI/CD | ❌ 不存在 | 無 GitHub Actions 工作流程 |
| 認證中介層 | ❌ 需轉換 | 使用 NextRequest 於 `backend/next-api-legacy/lib/middleware.ts` |

---

## Phase 1：後端基礎設施 🏗️

**目標**：建立可運作的 Express 伺服器，含 Prisma、中介層、health check — 零業務邏輯。

**範圍**：建立所有 API 遷移的目標後端框架。

### 任務清單

| # | 任務 | 檔案 |
|---|------|------|
| 1.1 | 建立 `backend/package.json`：Express, cors, cookie-parser, @prisma/client, ts-node, typescript | `backend/package.json` |
| 1.2 | 建立 `backend/tsconfig.json` 繼承根設定，目標 CommonJS/Node | `backend/tsconfig.json` |
| 1.3 | 建立 Express 應用程式入口：`backend/src/app.ts` 含 CORS, JSON body parser, cookie parser | `backend/src/app.ts` |
| 1.4 | 建立伺服器入口：`backend/src/server.ts`（監聽 PORT 環境變數） | `backend/src/server.ts` |
| 1.5 | 複製 `src/lib/db/prisma.ts` → `backend/src/lib/prisma.ts`（舊位置保留再匯出供過渡期使用） | `backend/src/lib/prisma.ts` |
| 1.6 | 轉換認證中介層從 NextRequest → Express：`backend/src/middleware/auth.ts` | `backend/src/middleware/auth.ts` |
| 1.7 | 建立錯誤處理中介層：`backend/src/middleware/error-handler.ts` | `backend/src/middleware/error-handler.ts` |
| 1.8 | 建立 health check 路由：`GET /api/health` | `backend/src/routes/health.ts` |
| 1.9 | 新增後端腳本至根 `package.json`：`backend:dev`, `backend:build`, `backend:start` | `package.json` |
| 1.10 | 建立 `backend/src/types/express.d.ts` 擴充 Express Request 型別加入 user 上下文 | `backend/src/types/express.d.ts` |
| 1.11 | 更新 Vite 開發伺服器代理：`/api` → `http://localhost:3001` | `vite.config.ts` |

### 退出條件

- [ ] `cd backend && npm install && npm run dev` 於 port 3001 啟動 Express
- [ ] `curl http://localhost:3001/api/health` 回傳 `{ "status": "ok" }`
- [ ] Prisma client 從後端程序連接 PostgreSQL
- [ ] 認證中介層從 cookie 萃取 session token 並透過 AuthService 驗證
- [ ] Vite 開發伺服器將 `/api/*` 代理至後端
- [ ] 前後端 `tsc --noEmit` 均通過

### 測試 / 驗證

- 單元測試：認證中介層對遺漏/無效 token 回傳 401
- 單元測試：認證中介層對有效 token 將 user 附加至 `req.user`
- 整合測試：health check 回傳 200
- 手動：`npm run dev`（前端）+ `npm run backend:dev` → 前端可達 `/api/health`

### 回滾策略

刪除 `backend/src/` 目錄並還原 `vite.config.ts` 代理變更。前端繼續使用 stubbed/mocked API 運作。

### CI/CD 檢查點

```
✓ backend:build 成功（tsc 編譯通過）
✓ 後端單元測試通過
✓ 前端建置仍然成功（無回歸）
```

---

## Phase 2：後端 API 萃取 🔄

**目標**：將全部 43 個 API handlers 從 NextRequest/NextResponse 轉換為 Express 路由處理器，依領域組織。

**範圍**：純機械式轉換 — 保留所有業務邏輯，僅變更 HTTP 層。

### 任務清單

| # | 任務 | Handler 數量 |
|---|------|-------------|
| 2.1 | 建立路由註冊器模式：`backend/src/routes/index.ts` 聚合所有領域路由器 | 1 檔案 |
| 2.2 | 轉換 **auth** 路由：login, logout, register, me | 4 handlers |
| 2.3 | 轉換 **portfolios** 路由：list, create, get by ID, update, delete + holdings + transactions | 4 handlers |
| 2.4 | 轉換 **transactions** 路由：CRUD + import/export | 4 handlers |
| 2.5 | 轉換 **stocks** 路由：search, price, history | 3 handlers |
| 2.6 | 轉換 **indicators** 路由：RSI, MACD, Bollinger, ATR, Fibonacci (ret+ext), support/resistance, candlestick, technical-score, cache-clear | 12 handlers |
| 2.7 | 轉換 **strategies** 路由：CRUD + backtest | 5 handlers |
| 2.8 | 轉換 **news** 路由：by symbol, sources, sentiment, portfolio news | 4 handlers |
| 2.9 | 轉換 **risk-assessment** 路由：by symbol, batch, by portfolio | 3 handlers |
| 2.10 | 轉換 **realized-pl** 路由：query + by portfolio | 2 handlers |
| 2.11 | 轉換 **holding-advice** 路由：by symbol, by portfolio | 2 handlers |
| 2.12 | 轉換 **dashboard** + **sync** + **query-tsm** + **holdings/export** 路由 | 4 handlers |
| 2.13 | 遷移現有 API 測試檔案（12 個測試）至 Jest/supertest | 12 test files |

### 轉換模式

```typescript
// 轉換前 (NextRequest/NextResponse)
import { NextRequest, NextResponse } from 'next/server'
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')
  return NextResponse.json({ data })
}

// 轉換後 (Express)
import { Request, Response, NextFunction } from 'express'
export async function getRSI(req: Request, res: Response, next: NextFunction): Promise<void> {
  const symbol = req.query.symbol as string
  res.json({ data })
}
```

### 平行執行說明

任務 2.2–2.12 為**獨立**作業，可跨開發者平行執行。每個領域自成一體。

### 退出條件

- [ ] 全部 43 handlers 轉換為 Express 模式
- [ ] `backend/src/` 中零 `next/server` 匯入
- [ ] 全部 43 端點透過 `curl` / supertest 正確回應
- [ ] 全部 12 個遷移後 API 測試通過
- [ ] `backend/next-api-legacy/` 可標記為棄用（尚未刪除）

### 測試 / 驗證

- 依領域 supertest 測試套件：auth (4), portfolios (4), transactions (4), stocks (3), indicators (12), strategies (5), news (4), risk (3), realized-pl (2), holding-advice (2), misc (4)
- 執行完整 API 測試套件：`cd backend && npm test`
- 驗證需認證路由在無 token 時回傳 401
- 驗證 CORS headers 允許前端 origin

### 回滾策略

每個領域路由器獨立註冊於 `routes/index.ts`。回滾單一領域只需註解其註冊，前端回退至 legacy stub 行為。

### CI/CD 檢查點

```
✓ backend:build 成功
✓ 全部 API 測試通過（目標：47 個端點測試）
✓ backend/src/ 中零 NextRequest/NextResponse 匯入
✓ 前端建置仍然成功
```

---

## Phase 3：前端清理與接線 🎨

**目標**：清除前端所有 Next.js 殘留，將元件接線至 Express 後端，並遷移 Prisma 相依服務。

**範圍**：前端純化 — 此階段完成後，`src/` 無任何伺服器端程式碼。

### 任務清單

| # | 任務 | 檔案 |
|---|------|------|
| 3.1 | 移除 7 個範例/README 檔案中的 `'use client'` | 7 files in `src/components/charts/` |
| 3.2 | 遷移 16 個 Prisma 相依服務從 `src/services/` → `backend/src/services/` | 16 service files |
| 3.3 | 建立前端 API 客戶端層：`src/services/api-client.ts`（axios wrapper，base URL 來自 `VITE_API_URL`） | 1 file |
| 3.4 | 建立前端服務包裝器，呼叫 API 客戶端而非 Prisma | ~10 files in `src/services/` |
| 3.5 | 從前端移除 `src/lib/db/`（Prisma client）— 現為純後端 | 3 files |
| 3.6 | 更新所有元件匯入使用新前端服務包裝器 | ~20 components |
| 3.7 | 刪除 `vercel.json` cron 設定（cron 移至後端排程器或外部服務） | 1 file |
| 3.8 | 驗證 `tsconfig.json` 排除 `backend/` 於前端編譯 | 1 file |
| 3.9 | 驗證 bundle 不包含 `@prisma/client`（tree-shaking 檢查） | Build output |
| 3.10 | 從根 `dependencies` 移除 `@prisma/client` 與 `prisma`（保留於 `backend/`） | `package.json` |

### 服務遷移對照表

| 服務 | 現有位置 | 目標位置 |
|------|---------|---------|
| auth.service.ts | src/services/ | backend/src/services/ |
| portfolio.service.ts | src/services/ | backend/src/services/ |
| transaction.service.ts | src/services/ | backend/src/services/ |
| stock.service.ts | src/services/ | backend/src/services/ |
| news.service.ts | src/services/ | backend/src/services/ |
| strategy.service.ts | src/services/ | backend/src/services/ |
| risk-assessment.service.ts | src/services/ | backend/src/services/ |
| realized-pl.service.ts | src/services/ | backend/src/services/ |
| holding-advice.service.ts | src/services/ | backend/src/services/ |
| sentiment-analysis.service.ts | src/services/ | backend/src/services/ |
| credibility.service.ts | src/services/ | backend/src/services/ |
| chart.service.ts | src/services/ | backend/src/services/ |
| dashboard-news.service.ts | src/services/ | backend/src/services/ |
| dashboard-news-sync.service.ts | src/services/ | backend/src/services/ |
| indicator-cache.service.ts | src/services/ | backend/src/services/ |
| tax-lot.service.ts | src/services/ | backend/src/services/ |

**保留前端的純服務**（無 Prisma）：`atr.service.ts`, `bollinger-bands.service.ts`, `candlestick-pattern.service.ts`, `fibonacci.service.ts`, `indicator-optimization.service.ts`, `macd.service.ts`, `rsi.service.ts`, `support-resistance.service.ts`, `technical-score.service.ts`

### 退出條件

- [ ] `src/` 目錄零 Prisma 匯入
- [ ] `src/` 中零 `'use client'` 或 `'use server'` 指令
- [ ] 前端 `npm run build` 產出 bundle < 500KB（無 Prisma 膨脹）
- [ ] 所有頁面指向後端 API 時正確渲染
- [ ] 根 `node_modules` 生產依賴中無 `@prisma/client`

### 測試 / 驗證

- `npm run build` → 檢查 bundle 大小，驗證輸出中無 Prisma
- `npm run type-check` → 零錯誤
- `grep -r "from '@prisma" src/` → 零結果
- `grep -r "'use client'" src/` → 零結果
- Smoke test：瀏覽全部 12 路由，驗證資料從 API 載入

### 回滾策略

前端服務包裝器為新增層 — 舊的直接匯入服務保留於 `backend/src/services/`。若前端接線失敗，還原 `src/services/` 變更並暫時保留根 deps 中的 Prisma。

### CI/CD 檢查點

```
✓ 前端建置成功，bundle 大小減少
✓ src/ 中零 Prisma 匯入
✓ 零 'use client' 指令
✓ 全部前端單元測試通過
✓ 全部屬性測試通過（23 個檔案）
```

---

## Phase 4：整合測試與認證流程 🔗

**目標**：驗證完整技術堆疊端到端運作 — 前端 ↔ 後端 ↔ 資料庫 — 含正確的 auth、CORS、錯誤處理。

**範圍**：僅在兩端連接時才浮現的跨切面關注點。

### 任務清單

| # | 任務 | 詳情 |
|---|------|------|
| 4.1 | 撰寫 E2E 測試：login → dashboard → portfolio CRUD → logout 流程 | Playwright |
| 4.2 | 測試 CORS 設定：允許前端 origin，拒絕其他 | supertest + 瀏覽器 |
| 4.3 | 測試 cookie-based auth：session token 在前後端間正確 set/read/clear | 整合測試 |
| 4.4 | 測試錯誤傳遞：後端錯誤以使用者友善的 zh-TW 訊息呈現 | UI 驗證 |
| 4.5 | 測試並行開發工作流程：`npm run dev` (Vite:3000) + `npm run backend:dev` (Express:3001) | 手動 + 腳本 |
| 4.6 | 建立 `docker-compose.yml` 本地開發環境：frontend + backend + PostgreSQL | 1 file |
| 4.7 | 更新 `scripts/` 工具腳本配合新後端結構 | 4 script files |
| 4.8 | 驗證所有端點 API 回應時間 < 200ms | 負載測試 / benchmark |
| 4.9 | 測試 404 處理：未知 API 路由回傳 JSON 錯誤，未知前端路由顯示 404 頁面 | 雙層驗證 |
| 4.10 | 建立統一開發啟動腳本：`npm run dev:full`（同時啟動前後端） | `package.json` |

### 退出條件

- [ ] E2E 測試套件通過：login → CRUD → logout
- [ ] 全部 API 端點回應 < 200ms
- [ ] CORS 正確限制 origins
- [ ] Cookie auth 在前後端間運作正常
- [ ] 錯誤訊息以 zh-TW 顯示
- [ ] `docker-compose up` 啟動完整技術堆疊

### 測試 / 驗證

- Playwright E2E 套件：5+ 場景涵蓋關鍵使用者旅程
- CORS 測試：`curl -H "Origin: http://evil.com"` 不回傳 CORS headers
- Auth 流程測試：login 設定 cookie, 受保護路由可用, logout 清除
- 效能：`autocannon` 或 `ab` 針對關鍵端點基準測試

### 回滾策略

整合測試為增量式 — 不修改生產程式碼。若發現問題，修正回到 Phase 2（後端）或 Phase 3（前端）作為補丁。

### CI/CD 檢查點

```
✓ E2E 測試於 CI 中通過（Playwright）
✓ 全部 unit + property + integration 測試通過
✓ docker-compose up 於 CI 中成功
✓ API 回應時間基準測試符合預算
```

---

## Phase 5：強化與發布 🚀

**目標**：生產就緒 — CI/CD 管線、部署設定、文件、清理。

**範圍**：安全發布與長期維護所需的一切。

### 任務清單

| # | 任務 | 詳情 |
|---|------|------|
| 5.1 | 建立 `.github/workflows/ci.yml`：lint + type-check + test (frontend) + test (backend) + build | CI 管線 |
| 5.2 | 建立 `.github/workflows/deploy.yml`：build + deploy frontend (static) + deploy backend (Docker) | CD 管線 |
| 5.3 | 刪除 `backend/next-api-legacy/` 目錄 | 清理 |
| 5.4 | 刪除 `src/app/api/` stubs（若仍存在） | 清理 |
| 5.5 | 移除或更新 `vercel.json` 為純 SPA 部署 | 設定 |
| 5.6 | 更新 `README.md`：新架構、設定說明、開發工作流程 | 文件 |
| 5.7 | 更新 `docs/getting-started.md` 與 `docs/quick-start.md` | 文件 |
| 5.8 | 建立 `backend/README.md` 含 API 文件 | 文件 |
| 5.9 | 驗證 spec.md 中 SC-001 至 SC-008（全部成功標準） | 驗證 |
| 5.10 | 最終 bundle 大小審計：frontend < 500KB, 無伺服器端程式碼洩漏 | 建置檢查 |
| 5.11 | 安全審計：bundle 中無密鑰, auth tokens 範圍正確, HTTPS 強制 | 安全 |
| 5.12 | 更新憲法 Technology Stack 區段：Next.js 15 → Vite 6 + Express | 設定 |

### 退出條件

- [ ] CI 管線全部檢查通過
- [ ] CD 管線部署前後端成功
- [ ] `backend/next-api-legacy/` 已刪除 — 倉庫中零 Next.js 模式
- [ ] 全部 8 項成功標準（SC-001 至 SC-008）已驗證
- [ ] README 準確反映新架構
- [ ] Bundle < 500KB, API < 200ms, 開發伺服器 < 5s 啟動

### 測試 / 驗證

- CI：全部 3 個測試套件通過（unit, property, integration/e2e）
- `npm run build` + `npm run backend:build` 均成功
- `grep -r "next/" --include="*.ts" --include="*.tsx" src/ backend/src/` → 零結果
- Lighthouse 審計：效能分數 ≥ 90
- 安全：`npm audit` 無重大弱點

### 回滾策略

若生產部署失敗，前一版部署保持活躍。可使用 feature flags 或 blue-green 部署。Git branch 保留遷移前狀態。

### CI/CD 檢查點

```
✓ 完整 CI 管線通過（lint + typecheck + test + build）
✓ 部署至 staging 成功
✓ staging 中 smoke tests 通過
✓ 生產部署含監控
```

---

## 相依關係圖

```
Phase 1 (後端基礎設施) ──────────┬──→ Phase 2 (API 萃取)
                                  │
                                  └──→ Phase 3 (前端清理) ←── 任務 3.1, 3.7 可獨立先行
                                             │
                                             ├── 任務 3.2-3.6 依賴 Phase 2 完成
                                             │
Phase 2 + Phase 3 (皆完成) ────────→ Phase 4 (整合測試)
                                             │
Phase 4 (完成) ───────────────────→ Phase 5 (強化與發布)
```

### 可平行執行項目

| 可平行 | 原因 |
|--------|------|
| Phase 2 任務 (2.2–2.12) | 每個 API 領域獨立 |
| Phase 3.1 + Phase 1 | `'use client'` 移除無相依性 |
| Phase 3.7 + Phase 1 | vercel.json 清理獨立 |
| Phase 2 (任一領域) + Phase 3.1 | 無重疊 |
| Phase 4.6 (docker-compose) + Phase 4.1–4.5 | 基礎設施 vs 測試 |
| Phase 5.6–5.8 (文件) + Phase 5.1–5.2 (CI/CD) | 文件 vs 管線 |

### 嚴格順序相依

| 必須先完成 | 才能開始 |
|-----------|---------|
| Phase 1（後端框架） | Phase 2（API 轉換需要 Express 作為目標） |
| Phase 2（API 運作中） | Phase 3.2–3.6（前端接線需要可呼叫的 API） |
| Phase 1.11（Vite 代理） | Phase 4（整合需要代理運作） |
| Phase 3（前端清理完成） | Phase 5.3（僅在前端解耦後才刪除 legacy） |
| Phase 4（全部測試通過） | Phase 5.1（CI 設定需要已知可通過的測試套件） |

---

## 預估時程

| 階段 | 工期 | 可平行? | 累計天數 |
|------|------|---------|---------|
| Phase 1 | 2–3 天 | — | 第 3 天 |
| Phase 2 | 4–6 天 | 是（領域平行） | 第 9 天 |
| Phase 3 | 3–4 天 | 部分與 Phase 2 重疊 | 第 12 天 |
| Phase 4 | 2–3 天 | Phase 2+3 完成後 | 第 15 天 |
| Phase 5 | 2–3 天 | 部分平行 | 第 18 天 |

**總計：~15–18 工作天**（單一開發者），平行化可縮短至 **~10–12 天**。

---

## 各階段風險緩解

| 階段 | 關鍵風險 | 緩解措施 |
|------|---------|---------|
| 1 | 新後端 Prisma 連線問題 | 立即以 health check + DB ping 測試 |
| 2 | 轉換過程中業務邏輯回歸 | 保留 legacy handlers 作為參考；差異比對回應 |
| 3 | 遺漏 API 客戶端呼叫（元件損壞） | TypeScript strict mode 捕捉缺失的服務呼叫 |
| 4 | 跨 origin CORS / cookie 問題 | 開發環境用 Vite proxy 消除 CORS；生產用同源或明確設定 |
| 5 | CI 環境差異 | Docker-based CI 匹配本地 docker-compose |

---

## 目標專案結構

```text
stock_operation_system/
├── backend/
│   ├── package.json              # Express, Prisma, cors, etc.
│   ├── tsconfig.json
│   └── src/
│       ├── app.ts                # Express app 設定
│       ├── server.ts             # 監聽入口
│       ├── lib/
│       │   └── prisma.ts         # Prisma client 單例
│       ├── middleware/
│       │   ├── auth.ts           # Session cookie 認證
│       │   └── error-handler.ts  # 統一錯誤處理
│       ├── routes/
│       │   ├── index.ts          # 路由註冊器
│       │   ├── auth.ts           # 認證 (4 端點)
│       │   ├── portfolios.ts     # 投資組合 (4 端點)
│       │   ├── transactions.ts   # 交易 (4 端點)
│       │   ├── stocks.ts         # 股票 (3 端點)
│       │   ├── indicators.ts     # 技術指標 (12 端點)
│       │   ├── strategies.ts     # 策略 (5 端點)
│       │   ├── news.ts           # 新聞 (4 端點)
│       │   ├── risk-assessment.ts # 風險評估 (3 端點)
│       │   ├── realized-pl.ts    # 已實現損益 (2 端點)
│       │   ├── holding-advice.ts # 持股建議 (2 端點)
│       │   ├── dashboard.ts      # 儀表板 (1 端點)
│       │   └── health.ts         # 健康檢查
│       ├── services/             # 從 src/services/ 遷移（Prisma 相依）
│       │   ├── auth.service.ts
│       │   ├── portfolio.service.ts
│       │   ├── ... (共 16 個)
│       │   └── __tests__/
│       └── types/
│           └── express.d.ts
├── src/                          # 純前端 (SPA)
│   ├── main.tsx
│   ├── routes.tsx
│   ├── App.tsx
│   ├── services/                 # API 客戶端包裝器（無 Prisma）
│   │   ├── api-client.ts         # Axios 基礎客戶端
│   │   ├── portfolio.api.ts      # 投資組合 API 呼叫
│   │   └── ...
│   ├── components/               # React 元件
│   ├── hooks/                    # 自定義 hooks
│   ├── lib/                      # 純工具函式（無 db/）
│   └── types/                    # TypeScript 型別
├── tests/                        # 前端 + 共用測試
│   ├── unit/                     # 單元測試 (14 files)
│   ├── property/                 # 屬性測試 (23 files)
│   └── integration/              # 整合測試 (2 files)
├── prisma/                       # Schema 保留於根目錄（共用）
├── .github/
│   └── workflows/
│       ├── ci.yml                # CI 管線
│       └── deploy.yml            # CD 管線
├── vite.config.ts                # 前端建置設定
├── package.json                  # 前端 deps only
└── docker-compose.yml            # 本地開發環境
```

---

## Post-Design 憲法重新檢查

*Phase 1 設計完成後重新驗證*

| 原則 | 狀態 | 說明 |
|------|------|------|
| I. 程式碼品質 | ✅ 通過 | API handler 轉換保持 TypeScript strict mode；Express 型別來自 `@types/express`；Prisma ORM 使用不變 |
| II. 測試標準 | ✅ 通過 | 現有測試需全部通過；API 測試需同步更新 mock 物件；新增 404 路由需測試 |
| III. 使用者體驗一致性 | ✅ 通過 | 404 頁面使用 Tailwind CSS + zh-TW 文字；UI 無其他變更 |
| IV. 效能要求 | ✅ 通過 | Bundle size 預期無變化；API 回應時間不受 handler 簽名影響 |
| V. 文件語言 | ✅ 通過 | plan.md、research.md、data-model.md、quickstart.md、contracts 均使用 zh-TW |

### 設計決策對憲法的影響

1. **Express handler 模式** — 符合原則 I（程式碼品質）：使用社群標準框架，完整型別支援
2. **API 合約不變性** — 符合原則 IV（效能要求）：請求/回應格式不變，效能指標不受影響
3. **404 頁面 zh-TW** — 符合原則 III（UX 一致性）和原則 V（文件語言）

### 必要後續動作
- ⚠️ 遷移完成後需更新憲法 Technology Stack：`Next.js 15 with App Router` → `Vite 6 with React Router v7`
- ⚠️ API 測試中的 `NextRequest` mock 需更新為 Express `Request` mock
