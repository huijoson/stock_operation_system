# Database Setup

This directory contains the Prisma schema and database configuration for the Stock Portfolio System.

## Prerequisites

- PostgreSQL installed and running
- Node.js and npm installed

## Setup Instructions

### 1. Create a PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE stock_portfolio;

# Exit psql
\q
```

### 2. Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Update the `DATABASE_URL` in `.env` with your PostgreSQL credentials:

```
DATABASE_URL="postgresql://username:password@localhost:5432/stock_portfolio"
```

Replace:
- `username` with your PostgreSQL username
- `password` with your PostgreSQL password
- `localhost:5432` with your PostgreSQL host and port if different
- `stock_portfolio` with your database name if different

### 3. Run Database Migration

```bash
npm run db:migrate
```

This will:
- Create all tables defined in the schema
- Generate the Prisma Client (root `node_modules` only)
- Apply the migration to your database

### 4. Generate Prisma Client for Backend

The backend has its own `node_modules`, so it needs a separate generate step:

```bash
cd backend && npx prisma generate --schema=../prisma/schema.prisma
```

### 5. (Optional) Seed the Database

```bash
npm run db:seed
```

### 6. (Optional) Open Prisma Studio

To view and edit your database data in a GUI:

```bash
npm run db:studio
```

## Schema Overview

The database includes the following models:

- **User**: User accounts with authentication
- **Session**: User session management
- **Portfolio**: Investment portfolios (users can have multiple)
- **Holding**: Current stock holdings in a portfolio
- **Transaction**: Buy/sell transaction history
- **Stock**: Stock master data (symbol, name, industry)
- **StockPrice**: Historical stock price cache

## Common Commands

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Create a new migration
npm run db:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio
npm run db:studio

# Format schema file
npx prisma format
```

## 疑難排解：TLS/SSL 憑證問題

執行 `npm run db:migrate` 或 `npx prisma migrate deploy` 時若出現：

```
Error: self-signed certificate in certificate chain
```

代表 Prisma CLI 的 Node.js 程序無法驗證 PostgreSQL（或中間 Proxy）的 TLS 憑證。

### 方法 1（推薦）：提供 CA 憑證

將自簽 CA 憑證匯出為 PEM 檔案後，透過 `NODE_EXTRA_CA_CERTS` 環境變數指定：

```bash
# Linux / macOS
export NODE_EXTRA_CA_CERTS="/path/to/ca-certificate.crt"
npm run db:migrate

# Windows (PowerShell)
$env:NODE_EXTRA_CA_CERTS="C:\certs\ca-certificate.crt"
npm run db:migrate
```

或在 `DATABASE_URL` 中加入 SSL 參數：

```
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&sslrootcert=/path/to/ca-certificate.crt"
```

> `.env.example` 中的 `PRISMA_CA_CERT_PATH` 註解可供團隊記錄憑證路徑。

### 方法 2（僅限本機除錯）：略過 TLS 驗證

```bash
# Linux / macOS
export NODE_TLS_REJECT_UNAUTHORIZED=0
npm run db:migrate

# Windows (PowerShell)
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npm run db:migrate
```

> ⚠️ **警告**：此設定會關閉 Node.js 所有 TLS 憑證驗證，絕不可用於正式環境。
> `.env.example` 中的 `PRISMA_ALLOW_INSECURE_TLS` 註解僅供除錯參考。

### 檢查清單

1. 確認 PostgreSQL 是否真的需要 TLS（本機 `localhost` 通常不需要）。
2. 若使用雲端資料庫（如 Supabase、Neon），下載其提供的 CA 憑證。
3. 企業環境請向 IT 取得中間 CA 憑證。

## Notes

- All decimal fields use `Decimal(18, 8)` precision to avoid floating-point errors
- Cascade deletes are configured for related records
- Indexes are added for frequently queried fields
