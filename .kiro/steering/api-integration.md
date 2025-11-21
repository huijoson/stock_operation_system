# API 整合規範

## 外部 API 呼叫規範

### SSL 憑證處理

在開發環境中，當呼叫外部 API（如 Yahoo Finance）時，可能會遇到 SSL 憑證驗證問題。

**規則：**
- 所有使用 axios 呼叫 HTTPS API 的地方，都應該加入 SSL 憑證驗證繞過設定（僅限開發環境）
- 使用 Node.js 的 `https.Agent` 並設定 `rejectUnauthorized: false`

**範例：**
```typescript
import https from 'https'
import axios from 'axios'

// 建立 HTTPS Agent（開發環境用）
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
})

// 在 axios 請求中使用
const response = await axios.get(url, {
  params: { ... },
  timeout: 10000,
  httpsAgent,  // 加入這個設定
})
```

### Yahoo Finance API 整合

**支援的市場：**
- 台股：從本地資料庫查詢
- 美股：透過 Yahoo Finance API 即時查詢

**API 端點：**
1. 股價查詢：`https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`
2. 股票搜尋：`https://query1.finance.yahoo.com/v1/finance/search`
3. 歷史股價：`https://query1.finance.yahoo.com/v8/finance/chart/{symbol}` (with period1/period2)

**搜尋邏輯：**
1. 優先搜尋本地資料庫（台股）
2. 若無結果，則搜尋美股 API
3. 美股結果的 ID 使用 `us-{symbol}` 格式以區分

## 股票代號格式

### 台股
- 格式：純數字（例如：2330、0050）
- 來源：本地資料庫

### 美股
- 格式：英文字母（例如：AAPL、GOOGL、TSMC）
- 來源：Yahoo Finance API
- ID 前綴：`us-` （例如：`us-AAPL`）

## 數值精度規範

### 股數（Quantity）
- 支援小數點後最多 6 位（0.000001）
- 用於支援美股零股交易
- HTML input 的 step 屬性設為 `0.000001`

### 價格（Price）
- 支援小數點後最多 2 位（0.01）
- HTML input 的 step 屬性設為 `0.01`

### 金額計算
- 使用 Decimal.js 進行所有金額計算
- 避免 JavaScript 原生浮點數運算誤差

## 錯誤處理

### API 呼叫失敗
- 優先使用快取資料作為備援
- 記錄錯誤日誌但不中斷使用者操作
- 向使用者顯示友善的錯誤訊息

### 搜尋無結果
- 台股搜尋無結果時，自動嘗試美股搜尋
- 美股搜尋失敗時，返回空陣列（不拋出錯誤）
- 提供「手動輸入」選項作為備援方案

## 快取策略

### 股價快取
- 快取有效期：1 小時
- 儲存位置：PostgreSQL `StockPrice` 表
- 快取鍵：`symbol` + `date`（日期標準化為當天 00:00:00）

### 搜尋結果
- 不快取搜尋結果（即時查詢）
- 本地資料庫查詢速度足夠快，無需快取

## 版本控制建議

### 功能變更記錄
當修改以下功能時，應該更新此文件：
1. 新增支援的市場或交易所
2. 修改 API 端點或參數
3. 調整數值精度規範
4. 變更快取策略
5. 修改錯誤處理邏輯

### Git Commit 訊息格式
```
feat(stock): 支援美股搜尋功能
fix(api): 修正 SSL 憑證驗證問題
chore(precision): 調整股數精度至 6 位小數
```

## 未來改進方向

### 短期
- [ ] 加入更多市場支援（港股、陸股）
- [ ] 實作搜尋結果快取機制
- [ ] 優化 API 呼叫效能

### 長期
- [ ] 支援即時股價推送（WebSocket）
- [ ] 整合更多資料來源（Bloomberg, Reuters）
- [ ] 實作智能搜尋（模糊匹配、拼音搜尋）
