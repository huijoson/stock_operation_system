# PostgreSQL 密碼重設腳本
# 此腳本會協助你重設 PostgreSQL 的 postgres 使用者密碼

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "PostgreSQL 密碼重設工具" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 PostgreSQL 服務
Write-Host "步驟 1: 檢查 PostgreSQL 服務..." -ForegroundColor Yellow
$pgServices = Get-Service -Name postgresql* -ErrorAction SilentlyContinue

if (-not $pgServices) {
    Write-Host "✗ 找不到 PostgreSQL 服務" -ForegroundColor Red
    Write-Host "請確認 PostgreSQL 已安裝" -ForegroundColor Red
    exit 1
}

Write-Host "找到以下 PostgreSQL 服務：" -ForegroundColor Green
$pgServices | ForEach-Object {
    Write-Host "  - $($_.Name): $($_.Status)" -ForegroundColor Gray
}

# 選擇要使用的服務
$selectedService = $pgServices | Select-Object -First 1
Write-Host "使用服務: $($selectedService.Name)" -ForegroundColor Cyan
Write-Host ""

# 找到 PostgreSQL 安裝目錄
Write-Host "步驟 2: 尋找 PostgreSQL 安裝目錄..." -ForegroundColor Yellow

$possiblePaths = @(
    "C:\Program Files\PostgreSQL\17\data",
    "C:\Program Files\PostgreSQL\16\data",
    "C:\Program Files\PostgreSQL\15\data",
    "C:\Program Files\PostgreSQL\14\data",
    "C:\Program Files\PostgreSQL\13\data",
    "C:\Program Files\PostgreSQL\12\data"
)

$pgDataPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $pgDataPath = $path
        break
    }
}

