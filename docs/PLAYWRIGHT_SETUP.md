# Playwright 設定指南

## 概述

本專案使用 Playwright 進行瀏覽器自動化和截圖功能。Playwright 需要下載並安裝瀏覽器二進制檔案才能正常運作。

## 自動安裝

當您執行 `npm install` 時，postinstall 腳本會自動安裝 Chromium 瀏覽器：

```bash
npm install
```

這會自動執行 `playwright install --with-deps chromium` 來下載瀏覽器和必要的系統依賴。

## 手動安裝

如果自動安裝失敗或您需要手動安裝瀏覽器，請執行：

```bash
# 安裝所有瀏覽器
npx playwright install

# 僅安裝 Chromium（推薦用於伺服器環境）
npx playwright install chromium

# 安裝瀏覽器和系統依賴（Linux）
npx playwright install --with-deps chromium
```

## 常見問題

### 錯誤：Executable doesn't exist

如果您看到以下錯誤：

```
BrowserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell
```

**解決方法：**

1. 執行 `npx playwright install chromium`
2. 如果在 Linux 環境，執行 `npx playwright install --with-deps chromium`

### Docker 環境

在 Docker 容器中使用 Playwright 時，請確保：

1. 使用支援的基礎映像（如 `mcr.microsoft.com/playwright:v1.51.1-jammy`）
2. 或在 Dockerfile 中添加必要的系統依賴

```dockerfile
# 使用官方 Playwright 映像
FROM mcr.microsoft.com/playwright:v1.51.1-jammy

# 或手動安裝依賴
RUN npx playwright install --with-deps chromium
```

### CI/CD 環境

在 CI/CD 管道中，確保在執行測試前安裝瀏覽器：

```yaml
# GitHub Actions 範例
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium
```

## 瀏覽器快取位置

Playwright 瀏覽器預設安裝位置：

- **Linux/macOS**: `~/.cache/ms-playwright/`
- **Windows**: `%USERPROFILE%\AppData\Local\ms-playwright\`

## 參考資源

- [Playwright 官方文檔](https://playwright.dev/)
- [Playwright 瀏覽器安裝指南](https://playwright.dev/docs/browsers)
