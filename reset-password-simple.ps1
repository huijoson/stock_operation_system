# 簡易 PostgreSQL 密碼重設腳本

Write-Host "PostgreSQL 密碼重設工具" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# 檢查服務
$pgService = Get-Service -Name "postgresql-x64-17" -ErrorAction SilentlyContinue
if (-not $pgService) {
    $pgService = Get-Service -Name "postgresql-x64-12" -ErrorAction SilentlyContinue
}

if (-not $pgService) {
    Write-Host "找不到 PostgreSQL 服務" -ForegroundColor Red
    exit 1
}

Write-Host "找到服務: $($pgService.Name)" -ForegroundColor Green
Write-Host ""

# 輸入新密碼
Write-Host "請輸入新密碼（建議：postgres123）" -ForegroundColor Yellow
$newPassword = Read-Host "新密碼"

Write-Host ""
Write-Host "正在設定密碼..." -ForegroundColor Yellow
Write-Host ""

# 找到 PostgreSQL 目錄
$pgPath = "C:\Program Files\PostgreSQL\17"
if (-not (Test-Path $pgPath)) {
    $pgPath = "C:\Program Files\PostgreSQL\12"
}

$dataPath = Join-Path $pgPath "data"
$binPath = Join-Path $pgPath "bin"
$psqlExe = Join-Path $binPath "psql.exe"

if (-not (Test-Path $psqlExe)) {
    Write-Host "找不到 psql.exe" -ForegroundColor Red
    Write-Host "請手動設定密碼" -ForegroundColor Yellow
    exit 1
}

# 備份並修改 pg_hba.conf
$pgHbaPath = Join-Path $dataPath "pg_hba.conf"
$backupPath = "$pgHbaPath.backup"

Write-Host "1. 備份設定檔..." -ForegroundColor Yellow
Copy-Item $pgHbaPath $backupPath -Force

Write-Host "2. 修改認證方式..." -ForegroundColor Yellow
$content = Get-Content $pgHbaPath
$content = $content -replace 'scram-sha-256', 'trust' -replace 'md5', 'trust'
$content | Set-Content $pgHbaPath

Write-Host "3. 重啟服務..." -ForegroundColor Yellow
Restart-Service $pgService.Name -Force
Start-Sleep -Seconds 5

Write-Host "4. 變更密碼..." -ForegroundColor Yellow
$sqlCmd = "ALTER USER postgres PASSWORD '$newPassword';"
& $psqlExe -U postgres -d postgres -c $sqlCmd

Write-Host "5. 還原設定..." -ForegroundColor Yellow
Copy-Item $backupPath $pgHbaPath -Force

Write-Host "6. 重啟服務..." -ForegroundColor Yellow
Restart-Service $pgService.Name -Force
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "完成！" -ForegroundColor Green
Write-Host "新密碼: $newPassword" -ForegroundColor Cyan
Write-Host ""

# 更新 .env
if (Test-Path ".env") {
    Write-Host "更新 .env 檔案..." -ForegroundColor Yellow
    $envContent = Get-Content ".env" -Raw
    $newConn = "postgresql://postgres:${newPassword}@localhost:5432/stock_portfolio"
    $envContent = $envContent -replace 'DATABASE_URL="[^"]*"', "DATABASE_URL=`"$newConn`""
    $envContent | Set-Content ".env" -NoNewline
    Write-Host "完成！" -ForegroundColor Green
}

Write-Host ""
Write-Host "請執行以下命令：" -ForegroundColor Cyan
Write-Host "  npx prisma generate" -ForegroundColor Gray
Write-Host "  npx prisma migrate dev" -ForegroundColor Gray
Write-Host ""
