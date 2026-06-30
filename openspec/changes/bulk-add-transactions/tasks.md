## 1. 共用工具 / 預設日期修正

- [x] 1.1 在 `src/lib/` 新增 `getYesterdayDateString()` utility，回傳昨天的 `YYYY-MM-DD` 字串（本地時間）
- [x] 1.2 修改 `src/components/transactions/TransactionForm.tsx`：將所有 `new Date().toISOString().split('T')[0]` 替換為 `getYesterdayDateString()`（初始化與 reset 共 2 處）

## 2. 後端 Bulk API

- [x] 2.1 在 `backend/src/services/transaction.service.ts` 新增 `createTransactionsBulk(portfolioId, transactions[])` method，使用 `prisma.$transaction` 確保原子性
- [x] 2.2 在 `backend/src/routes/transactions.ts` 新增 `POST /bulk` route，驗證 payload（非空陣列、每筆必填欄位、數字範圍）並呼叫 service
- [x] 2.3 在 `src/services/transaction.api.ts` 新增 `createTransactionsBulk()` 前端 API function

## 3. 前端 BulkTransactionForm 元件

- [x] 3.1 建立 `src/components/transactions/BulkTransactionForm.tsx`，內部維護 `rows` state，每列含 symbol、type、quantity、price、date 欄位
- [x] 3.2 實作「新增一列」按鈕，新列日期預設為昨天
- [x] 3.3 實作每列的刪除按鈕（只有一列時禁用）
- [x] 3.4 實作送出前的前端驗證：標記錯誤列，阻止送出
- [x] 3.5 送出成功後清空表單並顯示成功提示

## 4. Portfolio 頁面整合

- [x] 4.1 在使用 `TransactionForm` 的 portfolio detail 頁面，找到新增交易的入口按鈕，旁邊加上「批次新增」選項（或 toggle）
- [x] 4.2 根據選擇渲染 `TransactionForm`（單筆）或 `BulkTransactionForm`（批次）

## 5. 測試

- [x] 5.1 在 `backend/src/__tests__/` 新增 `transactions-bulk.test.ts`，測試 bulk service method：成功、空陣列、部分失敗回滾
- [x] 5.2 確認現有 `transaction.property.test.ts` 仍通過（無回歸）
- [x] 5.3 手動驗證：開啟 Portfolio 頁面，批次新增 3 筆交易，確認全部出現在 TransactionTable；確認日期預設為昨天
