# 資料庫快速設定腳本
# 此腳本會協助你設定資料庫連線

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "股市投資組合管理系統 - 資料庫設定" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 PostgreSQL 服務
Write-Host "檢查 PostgreSQL 服務..." -ForegroundColor Yellow
$pgServices = Get-Service -Name postgresql* -ErrorAction SilentlyContinue

if ($pgServices) {
    Write-Host "✓ 找到 PostgreSQL 服務：" -ForegroundColor Green
    $pgServices | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Status)" -ForegroundColor Gray
    }
    
    # 檢查是否有執行中的服務
    $runningService = $pgServices | Where-Object { $_.Status -eq 'Running' } | Select-Object -First 1
    
    if ($runningService) {
        Write-Host "✓ PostgreSQL 正在執行" -ForegroundColor Green
    } else {
        Write-Host "⚠ PostgreSQL 未執行，嘗試啟動..." -ForegroundColor Yellow
        $serviceToStart = $pgServices | Select-Object -First 1
        Start-Service $serviceToStart.Name
        Write-Host "✓ 已啟動 $($serviceToStart.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "✗ 找不到 PostgreSQL 服務" -ForegroundColor Red
    Write-Host "請確認 PostgreSQL 已安裝" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "請輸入資料庫連線資訊" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 詢問使用者資訊
$dbUser = Read-Host "資料庫使用者名稱 (預設: postgres)"
if ([string]::IsNullOrWhiteSpace($dbUser)) {
    $dbUser = "postgres"
}

$dbPassword = Read-Host "資料庫密碼" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

$dbHost = Read-Host "資料庫主機 (預設: localhost)"
if ([string]::IsNullOrWhiteSpace($dbHost)) {
    $dbHost = "localhost"
}

$dbPort = Read-Host "資料庫埠號 (預設: 5432)"
if ([string]::IsNullOrWhiteSpace($dbPort)) {
    $dbPort = "5432"
}

$dbName = Read-Host "資料庫名稱 (預設: stock_portfolio)"
if ([string]::IsNullOrWhiteSpace($dbName)) {
    $dbName = "stock_portfolio"
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "設定摘要" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "使用者: $dbUser" -ForegroundColor Gray
Write-Host "主機: $dbHost" -ForegroundColor Gray
Write-Host "埠號: $dbPort" -ForegroundColor Gray
Write-Host "資料庫: $dbName" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "確認以上設定？(Y/n)"
if ($confirm -eq 'n' -or $confirm -eq 'N') {
    Write-Host "已取消設定" -ForegroundColor Yellow
    exit 0
}

# 建立連線字串
$connectionString = "postgresql://${dbUser}:${dbPasswordPlain}@${dbHost}:${dbPort}/${dbName}"

# 更新 .env 檔案
Write-Host ""
Write-Host "更新 .env 檔案..." -ForegroundColor Yellow

$envContent = Get-Content .env -Raw
$envContent = $envContent -replace 'DATABASE_URL="[^"]*"', "DATABASE_URL=`"$connectionString`""
$envContent | Set-Content .env -NoNewline

Write-Host "✓ .env 檔案已更新" -ForegroundColor Green

# 測試連線並建立資料庫
Write-Host ""
Write-Host "測試資料庫連線..." -ForegroundColor Yellow

# 設定環境變數
$env:PGPASSWORD = $dbPasswordPlain

# 嘗試連線到 postgres 資料庫（預設存在）
$testConnection = & psql -U $dbUser -h $dbHost -p $dbPort -d postgres -c "SELECT 1;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 資料庫連線成功" -ForegroundColor Green
    
    # 檢查目標資料庫是否存在
    Write-Host "檢查資料庫 '$dbName' 是否存在..." -ForegroundColor Yellow
    $dbExists = & psql -U $dbUser -h $dbHost -p $dbPort -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$dbName';" 2>&1
    
    if ($dbExists -match "1") {
        Write-Host "✓ 資料庫 '$dbName' 已存在" -ForegroundColor Green
    } else {
        Write-Host "建立資料庫 '$dbName'..." -ForegroundColor Yellow
        & psql -U $dbUser -h $dbHost -p $dbPort -d postgres -c "CREATE DATABASE $dbName;" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ 資料庫 '$dbName' 建立成功" -ForegroundColor Green
        } else {
            Write-Host "⚠ 無法建立資料庫，請手動建立" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "✗ 資料庫連線失敗" -ForegroundColor Red
    Write-Host "錯誤訊息: $testConnection" -ForegroundColor Red
    Write-Host ""
    Write-Host "請檢查：" -ForegroundColor Yellow
    Write-Host "1. 使用者名稱和密碼是否正確" -ForegroundColor Gray
    Write-Host "2. PostgreSQL 服務是否執行" -ForegroundColor Gray
    Write-Host "3. 埠號是否正確" -ForegroundColor Gray
    exit 1
}

# 清除密碼環境變數
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

# 執行 Prisma 設定
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "執行 Prisma 設定" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "產生 Prisma Client..." -ForegroundColor Yellow
npx prisma generate

Write-Host ""
Write-Host "執行資料庫遷移..." -ForegroundColor Yellow
npx prisma migrate dev --name init

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "✓ 資料庫設定完成！" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "1. 執行 'npm run dev' 啟動服務" -ForegroundColor Gray
Write-Host "2. 前往 http://localhost:3000" -ForegroundColor Gray
Write-Host "3. 註冊新帳號並開始使用" -ForegroundColor Gray
Write-Host ""
