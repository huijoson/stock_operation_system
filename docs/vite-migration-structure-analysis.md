# Vite 遷移與專案結構分析

> **文件用途**：記錄本專案從 Next.js 單體式架構遷移至 Vite + Express 分離式架構的完整前後對照分析，並作為目前專案結構的開發實作指引。
>
> **適用對象**：未來接手或參與本倉庫開發的維護者與開發者。
>
> **使用時機**：
> - 首次接手專案時，了解架構設計決策與目錄結構
> - 新增功能時，查閱開發實作指引與常見陷阱
> - 需要理解遷移背景時，對照 Next.js 與 Vite + Express 的差異
>
> **基準點**：
> - 轉換前（Pre-Vite）：commit `691b360` — Next.js 15 App Router 單體式架構
> - 轉換後（Post-Vite）：目前 `HEAD` — Vite (前端 SPA) + Express (後端 API) 分離式架構

---

## 目錄

1. [背景與目的](#1-背景與目的)
2. [轉換前（Next.js）架構摘要](#2-轉換前nextjs架構摘要)
3. [轉換後（Vite + Express）架構摘要](#3-轉換後vite--express架構摘要)
4. [前後差異對照表](#4-前後差異對照表)
5. [目前專案結構地圖](#5-目前專案結構地圖)
6. [開發實作指引](#6-開發實作指引)
7. [常見陷阱與建議流程](#7-常見陷阱與建議流程)

---

## 1. 背景與目的

本專案「stock-portfolio-system」原採用 **Next.js 15 App Router** 單體式架構，前端頁面與後端 API Route Handlers 共存於 `src/app/` 目錄下。隨專案規模成長，出現以下痛點：

- **前後端耦合度高**：API route handlers 與頁面元件混雜於同一目錄樹，修改 API 邏輯容易牽動前端建置。
- **部署彈性不足**：Next.js 需要 Node.js 執行環境執行 SSR/API，無法將前端靜態產出物獨立部署至 CDN。
- **開發效率**：Vite 的 HMR 速度遠快於 Next.js dev server，大幅提升前端開發迭代速度。
- **關注點分離**：將業務邏輯（DB 存取、外部 API 整合）集中於獨立 Express 後端，有助於測試與維護。

因此決定遷移至 **Vite (React SPA) + Express (REST API)** 雙套件架構，前端透過 HTTP 呼叫後端 API，兩者可獨立開發、測試、部署。

---

## 2. 轉換前（Next.js）架構摘要

### 技術棧

| 項目 | 技術 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| 執行環境 | Node.js (SSR + API) |
| 路由 | 檔案系統路由 (`src/app/**/page.tsx`, `src/app/api/**/route.ts`) |
| 建置指令 | `next build` → `.next/` |
| 開發指令 | `next dev` |
| 部署目標 | Vercel / Node.js server |
| DB 存取 | API Route Handlers 直接使用 Prisma Client |

### 關鍵目錄結構

```
stock_operation_system/          # commit 691b360
├── next.config.js               # Next.js 設定
├── package.json                 # 單一 package.json
├── src/
│   ├── app/
│   │   ├── page.tsx                              # 首頁
│   │   ├── dashboard/page.tsx                    # 儀表板
│   │   ├── portfolios/page.tsx                   # 投組列表
│   │   ├── portfolios/[id]/page.tsx              # 投組詳情
│   │   ├── portfolios/[id]/holdings/[symbol]/page.tsx
│   │   ├── transactions/[portfolioId]/page.tsx
│   │   ├── strategy-builder/page.tsx
│   │   ├── technical-analysis/page.tsx
│   │   ├── fibonacci-tool/page.tsx
│   │   ├── backtest-results/[id]/page.tsx
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/register/page.tsx
│   │   ├── api/                   # ★ API Route Handlers（與頁面同層）
│   │   │   ├── auth/login/route.ts
│   │   │   ├── auth/register/route.ts
│   │   │   ├── portfolios/route.ts
│   │   │   ├── portfolios/[id]/route.ts
│   │   │   ├── stocks/[symbol]/price/route.ts
│   │   │   ├── indicators/rsi/route.ts
│   │   │   ├── news/[symbol]/route.ts
│   │   │   ├── risk-assessment/[symbol]/route.ts
│   │   │   ├── realized-pl/route.ts
│   │   │   └── ... (共 30+ route handlers)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/              # React 元件
│   ├── services/                # 前端用 service（含技術指標計算）
│   ├── lib/                     # 工具函式
│   ├── hooks/                   # React hooks
│   └── types/                   # TypeScript 型別
├── prisma/                      # Prisma schema & migrations
└── tests/                       # 測試（unit / property / integration）
```

### 核心特點

- **每個 API endpoint 是一個 `route.ts` 檔案**，export `GET`/`POST`/`PUT`/`DELETE` 函式，使用 `NextRequest`/`NextResponse`。
- **Prisma Client 在 API route handler 內直接 import 使用**，無獨立後端服務層。
- **SSR/SSG 能力**：Next.js 可進行伺服器端渲染，但本專案主要使用 client component。
- **部署為單一應用**：前端 + API 統一由 Vercel 或 Node.js server 提供。

---

## 3. 轉換後（Vite + Express）架構摘要

### 技術棧

| 項目 | 技術 |
|------|------|
| 前端框架 | Vite + React 18 (SPA) |
| 前端路由 | react-router-dom v7（`src/routes.tsx` 集中定義） |
| 後端框架 | Express 4（`backend/`） |
| 前端建置指令 | `vite build` → `dist/` |
| 後端建置指令 | `cd backend && tsc` → `backend/dist/` |
| 前端開發指令 | `npm run dev`（Vite dev server, port 3000） |
| 後端開發指令 | `npm run backend:dev`（ts-node, port 3001） |
| 同時啟動 | `npm run dev:full`（concurrently） |
| API 代理 | Vite dev server proxy `/api` → `localhost:3001` |
| DB 存取 | 僅後端 Express 服務透過 Prisma Client 存取 |
| 部署 | 前端可部署至 CDN/Vercel (SPA)；後端獨立部署 |

### 雙 package.json 結構

- **根目錄 `package.json`**：前端依賴 + 開發工具 + 整合腳本
- **`backend/package.json`**：後端依賴（express, cors, cookie-parser 等）

### 關鍵目錄結構

```
stock_operation_system/          # 目前 HEAD
├── index.html                   # Vite 入口 HTML
├── vite.config.ts               # Vite 設定（含 proxy 設定）
├── package.json                 # 前端 + 整合腳本
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── vercel.json                  # SPA rewrite 規則
├── docker-compose.yml           # postgres + backend + frontend 容器編排
│
├── src/                         # ★ 前端原始碼（Vite + React SPA）
│   ├── main.tsx                 # React 入口
│   ├── routes.tsx               # 集中式路由定義
│   ├── App.tsx
│   ├── app/                     # 頁面元件（保留原 Next.js 目錄結構）
│   │   ├── page.tsx             # 首頁
│   │   ├── dashboard/page.tsx
│   │   ├── portfolios/...
│   │   └── globals.css
│   ├── components/              # UI 元件
│   │   ├── ui/                  # 通用 UI（Loading, ErrorBoundary, ThemeToggle...）
│   │   ├── portfolio/           # 投組相關元件
│   │   ├── charts/              # 圖表元件（K線、布林通道、RSI...）
│   │   ├── news/                # 新聞元件
│   │   ├── stocks/              # 股票搜尋
│   │   └── transactions/        # 交易相關元件
│   ├── services/                # 前端 API 呼叫層（*.api.ts）+ 前端運算服務
│   │   ├── api-client.ts        # Axios 共用實例
│   │   ├── portfolio.api.ts     # 投組 API 呼叫
│   │   ├── stock.api.ts
│   │   ├── rsi.service.ts       # 前端技術指標運算（非 API 呼叫）
│   │   └── ...
│   ├── layouts/                 # 版面配置
│   ├── hooks/                   # React hooks
│   ├── types/                   # TypeScript 型別
│   ├── lib/                     # 工具函式
│   └── constants/               # 常數定義
│
├── backend/                     # ★ 後端原始碼（Express API）
│   ├── package.json             # 後端獨立依賴
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── src/
│       ├── server.ts            # Express 啟動入口
│       ├── app.ts               # Express app 設定（CORS, middleware）
│       ├── routes/              # API 路由定義
│       │   ├── index.ts         # 路由註冊總控
│       │   ├── auth.ts
│       │   ├── portfolios.ts
│       │   ├── stocks.ts
│       │   ├── indicators.ts
│       │   ├── news.ts
│       │   ├── risk-assessment.ts
│       │   ├── realized-pl.ts
│       │   ├── holding-advice.ts
│       │   ├── strategies.ts
│       │   ├── transactions.ts
│       │   ├── health.ts
│       │   └── misc.ts
│       ├── services/            # 業務邏輯服務層
│       │   ├── portfolio.service.ts
│       │   ├── stock.service.ts
│       │   ├── transaction.service.ts
│       │   ├── realized-pl.service.ts
│       │   ├── risk-assessment.service.ts
│       │   ├── news.service.ts
│       │   ├── holding-advice.service.ts
│       │   └── ... (24 個 service)
│       ├── middleware/           # Express middleware
│       │   ├── auth.ts          # JWT/Session 認證
│       │   └── error-handler.ts # 統一錯誤處理
│       ├── lib/                 # 後端工具（Prisma client, API helpers, CSV, 計算）
│       │   ├── prisma.ts
│       │   ├── api/
│       │   ├── calculations/
│       │   └── csv/
│       ├── types/               # 後端型別定義
│       └── __tests__/           # 後端測試
│
├── prisma/                      # 資料庫 schema 與遷移（前後端共用）
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── tests/                       # 前端 / 共用測試
│   ├── unit/
│   ├── property/                # fast-check 屬性測試
│   └── integration/
│
└── scripts/                     # 運維腳本
    ├── db-migrate.mjs
    ├── backfill-realized-pl.ts
    ├── backfill-tax-lots.ts
    ├── sync-dashboard-news.ts
    └── validate-insights.ts
```

---

## 4. 前後差異對照表

### 4.1 路由系統

| 面向 | Next.js (轉換前) | Vite + Express (轉換後) |
|------|------------------|------------------------|
| 前端路由機制 | 檔案系統路由 (`src/app/**/page.tsx`) | react-router-dom 集中定義 (`src/routes.tsx`) |
| 動態路由語法 | `[id]`, `[symbol]` 目錄名稱 | `:id`, `:symbol` 參數 |
| 路由群組 | `(auth)` 群組目錄 | 在 `routes.tsx` 中直接列出 |
| Layout | `layout.tsx` 巢狀佈局 | `RootLayout` + `<Outlet />` |
| 404 處理 | `not-found.tsx` | `path: '*'` 萬用路由 |

### 4.2 API 層

| 面向 | Next.js (轉換前) | Vite + Express (轉換後) |
|------|------------------|------------------------|
| API 定義方式 | `src/app/api/**/route.ts` (export GET/POST) | `backend/src/routes/*.ts` (Express Router) |
| API 執行環境 | Next.js server (同一 process) | 獨立 Express server (port 3001) |
| 請求/回應物件 | `NextRequest` / `NextResponse` | `express.Request` / `express.Response` |
| 中介層 | 無獨立 middleware | `backend/src/middleware/` (auth, error-handler) |
| 路由註冊 | 自動（檔案系統） | 手動（`backend/src/routes/index.ts` 集中註冊） |
| DB 存取位置 | API route handler 內直接使用 Prisma | `backend/src/services/*.service.ts` 服務層 |
| 前端呼叫方式 | 同源直接 fetch `/api/...` | Axios client (`src/services/api-client.ts`) 透過 proxy |

### 4.3 測試

| 面向 | Next.js (轉換前) | Vite + Express (轉換後) |
|------|------------------|------------------------|
| 測試框架 | Jest (單一設定) | Jest（前端 `jest.config.js`）+ Jest（`backend/jest.config.js`） |
| 前端測試 | `tests/unit/`, `tests/property/` | 同前（路徑不變） |
| API route 測試 | `src/app/api/**/__tests__/` | `backend/src/__tests__/`（使用 supertest） |
| 前端測試指令 | `npm test` | `npm test` |
| 後端測試指令 | 同上 | `npm run backend:test` |
| 屬性測試 | fast-check | 同前（路徑不變） |

### 4.4 建置

| 面向 | Next.js (轉換前) | Vite + Express (轉換後) |
|------|------------------|------------------------|
| 前端建置 | `next build` → `.next/` | `vite build` → `dist/` |
| 後端建置 | 含在 `next build` 中 | `cd backend && tsc` → `backend/dist/` |
| 型別檢查 | `tsc --noEmit` | `tsc --noEmit`（前端）+ `cd backend && tsc`（後端） |
| Lint | `next lint` | `eslint . --ext .ts,.tsx,.js,.jsx` |
| 全量建置指令 | `npm run build` | `npm run build`（前端）+ `npm run backend:build`（後端） |

### 4.5 部署

| 面向 | Next.js (轉換前) | Vite + Express (轉換後) |
|------|------------------|------------------------|
| 部署模式 | 單體部署（Vercel / Node.js） | 前後端分離部署 |
| 前端部署 | Vercel 自動處理 | 靜態檔案（`dist/`）至 CDN / Vercel SPA |
| 後端部署 | 同上（API 含在 Next.js 中） | 獨立 Node.js server / Docker |
| SPA Fallback | 不需要（SSR） | `vercel.json` rewrite 或 nginx config |
| Docker | 無 | `docker-compose.yml`（postgres + backend + frontend） |
| 環境變數 | `NEXT_PUBLIC_*` / server-side | `VITE_*`（前端）/ `.env`（後端） |

---

## 5. 目前專案結構地圖

### 5.1 完整目錄樹

```
stock_operation_system/
│
├── 🔧 設定檔
│   ├── package.json              # 前端依賴 + 全域腳本
│   ├── tsconfig.json             # TypeScript 設定
│   ├── vite.config.ts            # Vite 設定（含 /api proxy → :3001）
│   ├── tailwind.config.ts        # Tailwind CSS 設定
│   ├── postcss.config.js         # PostCSS
│   ├── jest.config.js            # 前端 Jest 設定
│   ├── jest.setup.js             # Jest 全域 setup
│   ├── .eslintrc.json            # ESLint 規則
│   ├── .prettierrc               # Prettier 格式化規則
│   ├── docker-compose.yml        # 容器編排
│   ├── vercel.json               # Vercel SPA rewrite
│   └── prisma.config.ts          # Prisma 設定
│
├── 📁 src/                       # ═══ 前端原始碼 ═══
│   ├── main.tsx                  # React 應用入口
│   ├── routes.tsx                # 路由集中定義
│   ├── App.tsx                   # App 元件
│   ├── vite-env.d.ts             # Vite 型別宣告
│   │
│   ├── app/                      # 頁面元件
│   │   ├── page.tsx              # / 首頁
│   │   ├── dashboard/            # /dashboard
│   │   ├── portfolios/           # /portfolios, /portfolios/:id, .../holdings/:symbol
│   │   ├── transactions/         # /transactions/:portfolioId
│   │   ├── strategy-builder/     # /strategy-builder
│   │   ├── technical-analysis/   # /technical-analysis
│   │   ├── fibonacci-tool/       # /fibonacci-tool
│   │   ├── backtest-results/     # /backtest-results/:id
│   │   ├── (auth)/               # /login, /register
│   │   ├── not-found/            # 404 頁面
│   │   ├── layout.tsx            # Root layout（RootLayout 引用）
│   │   ├── loading.tsx           # 全域 Loading
│   │   └── globals.css           # 全域樣式
│   │
│   ├── components/               # React 元件庫
│   │   ├── ui/                   # 通用 UI（Loading, ErrorBoundary, ThemeToggle...）
│   │   ├── portfolio/            # 投組（HoldingTable, RiskBadge, RealizedPLCard...）
│   │   ├── charts/               # 圖表（K線, RSI, MACD, 布林通道, 費波那契...）
│   │   ├── news/                 # 新聞（NewsCard, SentimentBadge, CredibilityBadge...）
│   │   ├── stocks/               # 股票（StockSearchBar）
│   │   └── transactions/         # 交易（TransactionForm, ImportDialog, ExportButton...）
│   │
│   ├── services/                 # 前端服務層
│   │   ├── api-client.ts         # Axios 共用實例（baseURL: /api）
│   │   ├── *.api.ts              # API 呼叫封裝（portfolio.api.ts, stock.api.ts...）
│   │   ├── *.service.ts          # 前端運算服務（RSI, MACD 等技術指標計算）
│   │   └── __tests__/            # 前端 service 測試
│   │
│   ├── layouts/                  # 版面配置
│   │   └── RootLayout.tsx        # 根版面（含 Navbar, Sidebar 等）
│   │
│   ├── hooks/                    # React Hooks
│   │   ├── useFormValidation.ts
│   │   └── useLoading.ts
│   │
│   ├── types/                    # 共用型別
│   │   ├── errors.ts
│   │   ├── insights.ts
│   │   └── news.types.ts
│   │
│   ├── lib/                      # 工具函式庫
│   │   ├── api/                  # API 相關工具
│   │   ├── calculations/         # 計算工具
│   │   ├── csv/                  # CSV 處理
│   │   ├── utils/                # 通用工具
│   │   └── news-category-mapper.ts
│   │
│   └── constants/                # 常數
│       ├── news-sources.ts
│       └── sentiment-keywords.ts
│
├── 📁 backend/                   # ═══ 後端原始碼 ═══
│   ├── package.json              # 後端獨立依賴（express, cors...）
│   ├── tsconfig.json             # 後端 TypeScript 設定
│   ├── jest.config.js            # 後端 Jest 設定
│   │
│   └── src/
│       ├── server.ts             # 啟動入口（載入 .env、監聽 port）
│       ├── app.ts                # Express app（CORS, JSON, cookie, 路由、錯誤處理）
│       │
│       ├── routes/               # API 路由
│       │   ├── index.ts          # registerRoutes() — 路由總控
│       │   ├── auth.ts           # /api/auth/*
│       │   ├── portfolios.ts     # /api/portfolios/*
│       │   ├── transactions.ts   # /api/transactions/*
│       │   ├── stocks.ts         # /api/stocks/*
│       │   ├── indicators.ts     # /api/indicators/*
│       │   ├── strategies.ts     # /api/strategies/*
│       │   ├── news.ts           # /api/news/*
│       │   ├── risk-assessment.ts
│       │   ├── realized-pl.ts
│       │   ├── holding-advice.ts
│       │   ├── health.ts         # /health（無需認證）
│       │   └── misc.ts           # /api/dashboard-news, /api/sync/...
│       │
│       ├── services/             # 業務邏輯層（DB 存取集中於此）
│       │   ├── portfolio.service.ts
│       │   ├── transaction.service.ts
│       │   ├── stock.service.ts
│       │   ├── realized-pl.service.ts
│       │   ├── risk-assessment.service.ts
│       │   ├── holding-advice.service.ts
│       │   ├── news.service.ts
│       │   ├── sentiment-analysis.service.ts
│       │   ├── credibility.service.ts
│       │   ├── auth.service.ts
│       │   ├── strategy.service.ts
│       │   ├── tax-lot.service.ts
│       │   └── ... (技術指標 services)
│       │
│       ├── middleware/           # Express middleware
│       │   ├── auth.ts           # 認證中介層（Session/Token 驗證）
│       │   └── error-handler.ts  # 統一錯誤回應格式
│       │
│       ├── lib/                  # 後端工具
│       │   ├── prisma.ts         # Prisma Client 單例
│       │   ├── api/              # 外部 API 呼叫（Finnhub, SEC EDGAR）
│       │   ├── calculations/     # 財務計算工具
│       │   ├── csv/              # CSV 匯入匯出
│       │   └── news-category-mapper.ts
│       │
│       ├── types/                # 後端型別
│       │   ├── errors.ts
│       │   ├── express.d.ts      # Express 型別擴充（req.userId 等）
│       │   ├── insights.ts
│       │   └── news.types.ts
│       │
│       └── __tests__/            # 後端 API 測試（supertest）
│
├── 📁 prisma/                    # ═══ 資料庫 ═══
│   ├── schema.prisma             # 資料模型定義
│   ├── migrations/               # 遷移紀錄
│   ├── seed.ts                   # 種子資料
│   └── schema.test.prisma        # 測試用 schema
│
├── 📁 tests/                     # ═══ 前端 / 共用測試 ═══
│   ├── unit/                     # 單元測試
│   │   ├── services/             # service 邏輯測試
│   │   ├── lib/                  # 工具函式測試
│   │   └── prisma/               # Prisma schema 相關測試
│   ├── property/                 # 屬性測試（fast-check）
│   └── integration/              # 整合測試
│
├── 📁 scripts/                   # ═══ 運維腳本 ═══
│   ├── db-migrate.mjs            # 資料庫遷移腳本
│   ├── backfill-realized-pl.ts   # 已實現損益回填
│   ├── backfill-tax-lots.ts      # 稅務批次回填
│   ├── sync-dashboard-news.ts    # 儀表板新聞同步
│   └── validate-insights.ts      # 洞察資料驗證
│
└── 📁 docs/                      # ═══ 文件 ═══
```

### 5.2 關鍵連接關係

```
瀏覽器
  │
  ├── Vite Dev Server (:3000)
  │     ├── 載入 index.html → src/main.tsx → routes.tsx
  │     ├── 頁面: src/app/**/page.tsx
  │     └── Proxy /api/* ──→ Express (:3001)
  │
  └── 生產環境: dist/ 靜態檔案（CDN/Vercel）
        └── API 呼叫 ──→ Express (:3001)

Express (:3001)
  ├── backend/src/app.ts（CORS, JSON, cookie）
  ├── backend/src/routes/index.ts（路由註冊）
  ├── backend/src/middleware/auth.ts（認證）
  ├── backend/src/routes/*.ts（各 domain 路由）
  │     └── 呼叫 backend/src/services/*.service.ts
  │           └── 透過 backend/src/lib/prisma.ts 存取 DB
  └── backend/src/middleware/error-handler.ts（錯誤處理）

PostgreSQL (:5432)
  └── prisma/schema.prisma 定義模型
```

---

## 6. 開發實作指引

### 6.1 新增前端頁面

1. **建立頁面元件**：在 `src/app/` 下建立對應目錄與 `page.tsx`
   ```
   src/app/my-feature/page.tsx
   ```
2. **註冊路由**：在 `src/routes.tsx` 新增路由項目
   ```tsx
   import MyFeaturePage from '@/app/my-feature/page'
   // 在 routes 陣列的 children 中加入：
   { path: '/my-feature', element: <MyFeaturePage /> }
   ```
3. **加入導航連結**：更新 `src/layouts/RootLayout.tsx` 中的導航選單

### 6.2 新增 React 元件

依功能領域放入對應子目錄：

| 元件類型 | 路徑 |
|---------|------|
| 通用 UI 元件 | `src/components/ui/` |
| 投組相關 | `src/components/portfolio/` |
| 圖表元件 | `src/components/charts/` |
| 新聞相關 | `src/components/news/` |
| 股票相關 | `src/components/stocks/` |
| 交易相關 | `src/components/transactions/` |
| 新領域 | `src/components/{domain}/` |

### 6.3 新增 API 端點

1. **建立或更新路由檔案**：在 `backend/src/routes/` 中
   ```typescript
   // backend/src/routes/my-feature.ts
   import { Router } from 'express'
   import { myService } from '../services/my-feature.service'

   export const router = Router()

   router.get('/', async (req, res, next) => {
     try {
       const data = await myService.getAll(req.userId!)
       res.json(data)
     } catch (error) {
       next(error)
     }
   })
   ```

2. **建立服務層**：在 `backend/src/services/` 中
   ```typescript
   // backend/src/services/my-feature.service.ts
   import prisma from '../lib/prisma'

   export const myService = {
     async getAll(userId: string) {
       return prisma.myModel.findMany({ where: { userId } })
     }
   }
   ```

3. **註冊路由**：在 `backend/src/routes/index.ts` 的 `registerRoutes()` 中
   ```typescript
   import { router as myFeatureRouter } from './my-feature'
   app.use('/api/my-feature', authMiddleware, myFeatureRouter)
   ```

4. **建立前端 API 呼叫**：在 `src/services/` 中
   ```typescript
   // src/services/my-feature.api.ts
   import apiClient from './api-client'

   export const myFeatureApi = {
     getAll: () => apiClient.get('/my-feature').then(r => r.data),
   }
   ```

### 6.4 修改資料庫

1. **修改 Schema**：編輯 `prisma/schema.prisma`
2. **產生遷移**：
   ```bash
   npx prisma migrate dev --name describe_change
   ```
3. **更新 Prisma Client**：
   ```bash
   npx prisma generate
   ```
4. **若需種子資料**：更新 `prisma/seed.ts`

> ⚠️ `prisma/schema.prisma` 為前後端共用，修改後前後端都會受影響。

### 6.5 新增測試

| 測試類型 | 路徑 | 指令 |
|---------|------|------|
| 前端單元測試 | `tests/unit/` | `npm test` |
| 前端屬性測試 | `tests/property/` | `npm run test:property` |
| 前端整合測試 | `tests/integration/` | `npm test` |
| 後端 API 測試 | `backend/src/__tests__/` | `npm run backend:test` |
| 前端 service 測試 | `src/services/__tests__/` | `npm test` |

**屬性測試命名規則**：`{feature}.property.test.ts`
**後端測試使用 supertest**：
```typescript
import request from 'supertest'
import app from '../app'

describe('GET /api/my-feature', () => {
  it('should return data', async () => {
    const res = await request(app).get('/api/my-feature')
    expect(res.status).toBe(200)
  })
})
```

### 6.6 環境變數

| 變數位置 | 命名規則 | 存取方式 |
|---------|---------|---------|
| 前端（Vite） | `VITE_*` 前綴 | `import.meta.env.VITE_API_URL` |
| 後端（Express） | 任意 | `process.env.DATABASE_URL` |
| 共用 | 寫在根目錄 `.env` | 後端透過 dotenv 載入 |

### 6.7 常用指令速查

```bash
# 開發
npm run dev              # 啟動 Vite 前端 (:3000)
npm run backend:dev      # 啟動 Express 後端 (:3001)
npm run dev:full         # 同時啟動前後端

# 建置
npm run build            # 前端建置（含 type-check）
npm run backend:build    # 後端建置

# 測試
npm test                 # 前端測試
npm run backend:test     # 後端測試
npm run test:property    # 屬性測試
npm run test:coverage    # 覆蓋率報告

# 資料庫
npx prisma migrate dev   # 執行遷移
npx prisma studio        # 開啟 Prisma Studio GUI
npm run db:seed          # 執行種子資料

# 程式碼品質
npm run lint             # ESLint
npm run format           # Prettier
npm run type-check       # TypeScript 型別檢查

# Docker
docker-compose up -d     # 啟動所有服務（postgres + backend + frontend）
```

---

## 7. 常見陷阱與建議流程

### 7.1 常見陷阱

#### ❌ 在前端直接 import Prisma Client
```typescript
// ❌ 錯誤：前端不能直接存取資料庫
import prisma from '@/lib/prisma'
```
**正確做法**：前端透過 `src/services/*.api.ts` 呼叫後端 API，後端在 `backend/src/services/` 中使用 Prisma。

#### ❌ 忘記在 `routes/index.ts` 註冊新路由
新增 `backend/src/routes/my-feature.ts` 後，必須在 `backend/src/routes/index.ts` 的 `registerRoutes()` 中手動註冊，否則 API 不會生效。

#### ❌ 前端路由只加了檔案沒加 `routes.tsx`
與 Next.js 不同，Vite SPA 不會自動掃描檔案系統產生路由。必須在 `src/routes.tsx` 手動新增路由定義。

#### ❌ 環境變數前綴搞混
- 前端只能讀取 `VITE_` 前綴的環境變數
- 後端不需要特殊前綴，但不能使用 `import.meta.env`

#### ❌ 忘記前後端都要安裝依賴
- 前端依賴安裝在根目錄：`npm install <pkg>`
- 後端依賴安裝在 `backend/`：`cd backend && npm install <pkg>`

#### ❌ 用 Next.js API 模式寫後端
```typescript
// ❌ Next.js 風格（已不適用）
export async function GET(request: NextRequest) { ... }

// ✅ Express 風格
router.get('/', async (req, res, next) => { ... })
```

#### ❌ API 測試放錯位置
- 後端 API 測試應放在 `backend/src/__tests__/`，使用 `supertest`
- 不應放在 `tests/` 目錄（那是前端/共用測試）

#### ❌ 忘記 Vite proxy 只在開發環境生效
生產環境需自行設定反向代理（nginx）或使用環境變數 `VITE_API_URL` 指向後端。

### 7.2 建議開發流程

#### 新功能開發 Checklist

```
□ 1. 定義資料模型（如需要）
     → 修改 prisma/schema.prisma
     → 執行 npx prisma migrate dev --name xxx
     → 執行 npx prisma generate

□ 2. 實作後端服務
     → 建立 backend/src/services/xxx.service.ts
     → 撰寫業務邏輯與 DB 存取

□ 3. 實作 API 路由
     → 建立 backend/src/routes/xxx.ts
     → 在 backend/src/routes/index.ts 註冊
     → 撰寫後端測試 backend/src/__tests__/xxx.test.ts

□ 4. 實作前端 API 呼叫層
     → 建立 src/services/xxx.api.ts

□ 5. 實作前端頁面 / 元件
     → 建立 src/app/xxx/page.tsx 或 src/components/xxx/
     → 在 src/routes.tsx 註冊路由（如為頁面）

□ 6. 撰寫前端測試
     → tests/unit/ 或 tests/property/

□ 7. 驗證
     → npm run dev:full（啟動前後端）
     → npm test && npm run backend:test
     → npm run type-check && npm run lint
```

#### Code Review 檢查點

- [ ] 新 API 路由是否已在 `backend/src/routes/index.ts` 註冊？
- [ ] 新頁面是否已在 `src/routes.tsx` 註冊？
- [ ] 前端是否有直接 import 後端專用模組？
- [ ] 環境變數前綴是否正確？
- [ ] 是否同時更新了前端 API 呼叫層與後端路由？
- [ ] 財務計算是否使用 Decimal.js？
- [ ] 使用者介面文字是否為繁體中文？

---

> **文件最後更新**：本文件隨 Vite 遷移結構分析任務產出。若專案架構有重大變更，請同步更新本文件。
