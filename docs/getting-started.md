# 股市投資組合管理系統 - 啟動指南

## 前置需求

在啟動服務之前，請確保已安裝以下軟體：

- **Node.js**: v18.0.0 或更高版本
- **PostgreSQL**: v14.0 或更高版本
- **npm** 或 **yarn**: 套件管理工具

## 快速啟動步驟

### 1. 安裝相依套件

```bash
npm install
```

### 2. 設定環境變數

複製環境變數範例檔案：

```bash
copy .env.example .env
```

編輯 `.env` 檔案，設定以下變數：

```env
# 資料庫連線
DATABASE_URL="postgresql://使用者名稱:密碼@localhost:5432/資料庫名稱"

# 測試資料庫（選用）
DATABASE_URL_TEST="postgresql://使用者名稱:密碼@localhost:5432/測試資料庫名稱"

# Next.js 設定
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Finnhub API Key（投資組合洞察功能必填）
FINNHUB_API_KEY="your_finnhub_api_key_here"

# 其他設定（選用）
NODE_ENV="development"
```

#### 取得 Finnhub API Key

投資組合洞察功能需要 Finnhub API Key 以取得新聞資料：

1. 前往 [Finnhub.io](https://finnhub.io/) 註冊免費帳號
2. 登入後前往 Dashboard 取得 API Key
3. 將 API Key 貼到 `.env` 檔案中的 `FINNHUB_API_KEY`
4. 免費方案限制：60 calls/min，系統已實作快取與速率限制機制

> **注意**: 沒有 Finnhub API Key 系統仍可運行，但新聞整合與情緒分析功能將無法使用。

### 3. 設定資料庫

#### 3.1 建立資料庫

使用 PostgreSQL 命令列或 GUI 工具建立資料庫：

```sql
CREATE DATABASE stock_portfolio;
```

#### 3.2 執行資料庫遷移

```bash
npx prisma migrate dev
```

這會：
- 建立所有必要的資料表
- 執行資料庫 schema 更新

#### 3.3 產生 Prisma Client

```bash
npx prisma generate
```

#### 3.4 填充種子資料（選用）

如果需要測試資料：

```bash
npx prisma db seed
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

服務將在 `http://localhost:3000` 啟動

## 常用指令

### 開發相關

```bash
# 啟動開發伺服器（支援熱重載）
npm run dev

# 建置生產版本
npm run build

# 啟動生產伺服器
npm run start

# 程式碼檢查
npm run lint

# 程式碼格式化
npm run format
```

### 資料庫相關

```bash
# 建立新的資料庫遷移
npx prisma migrate dev --name 遷移名稱

# 重設資料庫（警告：會刪除所有資料）
npx prisma migrate reset

# 開啟 Prisma Studio（資料庫 GUI）
npx prisma studio

# 查看資料庫狀態
npx prisma migrate status
```

### 測試相關

```bash
# 執行所有測試
npm test

# 執行測試（監看模式）
npm run test:watch

# 執行特定測試檔案
npm test -- tests/property/auth.property.test.ts

# 產生測試覆蓋率報告
npm run test:coverage
```

## 首次使用流程

### 1. 註冊帳號

1. 開啟瀏覽器，前往 `http://localhost:3000`
2. 點擊「註冊」
3. 輸入電子郵件和密碼
4. 完成註冊

### 2. 登入系統

1. 使用註冊的帳號登入
2. 系統會導向儀表板頁面

### 3. 建立投資組合

1. 前往「投資組合」頁面
2. 點擊「新增投資組合」
3. 輸入投資組合名稱（例如：「我的股票」）
4. 儲存

### 4. 新增交易記錄

1. 進入投資組合詳細頁面
2. 點擊「新增交易」
3. 輸入交易資訊：
   - 股票代號（例如：2330）
   - 交易類型（買入/賣出）
   - 數量
   - 價格
   - 日期
4. 儲存

### 5. 查看分析

- **儀表板**：查看總覽、圖表和績效
- **持股**：查看目前持股和損益
- **交易記錄**：查看所有交易歷史

## 資料庫管理

### 使用 Prisma Studio

Prisma Studio 提供視覺化的資料庫管理介面：

```bash
npx prisma studio
```

這會在 `http://localhost:5555` 開啟 Prisma Studio，你可以：
- 瀏覽所有資料表
- 新增、編輯、刪除資料
- 執行查詢

### 備份資料庫

```bash
# PostgreSQL 備份
pg_dump -U 使用者名稱 資料庫名稱 > backup.sql

# 還原備份
psql -U 使用者名稱 資料庫名稱 < backup.sql
```

## 疑難排解

### 問題 1：無法連線到資料庫

**錯誤訊息**：`Can't reach database server`

**解決方案**：
1. 確認 PostgreSQL 服務正在執行
2. 檢查 `.env` 中的 `DATABASE_URL` 是否正確
3. 確認資料庫已建立
4. 檢查防火牆設定

### 問題 2：Prisma Client 未產生

**錯誤訊息**：`Cannot find module '@prisma/client'`

**解決方案**：
```bash
npx prisma generate
```

### 問題 3：資料庫 schema 不同步

**錯誤訊息**：`The database schema is not in sync`

**解決方案**：
```bash
npx prisma migrate dev
```

### 問題 4：埠號已被佔用

**錯誤訊息**：`Port 3000 is already in use`

**解決方案**：
1. 關閉佔用埠號的程式
2. 或修改 `package.json` 使用不同埠號：
```json
"dev": "next dev -p 3001"
```

### 問題 5：測試失敗

**解決方案**：
1. 確保測試資料庫已設定
2. 執行測試前先遷移測試資料庫：
```bash
DATABASE_URL=$DATABASE_URL_TEST npx prisma migrate dev
```

## 開發建議

### 1. 使用 Git

```bash
# 初始化 Git（如果尚未初始化）
git init

# 建立 .gitignore（已包含在專案中）
# 確保不要提交敏感資訊（.env 檔案）

# 提交變更
git add .
git commit -m "描述變更內容"
```

### 2. 程式碼品質

在提交前執行：

```bash
# 檢查程式碼風格
npm run lint

# 執行測試
npm test

# 檢查型別
npm run type-check
```

### 3. 開發工具

推薦使用的 VS Code 擴充功能：
- **Prisma**: Prisma schema 語法高亮
- **ESLint**: 程式碼檢查
- **Prettier**: 程式碼格式化
- **Tailwind CSS IntelliSense**: Tailwind 自動完成

## 部署

### Vercel 部署（推薦）

1. 將程式碼推送到 GitHub
2. 前往 [Vercel](https://vercel.com)
3. 匯入 GitHub 專案
4. 設定環境變數
5. 部署

### 其他平台

- **Railway**: 支援 PostgreSQL 和 Next.js
- **Render**: 提供免費方案
- **AWS/GCP/Azure**: 企業級部署

## 效能優化

### 開發環境

```bash
# 清除 Next.js 快取
rm -rf .next

# 清除 node_modules 並重新安裝
rm -rf node_modules
npm install
```

### 生產環境

1. 使用 `npm run build` 建置優化版本
2. 啟用 CDN 快取靜態資源
3. 使用資料庫連線池
4. 啟用 Redis 快取（選用）

## 更多資源

- **專案文件**: 查看 `docs/` 目錄
- **API 文件**: 查看 `src/app/api/` 目錄
- **測試文件**: 查看 `tests/` 目錄
- **設計文件**: `.kiro/specs/stock-portfolio-system/design.md`
- **需求文件**: `.kiro/specs/stock-portfolio-system/requirements.md`

## 取得協助

如果遇到問題：
1. 查看本文件的疑難排解章節
2. 檢查專案的 GitHub Issues
3. 查看 Next.js 和 Prisma 官方文件

---

**祝你使用愉快！** 🚀
