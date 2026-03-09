# Stock Portfolio System - Backend API

本文件說明 `backend/` 目錄中的 Express API 服務架構、安裝方式與常用操作。

## 技術棧

- Express 4
- TypeScript 5
- Prisma ORM / Prisma Client
- PostgreSQL
- Jest + Supertest（測試）

## 快速開始

### 1) 安裝依賴

```bash
cd backend
npm install
```

### 2) 設定環境變數

請先建立 `.env`（可放在專案根目錄供 Prisma 與後端共用），至少需要 `DATABASE_URL`。

### 3) 準備資料庫（在專案根目錄執行）

```bash
npm run db:migrate
```

### 4) 啟動後端開發伺服器

> Prisma Client 由根目錄管理。`npm run backend:dev`（或 `npm install` 的 postinstall）會自動產生，無須手動執行。

```bash
cd backend
npm run dev
```

預設服務位址：`http://localhost:3001`

## 可用指令

在 `backend/` 目錄執行：

- `npm run dev`：以 ts-node 啟動開發伺服器
- `npm run build`：編譯 TypeScript 至 `dist/`
- `npm run start`：以 Node.js 啟動編譯後伺服器
- `npm run test`：執行後端測試（Jest）

## API 端點概覽

完整端點與欄位請參考：[`../docs/api-inventory.md`](../docs/api-inventory.md)

主要 API 領域包含：

- Auth（登入、註冊、Session）
- Portfolios / Transactions / Holdings
- Stocks / News / Indicators
- Strategies / Risk Assessment
- Realized P&L / Holding Advice
- Misc（Dashboard News Sync、匯出等）

## 環境變數

| 變數名稱 | 必填 | 說明 |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL 連線字串（Prisma 使用） |
| `PORT` | ❌ | 後端服務埠號，預設 `3001` |
| `CORS_ORIGIN` | ❌ | CORS 允許來源，預設 `http://localhost:3000` |
| `NODE_ENV` | ❌ | 執行環境（`development` / `test` / `production`） |
| `CRON_SECRET` | ⚠️ | 觸發排程同步端點時的授權密鑰 |
| `DASHBOARD_NEWS_ON_DEMAND_SYNC` | ❌ | 是否啟用儀表板新聞 on-demand 同步（預設啟用） |
| `FINNHUB_API_KEY` | ⚠️ | 啟用個股新聞相關 API 時需要 |
| `ALPHA_VANTAGE_API_KEY` | ⚠️ | 啟用儀表板新聞同步時需要 |

> 註：標示 ⚠️ 的變數在對應功能啟用時為必要，未使用該功能可先省略。