if (-not $pgDataPath) {
    Write-Host "✗ 找不到 PostgreSQL 資料目錄" -ForegroundColor Red
    Write-Host "請手動指定 PostgreSQL 的 data 目錄路徑" -ForegroundColor Yellow
    $pgDataPath = Read-Host "請輸入 PostgreSQL data 目錄的完整路徑"
    
    if (-not (Test-Path $pgDataPath)) {
        Write-Host "✗ 指定的路徑不存在" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ 找到 PostgreSQL 資料目錄: $pgDataPath" -ForegroundColor Green
Write-Host ""

# 備份 pg_hba.conf
Write-Host "步驟 3: 備份設定檔..." -ForegroundColor Yellow
$pgHbaPath = Join-Path $pgDataPath "pg_hba.conf"
$backupPath = Join-Path $pgDataPath "pg_hba.conf.backup"

if (-not (Test-Path $pgHbaPath)) {
    Write-Host "✗ 找不到 pg_hba.conf 檔案" -ForegroundColor Red
    exit 1
}

Copy-Item $pgHbaPath $backupPath -Force
Write-Host "✓ 已備份 pg_hba.conf 到 $backupPath" -ForegroundColor Green
Write-Host ""

# 修改 pg_hba.conf
Write-Host "步驟 4: 修改認證設定..." -ForegroundColor Yellow
$content = Get-Content $pgHbaPath
$newContent = $content -replace 'md5', 'trust' -replace 'scram-sha-256', 'trust'
$newContent | Set-Content $pgHbaPath

Write-Host "✓ 已將認證方式改為 trust（暫時不需密碼）" -ForegroundColor Green
Write-Host ""

# 重啟 PostgreSQL 服務
Write-Host "步驟 5: 重啟 PostgreSQL 服務..." -ForegroundColor Yellow
try {
    Restart-Service $selectedService.Name -Force
    Start-Sleep -Seconds 3
    Write-Host "✓ PostgreSQL 服務已重啟" -ForegroundColor Green
} catch {
    Write-Host "✗ 無法重啟服務，請手動重啟" -ForegroundColor Red
    Write-Host "錯誤: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 設定新密碼
Write-Host "步驟 6: 設定新密碼..." -ForegroundColor Yellow
Write-Host "請輸入新密碼（建議使用簡單好記的密碼，例如：postgres123）" -ForegroundColor Cyan

$newPassword = Read-Host "新密碼"
$confirmPassword = Read-Host "確認密碼"

if ($newPassword -ne $confirmPassword) {
    Write-Host "✗ 兩次輸入的密碼不一致" -ForegroundColor Red
    
    # 還原設定
    Copy-Item $backupPath $pgHbaPath -Force
    Restart-Service $selectedService.Name -Force
    exit 1
}

# 尋找 psql.exe
$psqlPath = $null
$possiblePsqlPaths = @(
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe",
    "C:\Program Files\PostgreSQL\13\bin\psql.exe",
    "C:\Program Files\PostgreSQL\12\bin\psql.exe"
)

foreach ($path in $possiblePsqlPaths) {
    if (Test-Path $path) {
        $psqlPath = $path
        break
    }
}

if (-not $psqlPath) {
    Write-Host "✗ 找不到 psql.exe" -ForegroundColor Red
    Write-Host "請手動執行以下 SQL 命令來設定密碼：" -ForegroundColor Yellow
    Write-Host "ALTER USER postgres PASSWORD '$newPassword';" -ForegroundColor Cyan
    
    # 還原設定
    Copy-Item $backupPath $pgHbaPath -Force
    Restart-Service $selectedService.Name -Force
    exit 1
}

# 執行密碼變更
Write-Host "執行密碼變更..." -ForegroundColor Yellow
$sqlCommand = "ALTER USER postgres PASSWORD '$newPassword';"
& $psqlPath -U postgres -d postgres -c $sqlCommand 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 密碼已成功變更" -ForegroundColor Green
} else {
    Write-Host "✗ 密碼變更失敗" -ForegroundColor Red
    
    # 還原設定
    Copy-Item $backupPath $pgHbaPath -Force
    Restart-Service $selectedService.Name -Force
    exit 1
}
Write-Host ""

# 還原 pg_hba.conf
Write-Host "步驟 7: 還原認證設定..." -ForegroundColor Yellow
Copy-Item $backupPath $pgHbaPath -Force
Write-Host "✓ 已還原 pg_hba.conf" -ForegroundColor Green
Write-Host ""

# 再次重啟服務
Write-Host "步驟 8: 重啟 PostgreSQL 服務..." -ForegroundColor Yellow
Restart-Service $selectedService.Name -Force
Start-Sleep -Seconds 3
Write-Host "✓ PostgreSQL 服務已重啟" -ForegroundColor Green
Write-Host ""

# 測試新密碼
Write-Host "步驟 9: 測試新密碼..." -ForegroundColor Yellow
$env:PGPASSWORD = $newPassword
$testResult = & $psqlPath -U postgres -d postgres -c "SELECT 1;" 2>&1
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 新密碼測試成功" -ForegroundColor Green
} else {
    Write-Host "⚠ 密碼測試失敗，但密碼可能已變更" -ForegroundColor Yellow
}
Write-Host ""

# 更新 .env 檔案
Write-Host "步驟 10: 更新專案設定..." -ForegroundColor Yellow
$envPath = ".env"

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    $newConnectionString = "postgresql://postgres:${newPassword}@localhost:5432/stock_portfolio"
    $envContent = $envContent -replace 'DATABASE_URL="[^"]*"', "DATABASE_URL=`"$newConnectionString`""
    $envContent | Set-Content $envPath -NoNewline
    
    Write-Host "✓ .env 檔案已更新" -ForegroundColor Green
} else {
    Write-Host "⚠ 找不到 .env 檔案" -ForegroundColor Yellow
    Write-Host "請手動建立 .env 檔案並加入：" -ForegroundColor Yellow
    Write-Host "DATABASE_URL=`"postgresql://postgres:${newPassword}@localhost:5432/stock_portfolio`"" -ForegroundColor Cyan
}
Write-Host ""

# 完成
Write-Host "==================================" -ForegroundColor Green
Write-Host "✓ 密碼重設完成！" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "新的資料庫連線資訊：" -ForegroundColor Cyan
Write-Host "  使用者: postgres" -ForegroundColor Gray
Write-Host "  密碼: $newPassword" -ForegroundColor Gray
Write-Host "  主機: localhost" -ForegroundColor Gray
Write-Host "  埠號: 5432" -ForegroundColor Gray
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "1. 執行: npx prisma generate" -ForegroundColor Gray
Write-Host "2. 執行: npx prisma migrate dev" -ForegroundColor Gray
Write-Host "3. 執行: npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "按任意鍵繼續..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
