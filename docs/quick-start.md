# 快速啟動指南 ⚡

## 最快啟動方式（5 分鐘）

### 步驟 1：設定環境變數 (1 分鐘)

```bash
# 複製環境變數範例檔案
copy .env.example .env
```

編輯 `.env` 檔案，修改資料庫連線：

```env
DATABASE_URL="postgresql://postgres:你的密碼@localhost:5432/stock_portfolio"
```

> **提示**：如果你使用預設的 PostgreSQL 設定，通常只需要修改密碼部分。

### 步驟 2：安裝套件 (2 分鐘)

```bash
npm install
```

### 步驟 3：設定資料庫 (1 分鐘)

```bash
# 建立資料庫（如果尚未建立）
# 在 PostgreSQL 中執行：CREATE DATABASE stock_portfolio;

# 執行資料庫遷移
npx prisma migrate dev

# 產生 Prisma Client
npx prisma generate

# （選用）填充測試資料
npx prisma db seed
```

### 步驟 4：啟動服務 (1 分鐘)

```bash
npm run dev
```

✅ **完成！** 開啟瀏覽器前往 `http://localhost:3000`

---

## 一鍵啟動腳本

### Windows (PowerShell)

建立 `start.ps1` 檔案：

```powershell
# 檢查 .env 檔案
if (-not (Test-Path .env)) {
    Write-Host "建立 .env 檔案..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "請編輯 .env 檔案設定資料庫連線，然後重新執行此腳本" -ForegroundColor Red
    exit
}

# 安裝套件
Write-Host "安裝套件..." -ForegroundColor Green
npm install

# 設定資料庫
Write-Host "設定資料庫..." -ForegroundColor Green
npx prisma generate
npx prisma migrate dev

# 啟動服務
Write-Host "啟動開發伺服器..." -ForegroundColor Green
npm run dev
```

執行：
```bash
powershell -ExecutionPolicy Bypass -File start.ps1
```

### Linux/Mac (Bash)

建立 `start.sh` 檔案：

```bash
#!/bin/bash

# 檢查 .env 檔案
if [ ! -f .env ]; then
    echo "建立 .env 檔案..."
    cp .env.example .env
    echo "請編輯 .env 檔案設定資料庫連線，然後重新執行此腳本"
    exit 1
fi

# 安裝套件
echo "安裝套件..."
npm install

# 設定資料庫
echo "設定資料庫..."
npx prisma generate
npx prisma migrate dev

# 啟動服務
echo "啟動開發伺服器..."
npm run dev
```

執行：
```bash
chmod +x start.sh
./start.sh
```

---

## 常見問題快速解決

### ❌ 無法連線到資料庫

```bash
# 1. 確認 PostgreSQL 正在執行
# Windows: 檢查服務管理員
# Mac: brew services list
# Linux: sudo systemctl status postgresql

# 2. 測試資料庫連線
psql -U postgres -h localhost

# 3. 建立資料庫
psql -U postgres -c "CREATE DATABASE stock_portfolio;"
```

### ❌ 埠號 3000 已被佔用

```bash
# 使用不同埠號
npm run dev -- -p 3001
```

或修改 `package.json`：
```json
"dev": "next dev -p 3001"
```

### ❌ Prisma Client 錯誤

```bash
# 重新產生 Prisma Client
npx prisma generate

# 如果還是有問題，清除並重新安裝
rm -rf node_modules
npm install
npx prisma generate
```

### ❌ 資料庫 schema 不同步

```bash
# 重設資料庫（警告：會刪除所有資料）
npx prisma migrate reset

# 或執行遷移
npx prisma migrate dev
```

---

## 驗證安裝

啟動服務後，檢查以下項目：

### 1. 首頁載入
- ✅ 前往 `http://localhost:3000`
- ✅ 應該看到登入/註冊頁面

### 2. 註冊新帳號
- ✅ 點擊「註冊」
- ✅ 輸入電子郵件和密碼
- ✅ 成功建立帳號

### 3. 登入系統
- ✅ 使用剛註冊的帳號登入
- ✅ 導向儀表板頁面

### 4. 建立投資組合
- ✅ 前往「投資組合」頁面
- ✅ 建立新的投資組合
- ✅ 成功儲存

### 5. 新增交易
- ✅ 進入投資組合
- ✅ 新增一筆交易記錄
- ✅ 查看持股更新

---

## 開發工具

### Prisma Studio（資料庫 GUI）

```bash
npm run db:studio
```

開啟 `http://localhost:5555` 查看和編輯資料庫

### 測試

```bash
# 執行所有測試
npm test

# 執行特定測試
npm test -- auth.property.test.ts

# 監看模式
npm run test:watch
```

### 程式碼檢查

```bash
# ESLint 檢查
npm run lint

# 型別檢查
npm run type-check

# 格式化程式碼
npm run format
```

---

## 下一步

1. 📖 閱讀 [完整啟動指南](./getting-started.md)
2. 🎨 查看 [錯誤處理和 UX 指南](./error-handling-ux-guide.md)
3. 📊 查看 [測試結果總結](./test-results-summary.md)
4. 📝 查看 [設計文件](../.kiro/specs/stock-portfolio-system/design.md)

---

## 需要協助？

- 查看 [疑難排解](./getting-started.md#疑難排解)
- 檢查 [測試結果](./test-results-summary.md)
- 查看專案的 GitHub Issues

**祝你開發順利！** 🎉
