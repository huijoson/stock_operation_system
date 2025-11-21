# 資料庫設定指南

## ❌ 目前問題

註冊時出現錯誤：
```
Authentication failed against database server, the provided database credentials for `user` are not valid.
```

這表示 `.env` 檔案中的資料庫連線設定不正確。

## ✅ 解決方案

### 步驟 1：找到你的 PostgreSQL 憑證

你需要知道：
1. **使用者名稱** (通常是 `postgres`)
2. **密碼** (安裝 PostgreSQL 時設定的)
3. **埠號** (預設是 `5432`)

### 步驟 2：測試資料庫連線

開啟命令提示字元或 PowerShell，執行：

```bash
# 方法 1：使用 psql 命令
psql -U postgres -h localhost

# 方法 2：使用 pgAdmin（圖形介面）
# 開啟 pgAdmin 應用程式
```

如果可以成功連線，記下你使用的使用者名稱和密碼。

### 步驟 3：建立資料庫

在 PostgreSQL 中執行：

```sql
CREATE DATABASE stock_portfolio;
```

或使用 pgAdmin：
1. 右鍵點擊 "Databases"
2. 選擇 "Create" > "Database"
3. 名稱輸入：`stock_portfolio`
4. 點擊 "Save"

### 步驟 4：更新 .env 檔案

編輯專案根目錄的 `.env` 檔案：

```env
# 將這行：
DATABASE_URL="postgresql://user:password@localhost:5432/stock_portfolio"

# 改成（使用你的實際憑證）：
DATABASE_URL="postgresql://postgres:你的密碼@localhost:5432/stock_portfolio"
```

**範例**：
```env
# 如果你的密碼是 mypassword123
DATABASE_URL="postgresql://postgres:mypassword123@localhost:5432/stock_portfolio"
```

### 步驟 5：執行資料庫遷移

更新 `.env` 後，在專案目錄執行：

```bash
# 產生 Prisma Client
npx prisma generate

# 執行資料庫遷移（建立資料表）
npx prisma migrate dev
```

### 步驟 6：重新啟動服務

```bash
# 停止目前的服務（Ctrl+C）
# 然後重新啟動
npm run dev
```

## 🔍 常見問題

### Q1: 我忘記 PostgreSQL 密碼了

**Windows 解決方案**：
1. 找到 PostgreSQL 安裝目錄（通常在 `C:\Program Files\PostgreSQL\版本號\data`）
2. 編輯 `pg_hba.conf` 檔案
3. 將 `md5` 改成 `trust`
4. 重啟 PostgreSQL 服務
5. 使用 `psql -U postgres` 登入（不需密碼）
6. 執行 `ALTER USER postgres PASSWORD '新密碼';`
7. 將 `pg_hba.conf` 改回 `md5`
8. 重啟服務

### Q2: 找不到 PostgreSQL

檢查 PostgreSQL 服務是否執行：

```powershell
# PowerShell
Get-Service -Name postgresql*

# 如果沒有執行，啟動它
Start-Service postgresql-x64-17  # 或你的版本號
```

### Q3: 埠號不是 5432

如果你的 PostgreSQL 使用不同埠號，修改 `.env`：

```env
DATABASE_URL="postgresql://postgres:密碼@localhost:5433/stock_portfolio"
#                                                    ^^^^ 改成你的埠號
```

### Q4: 使用不同的使用者名稱

如果你不是使用 `postgres` 使用者：

```env
DATABASE_URL="postgresql://你的使用者名稱:密碼@localhost:5432/stock_portfolio"
```

## 📝 快速設定範本

根據你的情況選擇：

### 情況 A：使用預設設定
```env
DATABASE_URL="postgresql://postgres:你的密碼@localhost:5432/stock_portfolio"
```

### 情況 B：自訂使用者
```env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/stock_portfolio"
```

### 情況 C：不同埠號
```env
DATABASE_URL="postgresql://postgres:你的密碼@localhost:5433/stock_portfolio"
```

### 情況 D：遠端資料庫
```env
DATABASE_URL="postgresql://user:password@192.168.1.100:5432/stock_portfolio"
```

## ✅ 驗證設定

設定完成後，執行以下命令驗證：

```bash
# 1. 測試資料庫連線
npx prisma db pull

# 2. 查看資料庫狀態
npx prisma migrate status

# 3. 開啟 Prisma Studio（資料庫 GUI）
npx prisma studio
```

如果這些命令都成功執行，表示資料庫設定正確！

## 🆘 還是有問題？

如果按照以上步驟還是無法解決，請提供：
1. PostgreSQL 版本
2. 錯誤訊息的完整內容
3. `.env` 檔案內容（隱藏密碼）

---

**下一步**：設定完成後，重新啟動服務並嘗試註冊！
