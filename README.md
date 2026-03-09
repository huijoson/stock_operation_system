# 股市投資組合管理系統

專為台灣個人投資者設計的全端應用程式，用於追蹤、管理與分析股票投資組合。

## 系統架構

- **前端**：Vite 6 + React 18 單頁應用（SPA），使用 React Router v7
- **後端**：Express + TypeScript API 服務（`backend/`）
- **資料層**：PostgreSQL + Prisma ORM

## 技術棧

- **Frontend**：Vite 6、React 18、TypeScript、React Router v7
- **Backend**：Express、TypeScript、Prisma Client
- **Styling**：Tailwind CSS、PostCSS
- **Testing**：Jest、fast-check（Property-Based Testing）
- **Financial Calculation**：Decimal.js

## 開發環境設定

### 1) 安裝前端依賴（專案根目錄）

```bash
npm install
```

### 2) 安裝後端依賴

```bash
cd backend && npm install
```

### 3) 建立環境設定檔

```bash
cp .env.example .env
```

編輯 `.env`，將 `DATABASE_URL` 改為你的 PostgreSQL 連線字串（後端 API 與登入功能必須此設定）。
詳細資料庫設定請參考 [`prisma/README.md`](prisma/README.md)。

### 4) 執行資料庫 Migration

```bash
npm run db:migrate
```

### 5) 啟動前後端（統一啟動）

```bash
npm run dev:full
```

> `dev:full` 會同時啟動前端與後端開發伺服器。

## 可用指令（根目錄）

### 開發

- `npm run dev`：啟動前端 Vite 開發伺服器
- `npm run backend:dev`：啟動後端 Express 開發伺服器
- `npm run dev:full`：同時啟動前後端開發伺服器

### 建置與執行

- `npm run build`：前端型別檢查與建置
- `npm run preview`：預覽前端建置結果
- `npm run backend:build`：建置後端 TypeScript
- `npm run backend:start`：啟動後端正式模式

### 測試與品質

- `npm test`：執行前端/共享測試
- `npm run test:unit`：執行單元測試
- `npm run test:property`：執行屬性測試
- `npm run test:coverage`：產生覆蓋率報告
- `npm run lint`：執行 ESLint
- `npm run type-check`：TypeScript 型別檢查
- `npm run format`：Prettier 格式化
- `npm run backend:test`：執行後端測試

### 資料庫

- `npm run db:migrate`：執行 Prisma migration
- `npm run db:seed`：填充測試資料
- `npm run db:studio`：開啟 Prisma Studio

## 目錄結構

```text
/
├── src/                        # Frontend source (Vite React SPA)
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── lib/
│   └── types/
├── backend/
│   ├── src/                    # Backend source (Express API)
│   ├── next-api-legacy/        # Legacy handlers (migrating)
│   └── dist/
├── prisma/                     # Prisma schema 與 migrations
├── docs/                       # 專案文件與 API 清冊
├── tests/                      # 單元測試與屬性測試
└── public/                     # 靜態資源
```

## 疑難排解

### `db:migrate` 出現 self-signed certificate in certificate chain

當企業 Proxy 或本機 PostgreSQL 使用自簽憑證時，Prisma CLI 可能拒絕連線。

**方法 1（推薦）：指定 CA 憑證**

```bash
# 將 CA 憑證匯出後，設定環境變數
export NODE_EXTRA_CA_CERTS="/path/to/ca-certificate.crt"
npm run db:migrate
```

也可在 `DATABASE_URL` 加上 `sslmode=require&sslrootcert=/path/to/ca-certificate.crt`。

**方法 2（僅限本機除錯）：暫時略過驗證**

```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
npm run db:migrate
```

> ⚠️ 方法 2 會關閉所有 TLS 驗證，切勿用於正式環境。

詳細說明請參考 [`prisma/README.md`](prisma/README.md#疑難排解-tlsssl-憑證問題)。

## License

Private
